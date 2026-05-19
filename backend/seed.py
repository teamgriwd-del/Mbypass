"""Seed the database with realistic demo data."""
import asyncio
import random
from datetime import datetime, timedelta
from app.database import init_db, AsyncSessionLocal
from app.models import Meter, MeterReading, FeederRecord, MeterStatus, RiskLevel

FEEDERS = ["F-101", "F-102", "F-103", "F-104"]

CUSTOMERS = [
    ("John Mwangi", "12 Nairobi Rd, Westlands"),
    ("Grace Otieno", "5 Mombasa Ave, Kilimani"),
    ("Peter Kamau", "8 Thika Rd, Kasarani"),
    ("Mary Njoroge", "3 Karen Close, Karen"),
    ("James Ochieng", "17 Ngong Rd, Dagoretti"),
    ("Alice Wanjiku", "21 Lang'ata Rd, Kibra"),
    ("David Mutua", "9 Jogoo Rd, Embakasi"),
    ("Sarah Chebet", "44 Kiambu Rd, Ruiru"),
    ("Francis Kimani", "6 Outer Ring Rd, Roysambu"),
    ("Esther Auma", "33 Argwings Kodhek, Hurlingham"),
]


async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        # Skip if already seeded
        from sqlalchemy import select, func
        count = (await db.execute(select(func.count(Meter.id)))).scalar()
        if count and count > 0:
            print(f"Database already has {count} meters — skipping seed.")
            return

        meters = []
        for i, (name, address) in enumerate(CUSTOMERS * 2):
            serial = f"MTR-{2024000 + i:07d}"
            account = f"ACC-{100000 + i}"
            feeder = FEEDERS[i % len(FEEDERS)]
            meter = Meter(
                meter_serial=serial,
                account_number=account,
                customer_name=name,
                address=address,
                feeder_id=feeder,
            )
            db.add(meter)
            meters.append(meter)

        await db.commit()
        for m in meters:
            await db.refresh(m)

        # Generate 6 months of readings
        base_date = datetime.utcnow() - timedelta(days=180)
        for meter in meters:
            # Some meters simulate bypass behavior
            is_suspect = meter.id % 5 == 0
            monthly_kwh = random.uniform(80, 200)
            for month in range(6):
                rd = base_date + timedelta(days=30 * month)
                if is_suspect and month >= 2:
                    kwh = random.uniform(0, 3)   # Near-zero after bypass installed
                    billed = random.uniform(0, 2)
                else:
                    kwh = monthly_kwh + random.uniform(-10, 10)
                    billed = kwh * random.uniform(0.95, 1.05)
                reading = MeterReading(
                    meter_id=meter.id,
                    reading_kwh=kwh,
                    reading_date=rd,
                    billed_kwh=billed,
                )
                db.add(reading)
                meter.last_reading_kwh = kwh
                meter.last_reading_date = rd

        # Feeder NTL records
        for feeder_id in FEEDERS:
            for month in range(6):
                rd = base_date + timedelta(days=30 * month)
                grid_supply = random.uniform(5000, 8000)
                ntl_factor = 0.25 if feeder_id == "F-101" else random.uniform(0.05, 0.12)
                total_billed = grid_supply * (1 - ntl_factor)
                ntl_kwh = grid_supply - total_billed
                ntl_pct = ntl_factor * 100
                record = FeederRecord(
                    feeder_id=feeder_id,
                    record_date=rd,
                    grid_supply_kwh=grid_supply,
                    total_billed_kwh=total_billed,
                    ntl_kwh=ntl_kwh,
                    ntl_percent=ntl_pct,
                )
                db.add(record)

        await db.commit()
        print(f"Seeded {len(meters)} meters across {len(FEEDERS)} feeders.")


if __name__ == "__main__":
    asyncio.run(seed())
