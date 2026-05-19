from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.database import Base


class MeterStatus(str, enum.Enum):
    normal = "normal"
    flagged = "flagged"
    under_investigation = "under_investigation"
    confirmed_bypass = "confirmed_bypass"
    cleared = "cleared"


class CaseStatus(str, enum.Enum):
    open = "open"
    assigned = "assigned"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Meter(Base):
    __tablename__ = "meters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meter_serial: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    account_number: Mapped[str] = mapped_column(String(64), index=True)
    customer_name: Mapped[str] = mapped_column(String(128))
    address: Mapped[str] = mapped_column(String(256))
    feeder_id: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[MeterStatus] = mapped_column(SAEnum(MeterStatus), default=MeterStatus.normal)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_level: Mapped[RiskLevel] = mapped_column(SAEnum(RiskLevel), default=RiskLevel.low)
    last_reading_kwh: Mapped[float] = mapped_column(Float, default=0.0)
    last_reading_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    readings: Mapped[list["MeterReading"]] = relationship(back_populates="meter", cascade="all, delete-orphan")
    cases: Mapped[list["Case"]] = relationship(back_populates="meter", cascade="all, delete-orphan")


class MeterReading(Base):
    __tablename__ = "meter_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meter_id: Mapped[int] = mapped_column(ForeignKey("meters.id"))
    reading_kwh: Mapped[float] = mapped_column(Float)
    reading_date: Mapped[datetime] = mapped_column(DateTime)
    billed_kwh: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    meter: Mapped["Meter"] = relationship(back_populates="readings")


class FeederRecord(Base):
    __tablename__ = "feeder_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    feeder_id: Mapped[str] = mapped_column(String(64), index=True)
    record_date: Mapped[datetime] = mapped_column(DateTime)
    grid_supply_kwh: Mapped[float] = mapped_column(Float)
    total_billed_kwh: Mapped[float] = mapped_column(Float)
    ntl_kwh: Mapped[float] = mapped_column(Float)
    ntl_percent: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    meter_id: Mapped[int] = mapped_column(ForeignKey("meters.id"))
    status: Mapped[CaseStatus] = mapped_column(SAEnum(CaseStatus), default=CaseStatus.open)
    risk_level: Mapped[RiskLevel] = mapped_column(SAEnum(RiskLevel))
    assigned_to: Mapped[str | None] = mapped_column(String(128), nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    meter: Mapped["Meter"] = relationship(back_populates="cases")
    inspection_reports: Mapped[list["InspectionReport"]] = relationship(back_populates="case", cascade="all, delete-orphan")


class InspectionReport(Base):
    __tablename__ = "inspection_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id"))
    inspector_name: Mapped[str] = mapped_column(String(128))
    inspection_date: Mapped[datetime] = mapped_column(DateTime)
    findings: Mapped[str] = mapped_column(Text)
    bypass_confirmed: Mapped[bool] = mapped_column(default=False)
    evidence_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    case: Mapped["Case"] = relationship(back_populates="inspection_reports")
