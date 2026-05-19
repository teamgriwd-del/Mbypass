import type { MeterStatus, CaseStatus } from "../api/types";

type Status = MeterStatus | CaseStatus;

const styles: Record<string, string> = {
  normal: "bg-gray-100 text-gray-700",
  flagged: "bg-yellow-100 text-yellow-800",
  under_investigation: "bg-orange-100 text-orange-800",
  confirmed_bypass: "bg-red-100 text-red-800",
  cleared: "bg-green-100 text-green-700",
  open: "bg-blue-100 text-blue-800",
  assigned: "bg-purple-100 text-purple-800",
  in_progress: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

const labels: Record<string, string> = {
  normal: "Normal",
  flagged: "Flagged",
  under_investigation: "Under Investigation",
  confirmed_bypass: "Confirmed Bypass",
  cleared: "Cleared",
  open: "Open",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-700"}`}>
      {labels[status] ?? status}
    </span>
  );
}
