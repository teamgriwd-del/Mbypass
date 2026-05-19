import re
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.models import MeterStatus, CaseStatus, RiskLevel

_FEEDER_RE = re.compile(r'^[A-Z0-9\-]+$')


class MeterBase(BaseModel):
    meter_serial: str = Field(min_length=1, max_length=64)
    account_number: str = Field(min_length=1, max_length=64)
    customer_name: str = Field(min_length=1, max_length=128)
    address: str = Field(min_length=1, max_length=256)
    feeder_id: str = Field(min_length=1, max_length=64)

    @field_validator("meter_serial", "account_number", "customer_name", "address")
    @classmethod
    def strip_and_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be blank")
        return v

    @field_validator("feeder_id")
    @classmethod
    def validate_feeder_id(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("feeder_id cannot be blank")
        if not _FEEDER_RE.match(v):
            raise ValueError("feeder_id must contain only letters, digits, and hyphens")
        return v


class MeterCreate(MeterBase):
    pass


class MeterOut(MeterBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: MeterStatus
    risk_score: float
    risk_level: RiskLevel
    last_reading_kwh: float
    last_reading_date: datetime | None
    created_at: datetime
    updated_at: datetime


class MeterReadingCreate(BaseModel):
    reading_kwh: float = Field(ge=0.0)
    reading_date: datetime
    billed_kwh: float = Field(default=0.0, ge=0.0)


class MeterReadingOut(MeterReadingCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    meter_id: int
    created_at: datetime


class FeederRecordCreate(BaseModel):
    feeder_id: str = Field(min_length=1, max_length=64)
    record_date: datetime
    grid_supply_kwh: float = Field(gt=0.0)

    @field_validator("feeder_id")
    @classmethod
    def validate_feeder_id(cls, v: str) -> str:
        v = v.strip().upper()
        if not _FEEDER_RE.match(v):
            raise ValueError("feeder_id must contain only letters, digits, and hyphens")
        return v


class FeederRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    feeder_id: str
    record_date: datetime
    grid_supply_kwh: float
    total_billed_kwh: float
    ntl_kwh: float
    ntl_percent: float
    created_at: datetime


class CaseCreate(BaseModel):
    meter_id: int
    risk_level: RiskLevel
    description: str = Field(default="", max_length=2000)


class CaseUpdate(BaseModel):
    status: CaseStatus | None = None
    assigned_to: str | None = Field(default=None, max_length=128)
    resolution_notes: str | None = Field(default=None, max_length=4000)


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    case_number: str
    meter_id: int
    status: CaseStatus
    risk_level: RiskLevel
    assigned_to: str | None
    description: str
    resolution_notes: str | None
    opened_at: datetime
    resolved_at: datetime | None
    updated_at: datetime
    meter: MeterOut


class InspectionReportCreate(BaseModel):
    inspector_name: str = Field(min_length=1, max_length=128)
    inspection_date: datetime
    findings: str = Field(min_length=1, max_length=4000)
    bypass_confirmed: bool = False
    evidence_notes: str | None = Field(default=None, max_length=4000)

    @field_validator("inspector_name", "findings")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Field cannot be blank")
        return v.strip()


class InspectionReportOut(InspectionReportCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    case_id: int
    created_at: datetime


class DashboardStats(BaseModel):
    total_meters: int
    flagged_meters: int
    confirmed_bypasses: int
    open_cases: int
    high_risk_feeders: int
    avg_ntl_percent: float


class AnomalyResult(BaseModel):
    meter_id: int
    meter_serial: str
    account_number: str
    customer_name: str
    feeder_id: str
    risk_score: float
    risk_level: RiskLevel
    anomaly_flags: list[str]
