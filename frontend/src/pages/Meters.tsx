import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import type { Meter, MeterStatus } from "../api/types";
import RiskBadge from "../components/RiskBadge";
import StatusBadge from "../components/StatusBadge";

export default function Meters() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [statusFilter, setStatusFilter] = useState<MeterStatus | "">("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const load = () => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    api.get<Meter[]>("/meters", { params }).then((r) => setMeters(r.data));
  };

  useEffect(load, [statusFilter]);

  const flagMeter = async (id: number) => {
    await api.post(`/meters/${id}/flag`);
    load();
  };

  const openCase = (meterId: number) => navigate(`/cases/new?meter_id=${meterId}`);

  const filtered = meters.filter((m) =>
    !search ||
    m.meter_serial.toLowerCase().includes(search.toLowerCase()) ||
    m.account_number.toLowerCase().includes(search.toLowerCase()) ||
    m.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Meters</h2>
          <p className="text-sm text-gray-500">{filtered.length} meters</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search serial, account, name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
            {filtered.map((m) => (
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
                        className="text-xs text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 px-2 py-1 rounded"
                      >
                        Flag
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No meters found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
