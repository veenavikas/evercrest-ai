"use client";

import { useEffect, useState } from "react";
import { BarChart3, Clock, AlertTriangle, CheckCircle } from "lucide-react";

type AnalyticsData = {
  totalWorkOrders: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  avgResolutionHours: number;
  slaBreaches: number;
  aiSummary: string;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics/summary")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading analytics...</div>;
  if (!data) return <div className="p-8 text-red-500">Failed to load analytics</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>

      {/* AI Summary Banner */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-sm">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <BarChart3 size={20} /> AI Executive Summary
        </h2>
        <p className="text-indigo-50 leading-relaxed">{data.aiSummary}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <CheckCircle size={20} className="text-blue-500" />
            <h3 className="font-medium">Total Work Orders</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.totalWorkOrders}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <Clock size={20} className="text-green-500" />
            <h3 className="font-medium">Avg Resolution</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.avgResolutionHours} hrs</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <AlertTriangle size={20} className="text-red-500" />
            <h3 className="font-medium">SLA Breaches</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.slaBreaches}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">By Status</h3>
          <div className="space-y-3">
            {Object.entries(data.byStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="capitalize text-gray-600">{status}</span>
                <span className="font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">By Category</h3>
          <div className="space-y-3">
            {Object.entries(data.byCategory).map(([category, count]) => (
              <div key={category} className="flex justify-between items-center">
                <span className="capitalize text-gray-600">{category}</span>
                <span className="font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
