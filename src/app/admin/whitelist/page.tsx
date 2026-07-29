"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type WhitelistEntry = {
  id: number;
  email: string;
  role: "admin" | "tenant";
  propertyId: number | null;
  createdAt: string;
};

export default function WhitelistPage() {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"tenant" | "admin">("tenant");
  const [newPropertyId, setNewPropertyId] = useState("");

  const fetchWhitelist = () => {
    fetch("/api/admin/allowed-emails")
      .then(res => res.json())
      .then(d => {
        if (d.allowedEmails) setEntries(d.allowedEmails);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWhitelist();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/allowed-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: newEmail, 
          role: newRole, 
          propertyId: newPropertyId ? parseInt(newPropertyId) : null 
        }),
      });
      if (res.ok) {
        setNewEmail("");
        setNewPropertyId("");
        fetchWhitelist();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to add email");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Access Whitelist</h1>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Add New User</h2>
        <form onSubmit={handleAdd} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select 
              value={newRole}
              onChange={e => setNewRole(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="tenant">Tenant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property ID (Optional)</label>
            <input 
              type="number" 
              value={newPropertyId}
              onChange={e => setNewPropertyId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g. 1"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus size={18} /> Add
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Email</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Role</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Property ID</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Added Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.map(entry => (
              <tr key={entry.id}>
                <td className="px-6 py-4 text-gray-900">{entry.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${entry.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {entry.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{entry.propertyId || "All"}</td>
                <td className="px-6 py-4 text-gray-500">{new Date(entry.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No users in whitelist</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
