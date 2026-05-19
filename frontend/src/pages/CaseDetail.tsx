import { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import type { Case, CaseStatus, InspectionReport } from "../api/types";
import RiskBadge from "../components/RiskBadge";
import StatusBadge from "../components/StatusBadge";

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [assignTo, setAssignTo] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actionError, setActionError] = useState("");

  // Inspection form state
  const [inspector, setInspector] = useState("");
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [findings, setFindings] = useState("");
  const [bypassed, setBypassed] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    api.get<Case>(`/cases/${id}`)
      .then((r) => setCaseData(r.data))
      .catch((err) => {
        if (err?.response?.status === 404) navigate("/cases");
      });
    api.get<InspectionReport[]>(`/cases/${id}/reports`)
      .then((r) => setReports(r.data));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  // Redirect if route has no id (shouldn't happen but TypeScript requires the guard)
  if (!id) {
    navigate("/cases");
    return null;
  }

  const runAction = async (fn: () => Promise<unknown>) => {
    setActionError("");
    try {
      await fn();
      load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Action failed";
      setActionError(msg);
    }
  };

  const updateStatus = (status: CaseStatus) =>
    runAction(() => api.patch(`/cases/${id}`, { status }));

  const assign = () => {
    if (!assignTo.trim()) return;
    runAction(() => api.patch(`/cases/${id}`, { assigned_to: assignTo.trim(), status: "assigned" }));
  };

  const saveNotes = () =>
    runAction(() => api.patch(`/cases/${id}`, { resolution_notes: resolutionNotes }));

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/cases/${id}/reports`, {
        inspector_name: inspector,
        inspection_date: new Date(inspectionDate).toISOString(),
        findings,
        bypass_confirmed: bypassed,
        evidence_notes: evidence || null,
      });
      setInspector("");
      setFindings("");
      setBypassed(false);
      setEvidence("");
      setInspectionDate(new Date().toISOString().slice(0, 10));
      load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to submit report";
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!caseData) return <div className="p-8 text-gray-400">Loading case...</div>;

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/cases" className="hover:text-brand-600">Cases</Link>
        <span>/</span>
        <span className="text-gray-700 font-mono">{caseData.case_number}</span>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {actionError}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{caseData.case_number}</h2>
            <p className="text-gray-500 mt-1">{caseData.meter.customer_name} — {caseData.meter.address}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Meter: {caseData.meter.meter_serial} | Feeder: {caseData.meter.feeder_id}
            </p>
          </div>
          <div className="flex gap-2">
            <RiskBadge level={caseData.risk_level} />
            <StatusBadge status={caseData.status} />
          </div>
        </div>

        {caseData.description && (
          <p className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{caseData.description}</p>
        )}

        <div className="mt-4 flex gap-2 flex-wrap">
          {caseData.status !== "resolved" && caseData.status !== "closed" && (
            <>
              <button onClick={() => updateStatus("in_progress")}
                className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-100">
                Mark In Progress
              </button>
              <button onClick={() => updateStatus("resolved")}
                className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100">
                Mark Resolved
              </button>
              <button onClick={() => updateStatus("closed")}
                className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                Close Case
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm">Assign Investigator</h3>
          <input value={assignTo} onChange={(e) => setAssignTo(e.target.value)}
            placeholder="Investigator name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
          <button onClick={assign}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm py-2 rounded-lg">
            Assign
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h3 className="font-semibold text-gray-700 text-sm">Resolution Notes</h3>
          <textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)}
            rows={3} placeholder="Add resolution notes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
          <button onClick={saveNotes}
            className="w-full bg-gray-700 hover:bg-gray-800 text-white text-sm py-2 rounded-lg">
            Save Notes
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-gray-700">Field Inspection Reports</h3>
        {reports.length === 0 && (
          <p className="text-sm text-gray-400">No inspection reports yet.</p>
        )}
        {reports.map((r) => (
          <div key={r.id} className={`rounded-lg p-4 border ${r.bypass_confirmed ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{r.inspector_name}</span>
              <div className="flex gap-2 items-center">
                {r.bypass_confirmed && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold">Bypass Confirmed</span>
                )}
                <span className="text-xs text-gray-400">{new Date(r.inspection_date).toLocaleDateString()}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">{r.findings}</p>
            {r.evidence_notes && (
              <p className="text-xs text-gray-500 mt-1 italic">Evidence: {r.evidence_notes}</p>
            )}
          </div>
        ))}

        <form onSubmit={submitReport} className="border-t border-gray-100 pt-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Add Inspection Report</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Inspector Name</label>
              <input required value={inspector} onChange={(e) => setInspector(e.target.value)}
                placeholder="Full name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Inspection Date</label>
              <input required type="date" value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            </div>
          </div>
          <textarea required value={findings} onChange={(e) => setFindings(e.target.value)}
            rows={3} placeholder="Findings from field inspection..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
          <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)}
            rows={2} placeholder="Evidence notes (optional)..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={bypassed} onChange={(e) => setBypassed(e.target.checked)}
              className="rounded border-gray-300" />
            Bypass confirmed by field inspection
          </label>
          <button type="submit" disabled={submitting}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
