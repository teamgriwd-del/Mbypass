import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import FeederRecord
from app.schemas import FeederRecordCreate, FeederRecordOut, AnomalyResult
from app.services.anomaly import compute_feeder_ntl, score_meters_in_feeder
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/feeders", tags=["feeders"])


@router.post("/records", response_model=FeederRecordOut, status_code=status.HTTP_201_CREATED)
async def submit_feeder_record(payload: FeederRecordCreate, db: AsyncSession = Depends(get_db)):
    ntl_kwh, ntl_percent, total_billed = await compute_feeder_ntl(
        payload.feeder_id, payload.record_date, payload.grid_supply_kwh, db
    )
    record = FeederRecord(
        feeder_id=payload.feeder_id,
        record_date=payload.record_date,
        grid_supply_kwh=payload.grid_supply_kwh,
        total_billed_kwh=total_billed,
        ntl_kwh=ntl_kwh,
        ntl_percent=ntl_percent,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    logger.info("Feeder %s NTL=%.1f%%", payload.feeder_id, ntl_percent)

    # Auto-trigger anomaly scoring when NTL exceeds threshold
    if ntl_percent >= settings.ntl_alert_threshold:
        logger.warning(
            "Feeder %s NTL %.1f%% exceeds threshold %.1f%% — running anomaly scan",
            payload.feeder_id, ntl_percent, settings.ntl_alert_threshold,
        )
        await score_meters_in_feeder(payload.feeder_id, db)

    return record


@router.get("/records", response_model=list[FeederRecordOut])
async def list_feeder_records(feeder_id: str | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(FeederRecord).order_by(FeederRecord.record_date.desc())
    if feeder_id:
        stmt = stmt.where(FeederRecord.feeder_id == feeder_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/{feeder_id}/analyze", response_model=list[AnomalyResult])
async def analyze_feeder(feeder_id: str, db: AsyncSession = Depends(get_db)):
    """Run anomaly detection on all meters in a feeder on demand."""
    results = await score_meters_in_feeder(feeder_id, db)
    if not results:
        raise HTTPException(status_code=404, detail="No meters found for this feeder")
    return results  # already sorted by risk_score desc in score_meters_in_feeder
