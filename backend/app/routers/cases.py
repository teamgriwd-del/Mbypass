from datetime import datetime
import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Case, InspectionReport, CaseStatus, Meter, MeterStatus
from app.schemas import CaseCreate, CaseUpdate, CaseOut, InspectionReportCreate, InspectionReportOut

router = APIRouter(prefix="/api/cases", tags=["cases"])


def _generate_case_number() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"CASE-{datetime.utcnow().strftime('%Y%m')}-{suffix}"


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
    case = Case(
        case_number=_generate_case_number(),
        **payload.model_dump(),
    )
    db.add(case)
    meter.status = MeterStatus.under_investigation
    await db.commit()
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
        case.resolved_at = datetime.utcnow()
        meter = await db.get(Meter, case.meter_id)
        if meter:
            meter.status = MeterStatus.confirmed_bypass if any(
                r.bypass_confirmed for r in case.inspection_reports
            ) else MeterStatus.cleared

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
    return report


@router.get("/{case_id}/reports", response_model=list[InspectionReportOut])
async def list_inspection_reports(case_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(InspectionReport).where(InspectionReport.case_id == case_id)
    result = await db.execute(stmt)
    return result.scalars().all()
