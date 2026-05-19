import logging
import random
import string
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Case, InspectionReport, CaseStatus, Meter, MeterStatus
from app.schemas import CaseCreate, CaseUpdate, CaseOut, InspectionReportCreate, InspectionReportOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cases", tags=["cases"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def _unique_case_number(db: AsyncSession) -> str:
    """Generate a collision-free case number, retrying up to 10 times."""
    prefix = _utcnow().strftime("%Y%m")
    for _ in range(10):
        suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
        candidate = f"CASE-{prefix}-{suffix}"
        existing = await db.execute(select(Case.id).where(Case.case_number == candidate))
        if not existing.scalar():
            return candidate
    raise RuntimeError("Unable to generate a unique case number after 10 attempts")


@router.get("", response_model=list[CaseOut])
async def list_cases(
    status: CaseStatus | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Case)
        .options(selectinload(Case.meter))
        .order_by(Case.opened_at.desc())
    )
    if status:
        stmt = stmt.where(Case.status == status)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
async def create_case(payload: CaseCreate, db: AsyncSession = Depends(get_db)):
    meter = await db.get(Meter, payload.meter_id)
    if not meter:
        raise HTTPException(status_code=404, detail="Meter not found")
    case_number = await _unique_case_number(db)
    case = Case(case_number=case_number, **payload.model_dump())
    db.add(case)
    meter.status = MeterStatus.under_investigation
    await db.commit()
    logger.info("Case %s opened for meter %s", case_number, meter.meter_serial)
    stmt = select(Case).options(selectinload(Case.meter)).where(Case.id == case.id)
    result = await db.execute(stmt)
    return result.scalar_one()


@router.get("/{case_id}", response_model=CaseOut)
async def get_case(case_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Case).options(selectinload(Case.meter)).where(Case.id == case_id)
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.patch("/{case_id}", response_model=CaseOut)
async def update_case(case_id: int, payload: CaseUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(Case).options(selectinload(Case.meter)).where(Case.id == case_id)
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    update_data = payload.model_dump(exclude_none=True)
    for key, val in update_data.items():
        setattr(case, key, val)

    if payload.status == CaseStatus.resolved and not case.resolved_at:
        case.resolved_at = _utcnow()
        # Explicitly query reports — do not rely on lazy-loaded relationship
        reports_stmt = select(InspectionReport).where(InspectionReport.case_id == case.id)
        reports_result = await db.execute(reports_stmt)
        reports = reports_result.scalars().all()
        bypass_confirmed = any(r.bypass_confirmed for r in reports)
        meter = await db.get(Meter, case.meter_id)
        if meter:
            meter.status = MeterStatus.confirmed_bypass if bypass_confirmed else MeterStatus.cleared
            logger.info(
                "Case %s resolved — meter %s marked %s",
                case.case_number, meter.meter_serial, meter.status,
            )

    await db.commit()
    result2 = await db.execute(select(Case).options(selectinload(Case.meter)).where(Case.id == case_id))
    return result2.scalar_one()


@router.post("/{case_id}/reports", response_model=InspectionReportOut, status_code=status.HTTP_201_CREATED)
async def add_inspection_report(case_id: int, payload: InspectionReportCreate, db: AsyncSession = Depends(get_db)):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    report = InspectionReport(case_id=case_id, **payload.model_dump())
    db.add(report)
    if case.status == CaseStatus.open:
        case.status = CaseStatus.in_progress
    await db.commit()
    await db.refresh(report)
    logger.info(
        "Inspection report added to case %s by %s (bypass_confirmed=%s)",
        case_id, payload.inspector_name, payload.bypass_confirmed,
    )
    return report


@router.get("/{case_id}/reports", response_model=list[InspectionReportOut])
async def list_inspection_reports(case_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(InspectionReport).where(InspectionReport.case_id == case_id).order_by(InspectionReport.inspection_date)
    result = await db.execute(stmt)
    return result.scalars().all()
