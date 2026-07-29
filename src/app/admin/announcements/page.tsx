"use client";

import { useEffect, useState } from "react";
import { Plus, Megaphone } from "lucide-react";

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = () => {
    fetch("/api/admin/announcements")
      .then(res => res.json())
      .then(d => {
        if (d.announcements) setAnnouncements(d.announcements);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  if (loading) return <div className="p-8">Loading announcements...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
          <Plus size={18} /> New Announcement
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500">Title</th>
              <th className="px-6 py-3 font-medium text-gray-500">Property</th>
              <th className="px-6 py-3 font-medium text-gray-500">Date</th>
              <th className="px-6 py-3 font-medium text-gray-500">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {announcements.map(a => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.isImportant ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}`}>
                      <Megaphone size={20} />
                    </div>
                    <div className="font-medium text-gray-900">{a.title}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {a.property?.name || "All Properties"}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(a.publishedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  {a.isImportant ? (
                    <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium">Important</span>
                  ) : (
                    <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded-full text-xs font-medium">Normal</span>
                  )}
                </td>
              </tr>
            ))}
            {announcements.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No announcements found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
