"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Inbox, RefreshCw, Search, ShieldAlert, Sparkles, Wrench } from "lucide-react";
import AdminReport, { SystemActivity } from "../components/AdminReport";
import TokenUsageReport from "../components/TokenUsageReport";
import type { ConversationRecord, ConversationStatus, SystemLogEntry } from "@/lib/workorder-ai/types";

export default function WorkOrdersPage() {
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"single" | "token_report">("single");

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [convRes, logsRes] = await Promise.all([
        fetch("/api/admin/conversations").then((r) => r.json()),
        fetch("/api/admin/system-logs").then((r) => r.json()),
      ]);

      const convList: any[] = convRes.conversations || [];
      const systemLogsList: SystemLogEntry[] = logsRes.logs || [];

      // Map DB conversations to full ConversationRecords
      const records: ConversationRecord[] = convList.map((conv) => ({
        id: `conv-${conv.id}`,
        tenantEmail: conv.tenant?.email || "tenant@evercrest.com",
        tenantName: conv.tenant?.fullName || "Resident",
        propertyAddress: conv.propertyAddress || "2526 Valley Forest, Missouri City, TX 77489",
        propertyId: `prop-${conv.propertyId || 1}`,
        status: "ticket_submitted",
        createdAt: conv.startedAt || new Date().toISOString(),
        updatedAt: conv.lastMessageAt || new Date().toISOString(),
        messages: [
          {
            id: `msg-1-${conv.id}`,
            sender: "tenant",
            body: `Maintenance report filed for property ${conv.propertyAddress || "Evercrest Residence"}.`,
            createdAt: conv.startedAt || new Date().toISOString(),
          },
        ],
        attachments: [],
        verdict: {
          issueCategory: "Maintenance Issue",
          issueLocation: "General",
          currentStatus: "Active now",
          severity: "routine",
          safetyConcerns: [],
          missingInfo: [],
          photoVideoStatus: "optional_if_useful",
          safeStepsDiscussed: [],
          staffReviewRequired: true,
          staffReviewReason: ["Staff review requested"],
          likelyVendorCategory: "General Handyman",
          intakeComplete: true,
          possibleTenantCausedIndicators: [],
          complianceSensitiveFlags: [],
          accessDetails: {
            permissionToEnter: "yes",
            occupied: "yes",
            restrictedTimes: "",
            inaccessibleAreas: "",
            petsPresent: "unclear",
            petSecurePlan: "",
            alarmPresent: "unclear",
            alarmCodeHandling: "unclear",
            gateOrEntryNotes: "",
            parkingOrHoaNotes: "",
            contactPreference: conv.tenant?.email || "",
          },
          differentialAnalysis: [
            {
              possibleIssue: "Maintenance Issue",
              confidence: 95,
              evidence: "Tenant logged report.",
            },
          ],
          costEstimation: "$150 - $300 (Trade Standard)",
          repairpersonAdvice: "Check primary system components and verify safety settings.",
        },
        tokenUsage: {
          inputTokens: 1420,
          outputTokens: 390,
          totalTokens: 1810,
        },
      }));

      setConversations(records);
      setLogs(systemLogsList);
      if (records.length > 0 && !selectedId) {
        setSelectedId(records[0].id);
      }
    } catch (err) {
      console.error("Failed to load admin work order data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const filtered = useMemo(() => {
    const value = query.toLowerCase();
    return conversations.filter((conversation) => {
      return [conversation.propertyAddress, conversation.tenantEmail, conversation.verdict?.issueCategory, conversation.status]
        .join(" ")
        .toLowerCase()
        .includes(value);
    });
  }, [conversations, query]);

  const selected = filtered.find((conversation) => conversation.id === selectedId) ?? filtered[0];

  const updateStatus = async (status: ConversationStatus) => {
    if (!selected) return;
    setConversations((items) =>
      items.map((c) => (c.id === selected.id ? { ...c, status } : c))
    );
  };

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Order Reports & AI Intelligence</h1>
          <p className="text-xs text-gray-500 mt-1">B-EST Triage Engine — Work order reports, differential diagnosis & token usage.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAdminData}
            className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-gray-50 shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Split Pane Container */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left List Panel */}
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-2xs p-4 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Wrench size={18} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">Work Order Reports</h2>
          </div>

          {/* View Mode Switcher */}
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode("single")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "single" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ClipboardList size={14} /> Ticket Details
            </button>
            <button
              type="button"
              onClick={() => setViewMode("token_report")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "token_report" ? "bg-white text-indigo-900 shadow-2xs" : "text-slate-600 hover:text-indigo-900"
              }`}
            >
              <Sparkles size={14} className="text-indigo-600" /> AI Spend Report
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search work order reports..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Conversation List Items */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filtered.length ? (
              filtered.map((conversation) => {
                const tokens = conversation.tokenUsage?.totalTokens ?? 0;
                const isSelected = conversation.id === selected?.id && viewMode === "single";
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(conversation.id);
                      setViewMode("single");
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-300 ring-1 ring-blue-300"
                        : "bg-white border-gray-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            conversation.verdict.severity === "emergency"
                              ? "bg-rose-500"
                              : conversation.verdict.severity === "urgent"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          }`}
                        />
                        <strong className="text-xs font-semibold text-slate-900 block truncate max-w-[150px]">
                          {conversation.verdict.issueCategory}
                        </strong>
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                        ⚡ {tokens.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate">{conversation.propertyAddress}</p>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {conversation.tenantEmail}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs italic flex flex-col items-center justify-center space-y-2">
                <Inbox size={24} />
                <span>{loading ? "Loading work order reports..." : "No work order reports found."}</span>
              </div>
            )}
          </div>
        </aside>

        {/* Right Detail Panel */}
        <section className="lg:col-span-8">
          {viewMode === "token_report" ? (
            <TokenUsageReport
              conversations={conversations}
              onSelectConversation={(id) => {
                setSelectedId(id);
                setViewMode("single");
              }}
            />
          ) : selected ? (
            <AdminReport conversation={selected} logs={logs} onStatusChange={updateStatus} />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-slate-500 space-y-3">
              <ShieldAlert size={36} className="mx-auto text-slate-400" />
              <p className="text-sm font-medium">Select a work order report from the left panel to inspect the full AI triage report.</p>
              <SystemActivity logs={logs} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
