import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, CheckCircle, FolderOpen, Zap, Activity, TrendingUp } from "lucide-react";
import api from "../api/client";
import type { DashboardStats, FeederNTL } from "../api/types";

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 border border-gray-100">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ntl, setNtl] = useState<FeederNTL[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats>("/dashboard/stats"),
      api.get<FeederNTL[]>("/dashboard/feeders/ntl-summary"),
    ])
      .then(([statsRes, ntlRes]) => {
        setStats(statsRes.data);
        setNtl(ntlRes.data);
      })
      .catch(() => setError("Failed to load dashboard. Is the backend running?"));
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="p-8 text-gray-400">Loading dashboard...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Electricity theft detection overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Zap} label="Total Meters" value={stats.total_meters} color="bg-brand-600" />
        <StatCard icon={AlertTriangle} label="Flagged Meters" value={stats.flagged_meters} color="bg-yellow-500" />
        <StatCard icon={CheckCircle} label="Confirmed Bypasses" value={stats.confirmed_bypasses} color="bg-red-500" />
        <StatCard icon={FolderOpen} label="Open Cases" value={stats.open_cases} color="bg-purple-500" />
        <StatCard icon={Activity} label="High-Risk Feeders" value={stats.high_risk_feeders} color="bg-orange-500" />
        <StatCard icon={TrendingUp} label="Avg NTL %" value={`${stats.avg_ntl_percent}%`} color="bg-teal-500" />
      </div>

      {ntl.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Non-Technical Loss by Feeder</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ntl} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="feeder_id" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="avg_ntl_percent" name="Avg NTL %" radius={[4, 4, 0, 0]}>
                {ntl.map((entry) => (
                  <Cell
                    key={entry.feeder_id}
                    fill={entry.avg_ntl_percent >= 20 ? "#ef4444" : entry.avg_ntl_percent >= 15 ? "#f97316" : "#3b82f6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2">Feeders above 15% NTL are considered high-risk</p>
        </div>
      )}
    </div>
  );
}
