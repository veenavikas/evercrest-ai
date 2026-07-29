"use client";

import { useEffect, useState } from "react";
import { Search, Filter } from "lucide-react";

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkOrders = () => {
    fetch("/api/admin/work-orders")
      .then(res => res.json())
      .then(d => {
        if (d.workOrders) setWorkOrders(d.workOrders);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchWorkOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2">
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500">Ref Code</th>
              <th className="px-6 py-3 font-medium text-gray-500">Tenant</th>
              <th className="px-6 py-3 font-medium text-gray-500">Category</th>
              <th className="px-6 py-3 font-medium text-gray-500">Urgency</th>
              <th className="px-6 py-3 font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 font-medium text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {workOrders.map((wo) => (
              <tr key={wo.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                <td className="px-6 py-4 font-medium text-blue-600">{wo.referenceCode}</td>
                <td className="px-6 py-4">
                  <div>{wo.tenant?.fullName || "N/A"}</div>
                  <div className="text-xs text-gray-500">{wo.tenant?.email}</div>
                  <div className="text-xs text-gray-500">Unit: {wo.unitNumber}</div>
                </td>
                <td className="px-6 py-4 capitalize">{wo.category}</td>
                <td className="px-6 py-4 capitalize">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium 
                    ${wo.urgency === 'high' || wo.urgency === 'emergency' ? 'bg-red-100 text-red-700' : 
                      wo.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                    {wo.urgency}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select 
                    value={wo.status}
                    onChange={(e) => handleStatusUpdate(wo.id, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 bg-white text-sm"
                  >
                    <option value="new">New</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-gray-500">{new Date(wo.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {workOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No work orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
