"use client";

import { useEffect, useState, useMemo } from "react";
import { Activity, MessageSquare, Wrench, Shield, Search, Bell, Building } from "lucide-react";

type LogItem = {
  id: string;
  type: "audit" | "work_order" | "conversation";
  title: string;
  description: string;
  timestamp: string;
};

export default function AdminSystemLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "audit" | "work_order" | "conversation">("all");

  const fetchLogs = () => {
    fetch("/api/admin/system-logs")
      .then((res) => res.json())
      .then((d) => {
        if (d.logs) setLogs(d.logs);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch system logs:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch = log.title.toLowerCase().includes(query) || log.description.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      if (typeFilter !== "all" && log.type !== typeFilter) return false;
      return true;
    });
  }, [logs, searchTerm, typeFilter]);

  if (loading) return <div className="p-8 text-gray-500">Loading system logs & audit trail...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-[#191919]">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System & Security Audit Logs</h1>
          <p className="text-xs text-gray-500 mt-1">Real-time audit trail of resident whitelisting, work orders, AI triage, and broadcast notices.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
          <Activity size={15} />
          <span>Live Audit Log ({logs.length} Events)</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">Security Audit Trail ({filteredLogs.length})</h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search audit logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs w-64 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Event Types</option>
              <option value="audit">Security & Whitelist</option>
              <option value="work_order">Work Orders</option>
              <option value="conversation">AI Triage Activity</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-3">Event Category</th>
                <th className="px-6 py-3">Action Details</th>
                <th className="px-6 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                          log.type === "audit"
                            ? "bg-purple-50 text-purple-600 border border-purple-100"
                            : log.type === "work_order"
                            ? "bg-amber-50 text-amber-600 border border-amber-100"
                            : "bg-blue-50 text-blue-600 border border-blue-100"
                        }`}
                      >
                        {log.type === "audit" ? (
                          <Shield size={18} />
                        ) : log.type === "work_order" ? (
                          <Wrench size={18} />
                        ) : (
                          <MessageSquare size={18} />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{log.title}</div>
                        <div className="text-[10px] text-gray-500 capitalize">{log.type.replace("_", " ")}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-700 font-mono text-[11px]">{log.description}</td>
                  <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-400 italic">
                    No system audit logs found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
