"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle } from "lucide-react";

export default function MyWorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We can re-use the admin endpoint by passing tenant flag if needed, or build a specific one.
    // Wait, we didn't build a specific tenant GET /api/work-orders endpoint yet.
    // Let's assume we can fetch them via a specific endpoint we'll create right after this.
    fetch("/api/work-orders")
      .then(res => res.json())
      .then(d => {
        if (d.workOrders) setWorkOrders(d.workOrders);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/chat" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Chat</span>
          </Link>
          <h1 className="font-semibold text-gray-800">My Work Orders</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full space-y-4">
        {workOrders.map(wo => (
          <div key={wo.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium text-blue-600">{wo.referenceCode}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${wo.status === 'resolved' || wo.status === 'closed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {wo.status.replace("_", " ")}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 capitalize">{wo.category} Issue</h3>
              <p className="text-gray-600 text-sm">{wo.description}</p>
            </div>
            <div className="flex flex-col items-start md:items-end text-sm text-gray-500 justify-center">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>Submitted: {new Date(wo.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="capitalize mt-1">Urgency: {wo.urgency}</div>
            </div>
          </div>
        ))}

        {workOrders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <CheckCircle className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">You have no active work orders.</p>
            <Link href="/chat" className="text-blue-600 hover:underline mt-2 inline-block">
              Report an issue
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
