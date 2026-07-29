"use client";

import { useEffect, useState } from "react";
import { Plus, Umbrella } from "lucide-react";

export default function AdminAmenitiesPage() {
  const [amenities, setAmenities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAmenities = () => {
    fetch("/api/admin/amenities")
      .then(res => res.json())
      .then(d => {
        if (d.amenities) setAmenities(d.amenities);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAmenities();
  }, []);

  if (loading) return <div className="p-8">Loading amenities...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Amenities</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
          <Plus size={18} /> Add Amenity
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500">Amenity</th>
              <th className="px-6 py-3 font-medium text-gray-500">Property</th>
              <th className="px-6 py-3 font-medium text-gray-500">Hours</th>
              <th className="px-6 py-3 font-medium text-gray-500">Booking Config</th>
              <th className="px-6 py-3 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {amenities.map(a => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-500">
                      <Umbrella size={20} />
                    </div>
                    <div className="font-medium text-gray-900">{a.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {a.property?.name || "N/A"}
                </td>
                <td className="px-6 py-4">
                  {a.openTime} - {a.closeTime}
                </td>
                <td className="px-6 py-4">
                  {a.requiresBooking ? (
                    <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs font-medium">Bookable</span>
                  ) : (
                    <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded-full text-xs font-medium">Walk-in</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {a.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {amenities.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No amenities found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
