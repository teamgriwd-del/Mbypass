import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import type { Case, CaseStatus, RiskLevel } from "../api/types";
import RiskBadge from "../components/RiskBadge";
import StatusBadge from "../components/StatusBadge";

function NewCaseForm({ onCreated }: { onCreated: () => void }) {
  const [params] = useSearchParams();
  const [meterId, setMeterId] = useState(params.get("meter_id") ?? "");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("medium");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/cases", { meter_id: Number(meterId), risk_level: riskLevel, description });
      onCreated();
      navigate("/cases");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to create case";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4 max-w-lg">
      <h3 className="font-semibold text-gray-700">Open New Case</h3>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2">{error}</div>
      )}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Meter ID</label>
        <input required value={meterId} onChange={(e) => setMeterId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Risk Level</label>
        <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
          {loading ? "Opening..." : "Open Case"}
        </button>
        <Link to="/cases" className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}

export default function Cases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "">("");
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [params] = useSearchParams();

  const load = useCallback(() => {
    const p: Record<string, string> = {};
    if (statusFilter) p.status = statusFilter;
    api
      .get<Case[]>("/cases", { params: p })
      .then((r) => { setCases(r.data); setError(""); })
      .catch(() => setError("Failed to load cases"));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (params.get("meter_id")) setShowNew(true);
  }, [params]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Cases</h2>
          <p className="text-sm text-gray-500">{cases.length} cases</p>
        </div>
        <button onClick={() => setShowNew(!showNew)}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-lg">
          + New Case
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {showNew && <NewCaseForm onCreated={load} />}

      <div className="flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CaseStatus | "")}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Case #", "Customer", "Feeder", "Risk", "Status", "Assigned To", "Opened", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cases.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-600">{c.case_number}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{c.meter.customer_name}</div>
                  <div className="text-xs text-gray-400">{c.meter.meter_serial}</div>
                </td>
                <td className="px-4 py-3 text-gray-500">{c.meter.feeder_id}</td>
                <td className="px-4 py-3"><RiskBadge level={c.risk_level} /></td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-gray-500">{c.assigned_to ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(c.opened_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/cases/${c.id}`} className="text-xs text-brand-600 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">No cases found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
