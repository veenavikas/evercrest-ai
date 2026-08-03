"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Building2, User, Wrench, Search, CheckCircle2, AlertCircle, X, Check, Home, Edit2, Trash2, ArrowUpDown } from "lucide-react";

type PropertyItem = {
  id: number;
  name: string;
  code?: string | null;
  slug: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  isActive: boolean;
  residentCount: number;
  activeOrderCount: number;
  isOccupied: boolean;
  occupancyStatusText: string;
  createdAt?: string;
};

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [occupancyFilter, setOccupancyFilter] = useState<"all" | "occupied" | "vacant">("all");
  const [sortBy, setSortBy] = useState<"code" | "name" | "residents_desc" | "residents_asc" | "newest">("code");

  // Add Property Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("Missouri City");
  const [state, setState] = useState("TX");
  const [postalCode, setPostalCode] = useState("77489");

  // Edit Property Modal State
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("Missouri City");
  const [editState, setEditState] = useState("TX");
  const [editPostalCode, setEditPostalCode] = useState("77489");
  const [editIsActive, setEditIsActive] = useState(true);

  const fetchProperties = () => {
    fetch("/api/admin/properties")
      .then((res) => res.json())
      .then((d) => {
        if (d.properties) setProperties(d.properties);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load properties:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const filteredProperties = useMemo(() => {
    let result = properties.filter((p) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(query) ||
        (p.code || "").toLowerCase().includes(query) ||
        p.addressLine1.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (occupancyFilter === "occupied") return p.isOccupied;
      if (occupancyFilter === "vacant") return !p.isOccupied;
      return true;
    });

    // Sorting logic
    result.sort((a, b) => {
      if (sortBy === "code") {
        return (a.code || "ZZZ").localeCompare(b.code || "ZZZ", undefined, { numeric: true });
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "residents_desc") {
        return b.residentCount - a.residentCount;
      }
      if (sortBy === "residents_asc") {
        return a.residentCount - b.residentCount;
      }
      if (sortBy === "newest") {
        return b.id - a.id;
      }
      return 0;
    });

    return result;
  }, [properties, searchTerm, occupancyFilter, sortBy]);

  const stats = useMemo(() => {
    const total = properties.length;
    const occupied = properties.filter((p) => p.isOccupied).length;
    const vacant = total - occupied;
    const totalResidents = properties.reduce((acc, p) => acc + (p.residentCount || 0), 0);
    return { total, occupied, vacant, totalResidents };
  }, [properties]);

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name: name || addressLine1,
          addressLine1,
          city,
          state,
          postalCode,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setCode("");
        setName("");
        setAddressLine1("");
        fetchProperties();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to create property");
      }
    } catch (err) {
      console.error("Failed to create property:", err);
    }
  };

  const startEdit = (prop: PropertyItem) => {
    setEditingProperty(prop);
    setEditName(prop.name);
    setEditCode(prop.code || "");
    setEditAddress(prop.addressLine1);
    setEditCity(prop.city);
    setEditState(prop.state);
    setEditPostalCode(prop.postalCode);
    setEditIsActive(prop.isActive);
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;
    try {
      const res = await fetch("/api/admin/properties", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProperty.id,
          name: editName,
          code: editCode,
          addressLine1: editAddress,
          city: editCity,
          state: editState,
          postalCode: editPostalCode,
          isActive: editIsActive,
        }),
      });

      if (res.ok) {
        setEditingProperty(null);
        fetchProperties();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to update property");
      }
    } catch (err) {
      console.error("Failed to update property:", err);
    }
  };

  const handleDeleteProperty = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete property "${name}"? Whitelisted residents will be unlinked.`)) return;
    try {
      const res = await fetch("/api/admin/properties", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        fetchProperties();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to delete property");
      }
    } catch (err) {
      console.error("Failed to delete property:", err);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading properties portfolio...</div>;

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties Management</h1>
          <p className="text-xs text-gray-500 mt-1">Real-time property portfolio, occupancy status & resident counts.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Plus size={16} /> Add Property
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Building2 size={16} className="text-blue-500" />
            <span>Total Properties</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.total} Properties</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Home size={16} className="text-emerald-500" />
            <span>Occupied</span>
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{stats.occupied} Occupied</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Building2 size={16} className="text-amber-500" />
            <span>Vacant Properties</span>
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1">{stats.vacant} Vacant</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <User size={16} className="text-purple-500" />
            <span>Whitelisted Residents</span>
          </div>
          <div className="text-xl font-bold text-purple-700 mt-1">{stats.totalResidents} Residents</div>
        </div>
      </div>

      {/* Add Property Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Building2 size={18} className="text-blue-600" /> Add New Property
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddProperty} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Property Name / Title</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. 2526 Valley Forest"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">P# Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. P142"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. 2526 Valley Forest Dr"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
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
                  <Check size={15} /> Save Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Edit2 size={16} className="text-blue-600" /> Edit Property Details
              </h3>
              <button
                onClick={() => setEditingProperty(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateProperty} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Property Name / Title</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">P# Code</label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={editPostalCode}
                    onChange={(e) => setEditPostalCode(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="editIsActive" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Property Active & Listed
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
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

      {/* Properties Table & Filter Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">Property Directory ({filteredProperties.length})</h3>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, P#, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs w-64 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Occupancy Filter */}
            <select
              value={occupancyFilter}
              onChange={(e) => setOccupancyFilter(e.target.value as any)}
              className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Occupancy</option>
              <option value="occupied">Occupied Only</option>
              <option value="vacant">Vacant Only</option>
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
                <option value="name">Sort: Name (A-Z)</option>
                <option value="residents_desc">Sort: Residents (High → Low)</option>
                <option value="residents_asc">Sort: Residents (Low → High)</option>
                <option value="newest">Sort: Date Created</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-3">P# Code & Property</th>
                <th className="px-6 py-3">Address</th>
                <th className="px-6 py-3">Occupied / Tenants</th>
                <th className="px-6 py-3">Occupancy Status & Activity</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProperties.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                        {p.code ? p.code : <Building2 size={18} />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        {p.code && <div className="text-[10px] font-mono text-indigo-700 font-bold">P# Code: {p.code}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="font-medium text-slate-900">{p.addressLine1}</div>
                    <div className="text-gray-500">{p.city}, {p.state} {p.postalCode}</div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <User size={14} className={p.residentCount > 0 ? "text-emerald-600" : "text-gray-400"} />
                      <span className="font-bold text-slate-900">
                        {p.residentCount} {p.residentCount === 1 ? "Resident" : "Residents"}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {p.isOccupied ? "Occupied" : "Vacant (No Whitelisted Residents)"}
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="space-y-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                          p.isOccupied
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {p.isOccupied ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {p.isOccupied ? "Active / Occupied" : "Active / Vacant"}
                      </span>
                      {p.activeOrderCount > 0 && (
                        <div className="flex items-center gap-1 text-[10px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 w-fit">
                          <Wrench size={12} />
                          <span>{p.activeOrderCount} Open Work Order{p.activeOrderCount > 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(p)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                        title="Edit Property"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(p.id, p.name)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="Delete Property"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProperties.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">
                    No matching properties found.
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
