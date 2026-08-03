"use client";

import { useEffect, useState } from "react";
import { Plus, Megaphone, Trash2, X, Check, Bell, AlertTriangle, Building2 } from "lucide-react";

type AnnouncementItem = {
  id: number;
  title: string;
  body?: string;
  priority: string;
  publishedAt: string;
  property?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
};

type PropertyOption = {
  id: number;
  name: string;
  code?: string | null;
  addressLine1: string;
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [propertiesList, setPropertiesList] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);

  // New Announcement Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [isImportant, setIsImportant] = useState(false);

  const fetchData = () => {
    Promise.all([
      fetch("/api/admin/announcements").then((res) => res.json()),
      fetch("/api/admin/properties").then((res) => res.json()),
    ])
      .then(([annData, propsData]) => {
        if (annData.announcements) setAnnouncements(annData.announcements);
        if (propsData.properties) setPropertiesList(propsData.properties);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load announcements:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          propertyId: propertyId ? parseInt(propertyId) : null,
          isImportant,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setTitle("");
        setContent("");
        setPropertyId("");
        setIsImportant(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to post announcement");
      }
    } catch (err) {
      console.error("Failed to create announcement:", err);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete announcement "${title}"?`)) return;
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to delete announcement");
      }
    } catch (err) {
      console.error("Failed to delete announcement:", err);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading announcements...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-[#191919]">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcast Announcements</h1>
          <p className="text-xs text-gray-500 mt-1">Publish community notices, maintenance alerts & policy updates to residents.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {/* New Announcement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Megaphone size={18} className="text-blue-600" /> Create Broadcast Announcement
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scheduled Water Maintenance Notice"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Target Property</label>
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">All Properties (Global Broadcast)</option>
                    {propertiesList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code ? `[${p.code}] ` : ""}{p.addressLine1}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
                  <select
                    value={isImportant ? "important" : "normal"}
                    onChange={(e) => setIsImportant(e.target.value === "important")}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="normal">Normal Notice</option>
                    <option value="important">Urgent / Important Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Announcement Content / Message</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Provide detailed notice instructions for residents..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={15} /> Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcements Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">Published Broadcasts ({announcements.length})</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-3">Notice Title</th>
                <th className="px-6 py-3">Target Property</th>
                <th className="px-6 py-3">Published Date</th>
                <th className="px-6 py-3">Priority Level</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {announcements.map((a) => {
                const isUrgent = a.priority === "important";
                return (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                            isUrgent ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                          }`}
                        >
                          {isUrgent ? <AlertTriangle size={18} /> : <Bell size={18} />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{a.title}</div>
                          {a.body && <div className="text-gray-500 text-[11px] line-clamp-1 mt-0.5">{a.body}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {a.property?.name ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-indigo-600" />
                          <span>
                            {a.property.code ? `[${a.property.code}] ` : ""}{a.property.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-semibold text-[10px]">
                          All Properties
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{new Date(a.publishedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3.5">
                      {isUrgent ? (
                        <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-semibold">
                          Urgent / Important
                        </span>
                      ) : (
                        <span className="text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-semibold">
                          Normal Notice
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(a.id, a.title)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="Delete Announcement"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {announcements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">
                    No announcements published yet. Click "+ New Announcement" to broadcast to residents.
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
