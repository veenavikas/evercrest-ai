"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  Wrench, 
  Users, 
  Bell, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  Plus, 
  Shield, 
  FileText,
  Activity
} from "lucide-react";

type OverviewStats = {
  totalWorkOrders: number;
  openWorkOrders: number;
  totalProperties: number;
  occupiedProperties: number;
  whitelistedResidents: number;
  activeAnnouncements: number;
};

type RecentWorkOrder = {
  id: number;
  referenceCode: string;
  category: string;
  description: string;
  urgency: string;
  status: string;
  propertyAddress?: string;
  createdAt: string;
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats>({
    totalWorkOrders: 0,
    openWorkOrders: 0,
    totalProperties: 0,
    occupiedProperties: 0,
    whitelistedResidents: 0,
    activeAnnouncements: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/properties").then((res) => res.json()).catch(() => ({})),
      fetch("/api/admin/allowed-emails").then((res) => res.json()).catch(() => ({})),
      fetch("/api/admin/announcements").then((res) => res.json()).catch(() => ({})),
      fetch("/api/admin/analytics/summary").then((res) => res.json()).catch(() => ({})),
    ])
      .then(([propsData, whitelistData, annData, analyticsData]) => {
        const propsList = propsData.properties || [];
        const whitelistList = whitelistData.allowedEmails || [];
        const annList = annData.announcements || [];

        setStats({
          totalWorkOrders: analyticsData.totalWorkOrders || 0,
          openWorkOrders: analyticsData.byStatus ? (analyticsData.byStatus.new || 0) + (analyticsData.byStatus.in_progress || 0) + (analyticsData.byStatus.acknowledged || 0) : 0,
          totalProperties: propsList.length,
          occupiedProperties: propsList.filter((p: any) => p.isOccupied).length,
          whitelistedResidents: whitelistList.length,
          activeAnnouncements: annList.length,
        });

        // Mock/Recent Work Orders for preview
        setRecentOrders([
          {
            id: 101,
            referenceCode: "WO-20260625-1",
            category: "Plumbing",
            description: "Water leak in master bathroom under sink vanity.",
            urgency: "high",
            status: "in_progress",
            propertyAddress: "2526 Valley Forest Dr, Missouri City, TX",
            createdAt: new Date().toISOString(),
          },
          {
            id: 102,
            referenceCode: "WO-20260624-4",
            category: "HVAC",
            description: "AC unit blowing warm air, thermostat unresponsive.",
            urgency: "emergency",
            status: "new",
            propertyAddress: "10418 Crestline Ave, Missouri City, TX",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 103,
            referenceCode: "WO-20260622-2",
            category: "Electrical",
            description: "Kitchen outlet tripping breaker when microwave runs.",
            urgency: "medium",
            status: "acknowledged",
            propertyAddress: "7812 Evergreen Ter, Missouri City, TX",
            createdAt: new Date(Date.now() - 172800000).toISOString(),
          },
        ]);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load overview metrics:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading overview dashboard...</div>;

  return (
    <div className="space-y-6 text-[#191919] max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Overview Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">Real-time status of Evercrest properties, work orders & community announcements.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/properties"
            className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Plus size={15} /> Add Property
          </Link>
          <Link
            href="/admin/whitelist"
            className="bg-[#191919] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-gray-800 flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Shield size={15} /> Whitelist Resident
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Open Work Orders</span>
            <div className="w-8 h-8 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center text-amber-600">
              <Wrench size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.openWorkOrders} Active</div>
          <p className="text-[10px] text-gray-400">Total logged: {stats.totalWorkOrders}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Property Portfolio</span>
            <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <Building2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalProperties} Total</div>
          <p className="text-[10px] text-emerald-600 font-semibold">{stats.occupiedProperties} Occupied</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Whitelisted Residents</span>
            <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.whitelistedResidents} Residents</div>
          <p className="text-[10px] text-gray-400">Appfolio directory synced</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Community Notices</span>
            <div className="w-8 h-8 bg-purple-50 border border-purple-100 rounded-lg flex items-center justify-center text-purple-600">
              <Bell size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.activeAnnouncements} Active</div>
          <p className="text-[10px] text-gray-400">Broadcasts & announcements</p>
        </div>
      </div>

      {/* Main Content Sections Grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Work Orders */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-2xs p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Wrench size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Work Orders</h2>
            </div>
            <Link
              href="/admin/work-orders"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="p-3.5 bg-slate-50/80 rounded-xl border border-gray-200/80 flex items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {order.referenceCode}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                        order.urgency === "emergency"
                          ? "bg-rose-100 text-rose-700"
                          : order.urgency === "high"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {order.urgency}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 truncate">{order.description}</p>
                  <p className="text-[11px] text-gray-500 truncate">{order.propertyAddress}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize ${
                      order.status === "in_progress"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : order.status === "new"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {order.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Quick Navigation & System Status */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Module Shortcuts */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Activity size={18} className="text-indigo-600" /> Admin Module Shortcuts
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/admin/analytics"
                className="p-3 bg-slate-50 hover:bg-indigo-50/60 rounded-xl border border-gray-200 transition-all space-y-1 block"
              >
                <BarChart3 size={18} className="text-indigo-600" />
                <div className="text-xs font-bold text-slate-900">Analytics</div>
                <div className="text-[10px] text-gray-500">Performance & SLA</div>
              </Link>

              <Link
                href="/admin/announcements"
                className="p-3 bg-slate-50 hover:bg-purple-50/60 rounded-xl border border-gray-200 transition-all space-y-1 block"
              >
                <Bell size={18} className="text-purple-600" />
                <div className="text-xs font-bold text-slate-900">Announcements</div>
                <div className="text-[10px] text-gray-500">Broadcast notices</div>
              </Link>

              <Link
                href="/admin/whitelist"
                className="p-3 bg-slate-50 hover:bg-emerald-50/60 rounded-xl border border-gray-200 transition-all space-y-1 block"
              >
                <Shield size={18} className="text-emerald-600" />
                <div className="text-xs font-bold text-slate-900">Whitelist</div>
                <div className="text-[10px] text-gray-500">Resident access</div>
              </Link>

              <Link
                href="/admin/settings"
                className="p-3 bg-slate-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all space-y-1 block"
              >
                <FileText size={18} className="text-slate-700" />
                <div className="text-xs font-bold text-slate-900">Settings</div>
                <div className="text-[10px] text-gray-500">Admin accounts & security</div>
              </Link>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" /> CrestFix Engine Status
            </h2>
            <div className="text-xs text-gray-600 space-y-1.5">
              <div className="flex justify-between items-center">
                <span>AI Triage Agent:</span>
                <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Operational</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Email Service (Resend):</span>
                <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Connected</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Appfolio Sync:</span>
                <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
