from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Meter, Case, FeederRecord, MeterStatus, CaseStatus, RiskLevel
from app.schemas import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    total_meters = (await db.execute(select(func.count(Meter.id)))).scalar() or 0
    flagged = (await db.execute(
        select(func.count(Meter.id)).where(Meter.status == MeterStatus.flagged)
    )).scalar() or 0
    confirmed = (await db.execute(
        select(func.count(Meter.id)).where(Meter.status == MeterStatus.confirmed_bypass)
    )).scalar() or 0
    open_cases = (await db.execute(
        select(func.count(Case.id)).where(Case.status != CaseStatus.resolved, Case.status != CaseStatus.closed)
    )).scalar() or 0

    high_ntl_feeders = (await db.execute(
        select(func.count(func.distinct(FeederRecord.feeder_id)))
        .where(FeederRecord.ntl_percent >= 15.0)
    )).scalar() or 0

    avg_ntl = (await db.execute(select(func.avg(FeederRecord.ntl_percent)))).scalar() or 0.0

    return DashboardStats(
        total_meters=total_meters,
        flagged_meters=flagged,
        confirmed_bypasses=confirmed,
        open_cases=open_cases,
        high_risk_feeders=high_ntl_feeders,
        avg_ntl_percent=round(avg_ntl, 2),
    )


@router.get("/feeders/ntl-summary")
async def ntl_summary(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(
            FeederRecord.feeder_id,
            func.avg(FeederRecord.ntl_percent).label("avg_ntl"),
            func.max(FeederRecord.ntl_percent).label("max_ntl"),
            func.count(FeederRecord.id).label("records"),
        )
        .group_by(FeederRecord.feeder_id)
        .order_by(func.avg(FeederRecord.ntl_percent).desc())
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {
            "feeder_id": r.feeder_id,
            "avg_ntl_percent": round(r.avg_ntl, 2),
            "max_ntl_percent": round(r.max_ntl, 2),
            "record_count": r.records,
        }
        for r in rows
    ]
