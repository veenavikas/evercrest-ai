"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Search, Shield, User, Building, FileSpreadsheet, Trash2, Edit2, X, Check } from "lucide-react";

type WhitelistEntry = {
  id: number;
  email: string;
  role: "admin" | "tenant";
  propertyId: number | null;
  propertyCode?: string | null;
  propertyName?: string | null;
  propertyAddress?: string | null;
  city?: string | null;
  state?: string | null;
  createdAt: string;
};

type PropertyOption = {
  id: number;
  name: string;
  code?: string | null;
  addressLine1: string;
  city: string;
  state: string;
};

export default function WhitelistPage() {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [propertiesList, setPropertiesList] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Add form state
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"tenant" | "admin">("tenant");
  const [newPropertyId, setNewPropertyId] = useState("");

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<WhitelistEntry | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"tenant" | "admin">("tenant");
  const [editPropertyId, setEditPropertyId] = useState("");

  const fetchData = () => {
    Promise.all([
      fetch("/api/admin/allowed-emails").then((res) => res.json()),
      fetch("/api/admin/properties").then((res) => res.json()),
    ])
      .then(([allowedData, propsData]) => {
        if (allowedData.allowedEmails) setEntries(allowedData.allowedEmails);
        if (propsData.properties) setPropertiesList(propsData.properties);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load whitelist or properties:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredEntries = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return entries.filter((entry) => {
      return (
        entry.email.toLowerCase().includes(query) ||
        (entry.propertyCode || "").toLowerCase().includes(query) ||
        (entry.propertyAddress || "").toLowerCase().includes(query) ||
        (entry.city || "").toLowerCase().includes(query) ||
        entry.role.toLowerCase().includes(query)
      );
    });
  }, [entries, searchTerm]);

  const stats = useMemo(() => {
    const tenants = entries.filter((e) => e.role === "tenant").length;
    const admins = entries.filter((e) => e.role === "admin").length;
    const mappedProperties = new Set(entries.map((e) => e.propertyId).filter(Boolean)).size;
    return { tenants, admins, mappedProperties, total: entries.length };
  }, [entries]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/allowed-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          role: newRole,
          propertyId: newPropertyId ? parseInt(newPropertyId) : null,
        }),
      });
      if (res.ok) {
        setNewEmail("");
        setNewPropertyId("");
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to add email to whitelist");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (entry: WhitelistEntry) => {
    setEditingEntry(entry);
    setEditEmail(entry.email);
    setEditRole(entry.role);
    setEditPropertyId(entry.propertyId ? String(entry.propertyId) : "");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    try {
      const res = await fetch("/api/admin/allowed-emails", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingEntry.id,
          email: editEmail,
          role: editRole,
          propertyId: editPropertyId ? parseInt(editPropertyId) : null,
        }),
      });
      if (res.ok) {
        setEditingEntry(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to update whitelist entry");
      }
    } catch (err) {
      console.error("Failed to update whitelist entry:", err);
    }
  };

  const handleDelete = async (id: number, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the whitelist?`)) return;
    try {
      const res = await fetch("/api/admin/allowed-emails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, email }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to remove email from whitelist");
      }
    } catch (err) {
      console.error("Failed to delete whitelist entry:", err);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading access whitelist...</div>;

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Whitelist</h1>
          <p className="text-xs text-gray-500 mt-1">Appfolio synced resident directory & admin access whitelist.</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700">
          <FileSpreadsheet size={15} />
          <span>Appfolio Synced ({stats.total} Whitelisted)</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <User size={16} className="text-blue-500" />
            <span>Total Whitelisted</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.total} Users</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <User size={16} className="text-emerald-500" />
            <span>Whitelisted Tenants</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.tenants} Tenants</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Building size={16} className="text-indigo-500" />
            <span>Mapped Properties</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.mappedProperties} Properties</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Shield size={16} className="text-purple-500" />
            <span>Admin Users</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.admins} Admins</div>
        </div>
      </div>

      {/* Add New Whitelist Entry */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Add New Whitelisted User</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap md:flex-nowrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
              placeholder="resident@example.com"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as any)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="tenant">Tenant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="w-72">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Property (P# Code & Address)</label>
            <select
              value={newPropertyId}
              onChange={(e) => setNewPropertyId(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">No Property / All Properties</option>
              {propertiesList.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.code ? `[${prop.code}] ` : ""}{prop.addressLine1} ({prop.city})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-[#191919] text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-gray-800 flex items-center gap-1.5 transition-all cursor-pointer h-[34px]"
          >
            <Plus size={15} /> Add to Whitelist
          </button>
        </form>
      </div>

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Edit2 size={16} className="text-blue-600" /> Edit Whitelisted User
              </h3>
              <button
                onClick={() => setEditingEntry(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Whitelisted Email</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="tenant">Tenant</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Property (P# Code & Address)</label>
                <select
                  value={editPropertyId}
                  onChange={(e) => setEditPropertyId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">No Property / All Properties</option>
                  {propertiesList.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.code ? `[${prop.code}] ` : ""}{prop.addressLine1} ({prop.city})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={15} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Whitelist Directory Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">Whitelisted Directory ({filteredEntries.length})</h3>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, P# code, or property address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs w-80 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-3">Whitelisted Email</th>
                <th className="px-6 py-3">P# Code</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Assigned Property Address</th>
                <th className="px-6 py-3">Added Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{entry.email}</td>
                    <td className="px-6 py-3.5">
                      {entry.propertyCode ? (
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px]">
                          {entry.propertyCode}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                          entry.role === "admin"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {entry.role}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {entry.propertyAddress ? (
                        <span>
                          {entry.propertyAddress}, {entry.city || ""} {entry.state || ""}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">All properties / General</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{new Date(entry.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(entry)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                          title="Edit Whitelist Entry"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id, entry.email)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Remove from Whitelist"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400 italic">
                    No matching whitelist entries found.
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
