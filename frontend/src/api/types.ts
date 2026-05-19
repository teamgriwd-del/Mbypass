export type MeterStatus = "normal" | "flagged" | "under_investigation" | "confirmed_bypass" | "cleared";
export type CaseStatus = "open" | "assigned" | "in_progress" | "resolved" | "closed";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface Meter {
  id: number;
  meter_serial: string;
  account_number: string;
  customer_name: string;
  address: string;
  feeder_id: string;
  status: MeterStatus;
  risk_score: number;
  risk_level: RiskLevel;
  last_reading_kwh: number;
  last_reading_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: number;
  case_number: string;
  meter_id: number;
  status: CaseStatus;
  risk_level: RiskLevel;
  assigned_to: string | null;
  description: string;
  resolution_notes: string | null;
  opened_at: string;
  resolved_at: string | null;
  updated_at: string;
  meter: Meter;
}

export interface DashboardStats {
  total_meters: number;
  flagged_meters: number;
  confirmed_bypasses: number;
  open_cases: number;
  high_risk_feeders: number;
  avg_ntl_percent: number;
}

export interface FeederNTL {
  feeder_id: string;
  avg_ntl_percent: number;
  max_ntl_percent: number;
  record_count: number;
}

export interface AnomalyResult {
  meter_id: number;
  meter_serial: string;
  account_number: string;
  customer_name: string;
  feeder_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  anomaly_flags: string[];
}

export interface InspectionReport {
  id: number;
  case_id: number;
  inspector_name: string;
  inspection_date: string;
  findings: string;
  bypass_confirmed: boolean;
  evidence_notes: string | null;
  created_at: string;
}
