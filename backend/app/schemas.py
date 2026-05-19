from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models import MeterStatus, CaseStatus, RiskLevel


class MeterBase(BaseModel):
    meter_serial: str
    account_number: str
    customer_name: str
    address: str
    feeder_id: str


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
    reading_kwh: float
    reading_date: datetime
    billed_kwh: float = 0.0


class MeterReadingOut(MeterReadingCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    meter_id: int
    created_at: datetime


class FeederRecordCreate(BaseModel):
    feeder_id: str
    record_date: datetime
    grid_supply_kwh: float
    total_billed_kwh: float


class FeederRecordOut(FeederRecordCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ntl_kwh: float
    ntl_percent: float
    created_at: datetime


class CaseCreate(BaseModel):
    meter_id: int
    risk_level: RiskLevel
    description: str = ""


class CaseUpdate(BaseModel):
    status: CaseStatus | None = None
    assigned_to: str | None = None
    resolution_notes: str | None = None


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
    inspector_name: str
    inspection_date: datetime
    findings: str
    bypass_confirmed: bool = False
    evidence_notes: str | None = None


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
