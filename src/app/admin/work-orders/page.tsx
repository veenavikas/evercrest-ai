"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  ClipboardList, 
  Inbox, 
  RefreshCw, 
  Search, 
  ShieldAlert, 
  Sparkles, 
  Wrench, 
  Clock, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from "lucide-react";
import AdminReport, { SystemActivity } from "../components/AdminReport";
import TokenUsageReport from "../components/TokenUsageReport";
import { BENCHMARK_CONVERSATIONS } from "@/lib/workorder-ai/benchmarkData";
import type { ConversationRecord, ConversationStatus, SystemLogEntry } from "@/lib/workorder-ai/types";

// SLA Helper Calculation Engine
export function calculateSlaStatus(createdAtStr: string, severity: string, status: string) {
  const createdMs = new Date(createdAtStr).getTime();
  let windowHours = 48; // default medium

  const sevLower = (severity || "").toLowerCase();
  if (sevLower.includes("emergency") || sevLower.includes("hazard")) {
    windowHours = 4;
  } else if (sevLower.includes("urgent") || sevLower.includes("high")) {
    windowHours = 24;
  } else if (sevLower.includes("low") || sevLower.includes("cosmetic")) {
    windowHours = 72;
  }

  const dueMs = createdMs + windowHours * 60 * 60 * 1000;
  const dueDate = new Date(dueMs);
  const nowMs = Date.now();

  const isClosed = status === "resolved" || status === "closed";

  if (isClosed) {
    return {
      dueText: dueDate.toLocaleTimeString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      status: "completed",
      badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
      label: "Resolved",
    };
  }

  const hoursRemaining = (dueMs - nowMs) / (1000 * 60 * 60);

  const warningThresholdHours = Math.min(6, windowHours * 0.25);

  if (hoursRemaining < 0) {
    return {
      dueText: dueDate.toLocaleTimeString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      status: "breached",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      label: `SLA Breached (${Math.abs(Math.round(hoursRemaining))}h ago)`,
    };
  } else if (hoursRemaining < warningThresholdHours) {
    return {
      dueText: dueDate.toLocaleTimeString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      status: "approaching",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      label: `Due in ${Math.round(hoursRemaining)}h`,
    };
  } else {
    return {
      dueText: dueDate.toLocaleTimeString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      status: "on_time",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      label: `On Time (Due ${dueDate.toLocaleDateString([], { month: "short", day: "numeric" })})`,
    };
  }
}

export default function WorkOrdersPage() {
  const [conversations, setConversations] = useState<ConversationRecord[]>(BENCHMARK_CONVERSATIONS);
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("conv-1");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"single" | "token_report">("single");

  // Sorting & Pagination States
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "priority">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [convRes, logsRes] = await Promise.all([
        fetch("/api/admin/conversations").then((r) => r.json()),
        fetch("/api/admin/system-logs").then((r) => r.json()),
      ]);

      const convList: any[] = convRes.conversations || [];
      const systemLogsList: SystemLogEntry[] = logsRes.logs || [];

      // Map DB conversations
      const dbRecords: ConversationRecord[] = convList.map((conv) => ({
        id: `conv-db-${conv.id}`,
        tenantEmail: conv.tenant?.email || "tenant@crestfix.com",
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
            body: `Maintenance report filed for property ${conv.propertyAddress || "CrestFix Residence"}.`,
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

      // Combine benchmark conversation set with DB records
      const combined = [...BENCHMARK_CONVERSATIONS, ...dbRecords];
      setConversations(combined);
      setLogs(systemLogsList);
      if (combined.length > 0 && !selectedId) {
        setSelectedId(combined[0].id);
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

  const filteredAndSorted = useMemo(() => {
    const value = query.toLowerCase();
    let result = conversations.filter((conversation) => {
      return [conversation.propertyAddress, conversation.tenantEmail, conversation.verdict?.issueCategory, conversation.status]
        .join(" ")
        .toLowerCase()
        .includes(value);
    });

    // Sorting logic (Tests #20, #21)
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "priority") {
        const priorityWeight = (sev: string) => {
          const s = (sev || "").toLowerCase();
          if (s.includes("emergency")) return 4;
          if (s.includes("urgent") || s.includes("high")) return 3;
          if (s.includes("routine") || s.includes("medium")) return 2;
          return 1;
        };
        return priorityWeight(b.verdict.severity) - priorityWeight(a.verdict.severity);
      }
      return 0;
    });

    return result;
  }, [conversations, query, sortBy]);

  // Pagination Logic (Test #19)
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const paginatedConversations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const selected = filteredAndSorted.find((conversation) => conversation.id === selectedId) ?? filteredAndSorted[0];

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
          <h1 className="text-2xl font-bold text-gray-900">Work Order Reports & SLA Intelligence</h1>
          <p className="text-xs text-gray-500 mt-1">CrestFix Triage Engine — Work order reports, calculated SLA due dates & token usage.</p>
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
            <h2 className="text-sm font-semibold text-slate-900">Work Order Reports ({filteredAndSorted.length})</h2>
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

          {/* Search & Sort Controls (Tests #20, #21) */}
          <div className="space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search work order reports..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-gray-200 text-gray-600 w-full">
                <ArrowUpDown size={13} className="text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-semibold focus:outline-none w-full cursor-pointer"
                >
                  <option value="newest">Sort: Date (Newest First)</option>
                  <option value="oldest">Sort: Date (Oldest First)</option>
                  <option value="priority">Sort: Priority (Emergency → Low)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Conversation List Items */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {paginatedConversations.length ? (
              paginatedConversations.map((conversation) => {
                const tokens = conversation.tokenUsage?.totalTokens ?? 0;
                const isSelected = conversation.id === selected?.id && viewMode === "single";
                const sla = calculateSlaStatus(conversation.createdAt, conversation.verdict.severity, conversation.status);

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(conversation.id);
                      setViewMode("single");
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
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
                        <strong className="text-xs font-semibold text-slate-900 block truncate max-w-[140px]">
                          {conversation.verdict.issueCategory}
                        </strong>
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                        ⚡ {tokens.toLocaleString()}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 truncate">{conversation.propertyAddress}</p>

                    {/* SLA Badge Display (Test #8 Fix) */}
                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-gray-100">
                      <span className={`px-2 py-0.5 rounded border font-semibold ${sla.badgeClass}`}>
                        🕒 {sla.label}
                      </span>
                      <span className="text-gray-400 font-mono text-[10px]">
                        {new Date(conversation.createdAt).toLocaleDateString([], { month: "numeric", day: "numeric" })}
                      </span>
                    </div>
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

          {/* Pagination Controls Footer (Test #19 Fix) */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-[11px]">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
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
            <div className="space-y-4">
              {/* SLA Target Banner Card */}
              {(() => {
                const sla = calculateSlaStatus(selected.createdAt, selected.verdict.severity, selected.status);
                return (
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        <Clock size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">SLA Resolution Target: {sla.dueText}</div>
                        <div className="text-[11px] text-gray-500">Calculated SLA window based on ticket priority ({selected.verdict.severity}).</div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${sla.badgeClass}`}>
                      {sla.label}
                    </span>
                  </div>
                );
              })()}
              <AdminReport conversation={selected} logs={logs} onStatusChange={updateStatus} />
            </div>
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
