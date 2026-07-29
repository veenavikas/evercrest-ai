"use client";

import { useEffect, useState } from "react";
import { Plus, Building2 } from "lucide-react";

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProperties = () => {
    fetch("/api/admin/properties")
      .then(res => res.json())
      .then(d => {
        if (d.properties) setProperties(d.properties);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  if (loading) return <div className="p-8">Loading properties...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
          <Plus size={18} /> Add Property
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500">Property</th>
              <th className="px-6 py-3 font-medium text-gray-500">Address</th>
              <th className="px-6 py-3 font-medium text-gray-500">Contact</th>
              <th className="px-6 py-3 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {properties.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500">Slug: {p.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>{p.addressLine1}</div>
                  <div className="text-xs text-gray-500">{p.city}, {p.state} {p.postalCode}</div>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  <div>{p.contactEmail || "N/A"}</div>
                  <div className="text-xs">{p.contactPhone}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {properties.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No properties found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
