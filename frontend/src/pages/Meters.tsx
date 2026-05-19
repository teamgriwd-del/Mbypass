import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import type { Meter, MeterStatus } from "../api/types";
import RiskBadge from "../components/RiskBadge";
import StatusBadge from "../components/StatusBadge";

const PAGE_SIZE = 20;

export default function Meters() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [statusFilter, setStatusFilter] = useState<MeterStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [flagging, setFlagging] = useState<number | null>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = useCallback(() => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    api
      .get<Meter[]>("/meters", { params })
      .then((r) => { setMeters(r.data); setError(""); })
      .catch(() => setError("Failed to load meters"));
  }, [statusFilter]);

  useEffect(() => {
    setPage(0);
    load();
  }, [load]);

  const flagMeter = async (id: number) => {
    setFlagging(id);
    try {
      await api.post(`/meters/${id}/flag`);
      load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to flag meter";
      setError(msg);
    } finally {
      setFlagging(null);
    }
  };

  const openCase = (meterId: number) => navigate(`/cases?meter_id=${meterId}&show=new`);

  const filtered = meters.filter(
    (m) =>
      !search ||
      m.meter_serial.toLowerCase().includes(search.toLowerCase()) ||
      m.account_number.toLowerCase().includes(search.toLowerCase()) ||
      m.customer_name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageSlice = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Meters</h2>
          <p className="text-sm text-gray-500">{filtered.length} meters</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search serial, account, name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MeterStatus | "")}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <option value="">All statuses</option>
          <option value="normal">Normal</option>
          <option value="flagged">Flagged</option>
          <option value="under_investigation">Under Investigation</option>
          <option value="confirmed_bypass">Confirmed Bypass</option>
          <option value="cleared">Cleared</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Serial", "Account", "Customer", "Feeder", "Risk", "Status", "Last kWh", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pageSlice.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{m.meter_serial}</td>
                <td className="px-4 py-3 text-gray-600">{m.account_number}</td>
                <td className="px-4 py-3 font-medium">{m.customer_name}</td>
                <td className="px-4 py-3 text-gray-500">{m.feeder_id}</td>
                <td className="px-4 py-3">
                  <RiskBadge level={m.risk_level} />
                  <span className="ml-1 text-xs text-gray-400">{m.risk_score.toFixed(0)}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={m.status} />
                </td>
                <td className="px-4 py-3 text-gray-600">{m.last_reading_kwh.toFixed(1)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {m.status === "normal" && (
                      <button
                        onClick={() => flagMeter(m.id)}
                        disabled={flagging === m.id}
                        className="text-xs text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 px-2 py-1 rounded disabled:opacity-50"
                      >
                        {flagging === m.id ? "Flagging..." : "Flag"}
                      </button>
                    )}
                    {(m.status === "flagged" || m.status === "under_investigation") && (
                      <button
                        onClick={() => openCase(m.id)}
                        className="text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded"
                      >
                        Open Case
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {pageSlice.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No meters found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-white disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
