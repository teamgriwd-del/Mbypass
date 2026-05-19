from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Meter, MeterReading, MeterStatus
from app.schemas import MeterCreate, MeterOut, MeterReadingCreate, MeterReadingOut

router = APIRouter(prefix="/api/meters", tags=["meters"])


@router.get("", response_model=list[MeterOut])
async def list_meters(
    feeder_id: str | None = None,
    status: MeterStatus | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Meter)
    if feeder_id:
        stmt = stmt.where(Meter.feeder_id == feeder_id)
    if status:
        stmt = stmt.where(Meter.status == status)
    stmt = stmt.order_by(Meter.risk_score.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=MeterOut, status_code=status.HTTP_201_CREATED)
async def create_meter(payload: MeterCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Meter).where(Meter.meter_serial == payload.meter_serial))
    if existing.scalar():
        raise HTTPException(status_code=400, detail="Meter serial already registered")
    meter = Meter(**payload.model_dump())
    db.add(meter)
    await db.commit()
    await db.refresh(meter)
    return meter


@router.get("/{meter_id}", response_model=MeterOut)
async def get_meter(meter_id: int, db: AsyncSession = Depends(get_db)):
    meter = await db.get(Meter, meter_id)
    if not meter:
        raise HTTPException(status_code=404, detail="Meter not found")
    return meter


@router.post("/{meter_id}/flag", response_model=MeterOut)
async def flag_meter(meter_id: int, db: AsyncSession = Depends(get_db)):
    meter = await db.get(Meter, meter_id)
    if not meter:
        raise HTTPException(status_code=404, detail="Meter not found")
    meter.status = MeterStatus.flagged
    await db.commit()
    await db.refresh(meter)
    return meter


@router.post("/{meter_id}/readings", response_model=MeterReadingOut, status_code=status.HTTP_201_CREATED)
async def add_reading(meter_id: int, payload: MeterReadingCreate, db: AsyncSession = Depends(get_db)):
    meter = await db.get(Meter, meter_id)
    if not meter:
        raise HTTPException(status_code=404, detail="Meter not found")
    reading = MeterReading(meter_id=meter_id, **payload.model_dump())
    db.add(reading)
    meter.last_reading_kwh = payload.reading_kwh
    meter.last_reading_date = payload.reading_date
    await db.commit()
    await db.refresh(reading)
    return reading


@router.get("/{meter_id}/readings", response_model=list[MeterReadingOut])
async def get_readings(meter_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(MeterReading).where(MeterReading.meter_id == meter_id).order_by(MeterReading.reading_date)
    result = await db.execute(stmt)
    return result.scalars().all()
