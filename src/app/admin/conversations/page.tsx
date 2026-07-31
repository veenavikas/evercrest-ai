"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Sparkles, ArrowLeft, RefreshCw } from "lucide-react";
import AdminReport from "../components/AdminReport";
import TokenUsageReport from "../components/TokenUsageReport";
import type { ConversationRecord } from "@/lib/workorder-ai/types";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");
  const [selectedRecord, setSelectedRecord] = useState<ConversationRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);

  const fetchConversations = () => {
    setLoading(true);
    fetch("/api/admin/conversations")
      .then((res) => res.json())
      .then((d) => {
        if (d.conversations) setConversations(d.conversations);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load conversations:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const inspectConversation = (id: string | number) => {
    const numericId = typeof id === "string" ? id.replace(/\D/g, "") || id : id;
    setRecordLoading(true);
    fetch(`/api/admin/conversations/${numericId}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.conversation) {
          setSelectedRecord(d.conversation);
        }
        setRecordLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch conversation detail:", err);
        setRecordLoading(false);
      });
  };

  const handleStatusChange = async (status: string) => {
    if (selectedRecord) {
      setSelectedRecord({
        ...selectedRecord,
        status: status as any,
      });
    }
  };

  const mockRecordsForAnalytics: ConversationRecord[] = conversations.map((conv) => ({
    id: `conv-${conv.id}`,
    tenantEmail: conv.tenant?.email || "tenant@evercrest.com",
    tenantName: conv.tenant?.fullName || "Tenant",
    propertyAddress: "2526 Valley Forest, Missouri City, TX 77489",
    propertyId: "P141",
    status: "ticket_submitted",
    createdAt: conv.startedAt,
    updatedAt: conv.lastMessageAt,
    messages: [],
    attachments: [],
    verdict: {
      issueCategory: "Maintenance Issue",
      issueLocation: "General",
      currentStatus: "Active",
      severity: "routine",
      safetyConcerns: [],
      missingInfo: [],
      photoVideoStatus: "optional_if_useful",
      safeStepsDiscussed: [],
      staffReviewRequired: false,
      staffReviewReason: [],
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
      differentialAnalysis: [],
      costEstimation: "",
      repairpersonAdvice: "",
    },
    tokenUsage: {
      inputTokens: 1450,
      outputTokens: 380,
      totalTokens: 1830,
    },
  }));

  if (recordLoading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Generating AI Maintenance Intelligence Report...</p>
      </div>
    );
  }

  if (selectedRecord) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedRecord(null)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-gray-200 px-3.5 py-2 rounded-xl shadow-2xs hover:bg-gray-50 transition-all cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Conversations
        </button>
        <AdminReport conversation={selectedRecord} onStatusChange={handleStatusChange} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Order Conversations</h1>
          <p className="text-xs text-gray-500 mt-1">AI-assisted maintenance triage and tenant conversation audit log.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "list" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Conversations List
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "analytics" ? "bg-white text-indigo-900 shadow-2xs" : "text-slate-600 hover:text-indigo-900"
            }`}
          >
            <Sparkles size={14} className="text-indigo-600" /> Token Analytics
          </button>
        </div>
      </div>

      {activeTab === "analytics" ? (
        <TokenUsageReport conversations={mockRecordsForAnalytics} onSelectConversation={inspectConversation} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-3.5">Tenant</th>
                <th className="px-6 py-3.5">Started</th>
                <th className="px-6 py-3.5">Last Message</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Loading conversations...
                  </td>
                </tr>
              ) : conversations.length > 0 ? (
                conversations.map((conv) => (
                  <tr key={conv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{conv.tenant?.fullName || "Evercrest Resident"}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{conv.tenant?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(conv.startedAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(conv.lastMessageAt).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${conv.isArchived ? "bg-gray-100 text-gray-700" : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"}`}>
                        {conv.isArchived ? "Archived" : "Active Triage"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => inspectConversation(conv.id)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-medium hover:bg-blue-100 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageSquare size={14} /> Inspect Report
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                    No active conversations recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
