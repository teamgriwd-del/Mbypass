"""
Non-Technical Loss (NTL) anomaly detection.

Compares grid supply to billed consumption at feeder level to identify
feeders with high losses, then scores individual meters within those
feeders using consumption pattern analysis.
"""
import logging
import numpy as np
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Meter, MeterReading, FeederRecord, RiskLevel, MeterStatus
from app.config import settings

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _risk_level_from_score(score: float) -> RiskLevel:
    if score >= 75:
        return RiskLevel.critical
    if score >= 50:
        return RiskLevel.high
    if score >= 25:
        return RiskLevel.medium
    return RiskLevel.low


def _compute_meter_risk(readings: list[float], billed: list[float]) -> tuple[float, list[str]]:
    """
    Return (risk_score 0-100, anomaly_flags).

    Signals checked:
    - Sustained near-zero consumption across multiple periods
    - Consumption dropped sharply in a single period
    - Large divergence between billed and actual kWh
    - Spike after sustained low (masking a reconnection)
    """
    flags: list[str] = []
    score = 0.0

    if len(readings) < 2:
        return score, flags

    arr = np.array(readings, dtype=float)
    bill = np.array(billed, dtype=float)

    near_zero_threshold = settings.anomaly_near_zero_kwh
    near_zero = int(np.sum(arr < near_zero_threshold))
    if near_zero >= 3:
        score += 35
        flags.append(f"Sustained near-zero consumption ({near_zero} periods below {near_zero_threshold} kWh)")

    drop_pct = settings.anomaly_drop_pct
    diffs = np.diff(arr)
    for i, d in enumerate(diffs):
        if arr[i] > 0 and d < 0 and abs(d) / arr[i] > drop_pct:
            score += 20
            flags.append(f"Consumption drop >{int(drop_pct * 100)}% at period {i + 1}")
            break

    total_bill = float(np.sum(bill))
    if total_bill >= settings.anomaly_min_bill_kwh:
        divergence = abs(float(np.sum(arr)) - total_bill) / total_bill
        if divergence > settings.anomaly_billing_divergence:
            score += 25
            flags.append(f"Billed/actual divergence {divergence:.0%}")

    if len(arr) >= 4:
        mid = len(arr) // 2
        first_half_avg = float(np.mean(arr[:mid]))
        last_half_avg = float(np.mean(arr[mid:]))
        if first_half_avg < near_zero_threshold and last_half_avg > 10.0:
            score += 20
            flags.append("Spike after sustained low — possible reconnection masking bypass")

    return min(score, 100.0), flags


async def score_meters_in_feeder(feeder_id: str, db: AsyncSession) -> list[dict]:
    """Score all meters in a feeder and persist updated risk scores."""
    stmt = select(Meter).where(Meter.feeder_id == feeder_id)
    result = await db.execute(stmt)
    meters = result.scalars().all()

    scored = []
    cutoff = _utcnow() - timedelta(days=180)

    for meter in meters:
        readings_stmt = (
            select(MeterReading)
            .where(MeterReading.meter_id == meter.id, MeterReading.reading_date >= cutoff)
            .order_by(MeterReading.reading_date)
        )
        r = await db.execute(readings_stmt)
        reading_rows = r.scalars().all()

        kwh_vals = [row.reading_kwh for row in reading_rows]
        billed_vals = [row.billed_kwh for row in reading_rows]

        risk_score, flags = _compute_meter_risk(kwh_vals, billed_vals)
        risk_level = _risk_level_from_score(risk_score)

        meter.risk_score = risk_score
        meter.risk_level = risk_level
        if risk_score >= 50 and meter.status == MeterStatus.normal:
            meter.status = MeterStatus.flagged
            logger.info("Meter %s auto-flagged (score=%.0f)", meter.meter_serial, risk_score)

        scored.append({
            "meter_id": meter.id,
            "meter_serial": meter.meter_serial,
            "account_number": meter.account_number,
            "customer_name": meter.customer_name,
            "feeder_id": meter.feeder_id,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "anomaly_flags": flags,
        })

    await db.commit()
    scored.sort(key=lambda x: x["risk_score"], reverse=True)
    logger.info("Feeder %s scored %d meters", feeder_id, len(scored))
    return scored


async def compute_feeder_ntl(
    feeder_id: str,
    record_date: datetime,
    grid_supply_kwh: float,
    db: AsyncSession,
) -> tuple[float, float, float]:
    """
    Calculate NTL for a feeder on a given date.
    Returns (ntl_kwh, ntl_percent, total_billed_kwh).
    """
    stmt = (
        select(func.sum(MeterReading.billed_kwh))
        .join(Meter, Meter.id == MeterReading.meter_id)
        .where(
            Meter.feeder_id == feeder_id,
            func.date(MeterReading.reading_date) == record_date.date(),
        )
    )
    result = await db.execute(stmt)
    total_billed = float(result.scalar() or 0.0)

    ntl_kwh = max(grid_supply_kwh - total_billed, 0.0)
    ntl_percent = (ntl_kwh / grid_supply_kwh * 100) if grid_supply_kwh > 0 else 0.0
    return ntl_kwh, ntl_percent, total_billed
