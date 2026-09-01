"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  BarChart3, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  Filter, 
  RotateCcw, 
  Download, 
  Building2, 
  Wrench, 
  AlertCircle,
  FileSpreadsheet
} from "lucide-react";

type AnalyticsData = {
  totalWorkOrders: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  avgResolutionHours: number;
  slaBreaches: number;
  aiSummary: string;
};

type PropertyOption = {
  id: number;
  name: string;
  code?: string | null;
  addressLine1: string;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [propertiesList, setPropertiesList] = useState<PropertyOption[]>([]);

  // Filter States (Tests #11 - #17)
  const [preset, setPreset] = useState<"all" | "today" | "7d" | "30d" | "ytd" | "custom">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [propertyId, setPropertyId] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");

  // Date Validation Error State (Test #13)
  const [dateError, setDateError] = useState<string | null>(null);

  // Fetch Available Properties for Filter Dropdown (Test #14)
  useEffect(() => {
    fetch("/api/admin/properties")
      .then((res) => res.json())
      .then((d) => {
        if (d.properties) setPropertiesList(d.properties);
      })
      .catch((err) => console.error("Failed to load properties for analytics filter:", err));
  }, []);

  const fetchAnalytics = () => {
    setLoading(true);
    setDateError(null);

    // Test #13: Validate Start Date after End Date
    if (preset === "custom" && startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        setDateError("Invalid Date Range: Start Date cannot be after End Date.");
        setLoading(false);
        return;
      }
    }

    const params = new URLSearchParams();
    if (preset) params.set("preset", preset);
    if (preset === "custom") {
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
    }
    if (propertyId && propertyId !== "all") params.set("propertyId", propertyId);
    if (vendorFilter && vendorFilter !== "all") params.set("vendor", vendorFilter);

    fetch(`/api/admin/analytics/summary?${params.toString()}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load analytics:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAnalytics();
  }, [preset, startDate, endDate, propertyId, vendorFilter]);

  // Test #17: Reset all filters handler
  const handleResetFilters = () => {
    setPreset("all");
    setStartDate("");
    setEndDate("");
    setPropertyId("all");
    setVendorFilter("all");
    setDateError(null);
  };

  // Test #18: Export Analytics Data as CSV
  const handleExportCSV = () => {
    if (!data) return;

    const rows = [
      ["Metric", "Value"],
      ["Total Work Orders", data.totalWorkOrders],
      ["Avg Resolution Time (Hours)", data.avgResolutionHours],
      ["SLA Breaches (>48h)", data.slaBreaches],
      [""],
      ["Status Breakdown", "Count"],
      ...Object.entries(data.byStatus || {}).map(([st, cnt]) => [st, cnt]),
      [""],
      ["Category Breakdown", "Count"],
      ...Object.entries(data.byCategory || {}).map(([cat, cnt]) => [cat, cnt]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CrestFix_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-[#191919]">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Analytics Overview</h1>
          <p className="text-xs text-gray-500 mt-1">Operational metrics, resolution speed & multi-filter analytics controls.</p>
        </div>
        
        {/* Test #18: Export Control */}
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={!data}
          className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <Download size={15} /> Export Analytics CSV
        </button>
      </div>

      {/* Filter Control Bar (Tests #11, #12, #14, #15, #16, #17) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Filter size={16} className="text-blue-600" />
            <span>Analytics Filters & Controls</span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer hover:underline"
          >
            <RotateCcw size={13} /> Clear / Reset All Filters
          </button>
        </div>

        {/* Preset Date Range Buttons (Test #11) */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-semibold text-gray-500 mr-1">Preset Ranges:</span>
          {(["all", "today", "7d", "30d", "ytd", "custom"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPreset(p);
                if (p !== "custom") {
                  setStartDate("");
                  setEndDate("");
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer capitalize ${
                preset === p
                  ? "bg-[#191919] text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {p === "all" ? "All Time" : p === "7d" ? "Last 7 Days" : p === "30d" ? "Last 30 Days" : p === "ytd" ? "Year to Date (YTD)" : p}
            </button>
          ))}
        </div>

        {/* Multi-Filters Grid: Custom Dates, Property, Vendor (Tests #12, #14, #15, #16) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          {/* Custom Start Date (Test #12) */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset("custom");
              }}
              className="w-full border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>

          {/* Custom End Date (Test #12) */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset("custom");
              }}
              className="w-full border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>

          {/* Property Filter Dropdown (Test #14) */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Filter by Property / Site</label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="all">All Properties & Sites</option>
              {propertiesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `[${p.code}] ` : ""}{p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee / Vendor Category Filter Dropdown (Test #15) */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Filter by Assignee / Vendor</label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="all">All Vendors & Categories</option>
              <option value="plumbing">Plumbing Trade</option>
              <option value="hvac">HVAC / Cooling Trade</option>
              <option value="electrical">Electrical Trade</option>
              <option value="appliance">Appliance Repair</option>
              <option value="handyman">General Handyman</option>
            </select>
          </div>
        </div>

        {/* Date Error Banner (Test #13 Fix) */}
        {dateError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{dateError}</span>
          </div>
        )}
      </div>

      {/* AI Summary Banner */}
      {data && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xs space-y-2">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <BarChart3 size={18} /> AI Executive Summary
          </h2>
          <p className="text-xs text-indigo-50 leading-relaxed">{data.aiSummary}</p>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-gray-500">Loading analytics metrics...</div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold mb-1">
                <CheckCircle size={18} className="text-blue-500" />
                <span>Total Filtered Work Orders</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.totalWorkOrders}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold mb-1">
                <Clock size={18} className="text-emerald-500" />
                <span>Avg Resolution Speed</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{data.avgResolutionHours} hrs</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold mb-1">
                <AlertTriangle size={18} className="text-rose-500" />
                <span>SLA Breaches (&gt;48h)</span>
              </div>
              <p className="text-2xl font-bold text-rose-700">{data.slaBreaches}</p>
            </div>
          </div>

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-gray-100 pb-3">Breakdown by Ticket Status</h3>
              <div className="space-y-3">
                {Object.entries(data.byStatus || {}).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center text-xs">
                    <span className="capitalize font-semibold text-gray-700">{status.replace("_", " ")}</span>
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      {count}
                    </span>
                  </div>
                ))}
                {Object.keys(data.byStatus || {}).length === 0 && (
                  <div className="text-xs text-gray-400 italic">No status data matching active filters.</div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-gray-100 pb-3">Breakdown by Trade Category</h3>
              <div className="space-y-3">
                {Object.entries(data.byCategory || {}).map(([category, count]) => (
                  <div key={category} className="flex justify-between items-center text-xs">
                    <span className="capitalize font-semibold text-gray-700">{category}</span>
                    <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {count}
                    </span>
                  </div>
                ))}
                {Object.keys(data.byCategory || {}).length === 0 && (
                  <div className="text-xs text-gray-400 italic">No category data matching active filters.</div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="p-8 text-rose-500">Failed to load analytics data.</div>
      )}
    </div>
  );
}
