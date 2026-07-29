"use client";

import { useEffect, useState } from "react";
import { Activity, MessageSquare, Wrench } from "lucide-react";

export default function AdminSystemLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/system-logs")
      .then(res => res.json())
      .then(d => {
        if (d.logs) setLogs(d.logs);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading system logs...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500">Event</th>
              <th className="px-6 py-3 font-medium text-gray-500">Details</th>
              <th className="px-6 py-3 font-medium text-gray-500">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${log.type === 'work_order' ? 'bg-orange-100 text-orange-500' : 'bg-blue-100 text-blue-500'}`}>
                      {log.type === 'work_order' ? <Wrench size={20} /> : <MessageSquare size={20} />}
                    </div>
                    <div className="font-medium text-gray-900">{log.title}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {log.description}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No logs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
