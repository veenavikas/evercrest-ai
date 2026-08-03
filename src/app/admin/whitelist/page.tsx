"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Search, Shield, User, Building, FileSpreadsheet, Trash2, Edit2, X, Check, ArrowUpDown } from "lucide-react";

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

  // Filters & Sorting
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"code" | "email" | "newest">("code");
  
  // Add form state
  const [newEmail, setNewEmail] = useState("");
  const [newPNum, setNewPNum] = useState("");
  const [newPropertyId, setNewPropertyId] = useState("");

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<WhitelistEntry | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPNum, setEditPNum] = useState("");
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
    let result = entries.filter((entry) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        entry.email.toLowerCase().includes(query) ||
        (entry.propertyCode || "").toLowerCase().includes(query) ||
        (entry.propertyAddress || "").toLowerCase().includes(query) ||
        (entry.city || "").toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (propertyFilter !== "all") {
        if (propertyFilter === "unassigned") {
          if (entry.propertyId || entry.propertyCode) return false;
        } else {
          const filterPropId = Number(propertyFilter);
          if (entry.propertyId !== filterPropId && entry.propertyCode !== propertyFilter) return false;
        }
      }

      return true;
    });

    // Sorting logic
    result.sort((a, b) => {
      if (sortBy === "code") {
        return (a.propertyCode || "ZZZ").localeCompare(b.propertyCode || "ZZZ", undefined, { numeric: true });
      }
      if (sortBy === "email") {
        return a.email.localeCompare(b.email);
      }
      if (sortBy === "newest") {
        return b.id - a.id;
      }
      return 0;
    });

    return result;
  }, [entries, searchTerm, propertyFilter, sortBy]);

  const stats = useMemo(() => {
    const totalTenants = entries.length;
    const mappedProperties = new Set(entries.map((e) => e.propertyId).filter(Boolean)).size;
    const unassigned = entries.filter((e) => !e.propertyId && !e.propertyCode).length;
    return { totalTenants, mappedProperties, unassigned };
  }, [entries]);

  // Handlers for Add Form P# and Property Sync
  const handleNewPNumChange = (val: string) => {
    setNewPNum(val);
    const clean = val.trim().toLowerCase();
    if (!clean) return;
    const matched = propertiesList.find((p) => (p.code || "").toLowerCase() === clean);
    if (matched) {
      setNewPropertyId(String(matched.id));
    }
  };

  const handleNewPropertyIdChange = (val: string) => {
    setNewPropertyId(val);
    if (!val) {
      setNewPNum("");
      return;
    }
    const matched = propertiesList.find((p) => p.id === parseInt(val));
    if (matched && matched.code) {
      setNewPNum(matched.code);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/allowed-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          role: "tenant",
          propertyId: newPropertyId ? parseInt(newPropertyId) : null,
          propertyCode: newPNum ? newPNum.trim() : null,
        }),
      });
      if (res.ok) {
        setNewEmail("");
        setNewPNum("");
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

  // Handlers for Edit Modal P# and Property Sync
  const startEdit = (entry: WhitelistEntry) => {
    setEditingEntry(entry);
    setEditEmail(entry.email);
    setEditPNum(entry.propertyCode || "");
    setEditPropertyId(entry.propertyId ? String(entry.propertyId) : "");
  };

  const handleEditPNumChange = (val: string) => {
    setEditPNum(val);
    const clean = val.trim().toLowerCase();
    if (!clean) return;
    const matched = propertiesList.find((p) => (p.code || "").toLowerCase() === clean);
    if (matched) {
      setEditPropertyId(String(matched.id));
    }
  };

  const handleEditPropertyIdChange = (val: string) => {
    setEditPropertyId(val);
    if (!val) {
      setEditPNum("");
      return;
    }
    const matched = propertiesList.find((p) => p.id === parseInt(val));
    if (matched && matched.code) {
      setEditPNum(matched.code);
    }
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
          role: "tenant",
          propertyId: editPropertyId ? parseInt(editPropertyId) : null,
          propertyCode: editPNum ? editPNum.trim() : null,
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
    if (!confirm(`Are you sure you want to remove ${email} from the resident whitelist?`)) return;
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

  if (loading) return <div className="p-8 text-gray-500">Loading resident access whitelist...</div>;

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resident Access Whitelist</h1>
          <p className="text-xs text-gray-500 mt-1">Appfolio synced resident directory & property access control.</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700">
          <FileSpreadsheet size={15} />
          <span>Appfolio Synced ({stats.totalTenants} Whitelisted Residents)</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <User size={16} className="text-blue-500" />
            <span>Whitelisted Residents</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.totalTenants} Residents</div>
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
            <Shield size={16} className="text-amber-500" />
            <span>General / Unassigned</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.unassigned} Entries</div>
        </div>
      </div>

      {/* Add New Whitelist Entry Form */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Add Whitelisted Resident</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap md:flex-nowrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Resident Email Address</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
              placeholder="resident@example.com"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold text-gray-600 mb-1">P# Code</label>
            <input
              type="text"
              value={newPNum}
              onChange={(e) => handleNewPNumChange(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 uppercase"
              placeholder="e.g. P141"
            />
          </div>
          <div className="w-72">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Property</label>
            <select
              value={newPropertyId}
              onChange={(e) => handleNewPropertyIdChange(e.target.value)}
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
            <Plus size={15} /> Add Resident
          </button>
        </form>
      </div>

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Edit2 size={16} className="text-blue-600" /> Edit Whitelisted Resident
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
                <label className="block text-xs font-semibold text-gray-600 mb-1">Resident Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">P# Code</label>
                <input
                  type="text"
                  value={editPNum}
                  onChange={(e) => handleEditPNumChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 uppercase"
                  placeholder="e.g. P141"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Property</label>
                <select
                  value={editPropertyId}
                  onChange={(e) => handleEditPropertyIdChange(e.target.value)}
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

      {/* Whitelist Directory Table & Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">Whitelisted Resident Directory ({filteredEntries.length})</h3>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search email, P#, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs w-64 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Property Filter */}
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-500 max-w-[200px]"
            >
              <option value="all">All Properties</option>
              <option value="unassigned">Unassigned / General</option>
              {propertiesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `[${p.code}] ` : ""}{p.addressLine1}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-xl border border-gray-200">
              <ArrowUpDown size={14} className="text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="code">Sort: P# Code (A-Z)</option>
                <option value="email">Sort: Email (A-Z)</option>
                <option value="newest">Sort: Date Added</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-3">Resident Whitelisted Email</th>
                <th className="px-6 py-3">P# Code</th>
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
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">
                    No matching resident whitelist entries found.
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
