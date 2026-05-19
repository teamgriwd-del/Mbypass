import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../api/client";
import type { AnomalyResult } from "../api/types";
import RiskBadge from "../components/RiskBadge";

export default function AnalyzeFeeder() {
  const [feederId, setFeederId] = useState("");
  const [results, setResults] = useState<AnomalyResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const r = await api.post<AnomalyResult[]>(`/feeders/${feederId.trim().toUpperCase()}/analyze`);
      setResults(r.data.sort((a, b) => b.risk_score - a.risk_score));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? err.message ?? "Analysis failed");
      } else {
        setError("Unexpected error — check the console");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Analyze Feeder</h2>
        <p className="text-sm text-gray-500 mt-1">
          Run anomaly detection on all meters in a feeder and score them by bypass risk.
        </p>
      </div>

      <form onSubmit={analyze} className="flex gap-3">
        <input
          required
          value={feederId}
          onChange={(e) => setFeederId(e.target.value)}
          placeholder="Feeder ID (e.g. F-101)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Run Analysis"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {results && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">
              {results.length} meters analyzed — {results.filter((r) => r.risk_level === "high" || r.risk_level === "critical").length} high/critical risk
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                {["Serial", "Account", "Customer", "Risk Score", "Risk Level", "Anomalies Detected", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {results.map((r) => (
                <tr key={r.meter_id} className={r.risk_level === "critical" ? "bg-red-50" : r.risk_level === "high" ? "bg-orange-50" : ""}>
                  <td className="px-4 py-3 font-mono text-xs">{r.meter_serial}</td>
                  <td className="px-4 py-3 text-gray-600">{r.account_number}</td>
                  <td className="px-4 py-3 font-medium">{r.customer_name}</td>
                  <td className="px-4 py-3 font-bold text-gray-700">{r.risk_score.toFixed(0)}</td>
                  <td className="px-4 py-3"><RiskBadge level={r.risk_level} /></td>
                  <td className="px-4 py-3">
                    {r.anomaly_flags.length === 0 ? (
                      <span className="text-gray-400 text-xs">None</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {r.anomaly_flags.map((f, i) => (
                          <li key={i} className="text-xs text-orange-700">• {f}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(r.risk_level === "high" || r.risk_level === "critical") && (
                      <button
                        onClick={() => navigate(`/cases?meter_id=${r.meter_id}&show=new`)}
                        className="text-xs bg-brand-600 text-white px-2 py-1 rounded hover:bg-brand-700"
                      >
                        Open Case
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
