"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Cpu,
  FileSpreadsheet,
  MessageSquare,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { summarizeTokenUsage } from "@/lib/workorder-ai/tokenUsage";
import type { ConversationRecord } from "@/lib/workorder-ai/types";

type TokenUsageReportProps = {
  conversations: ConversationRecord[];
  onSelectConversation?: (id: string) => void;
};

type SortField = "tokens" | "messages" | "date";

export default function TokenUsageReport({ conversations, onSelectConversation }: TokenUsageReportProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("tokens");
  const [sortAsc, setSortAsc] = useState(false);

  const summary = useMemo(() => summarizeTokenUsage(conversations), [conversations]);

  const filteredConversations = useMemo(() => {
    let result = conversations.filter((c) => {
      const query = searchTerm.toLowerCase();
      return (
        (c.propertyAddress || "").toLowerCase().includes(query) ||
        (c.tenantEmail || "").toLowerCase().includes(query) ||
        (c.verdict?.issueCategory || "").toLowerCase().includes(query)
      );
    });

    result.sort((a, b) => {
      const usageA = a.tokenUsage?.totalTokens ?? 0;
      const usageB = b.tokenUsage?.totalTokens ?? 0;
      const msgsA = a.messages?.length ?? 0;
      const msgsB = b.messages?.length ?? 0;
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();

      let diff = 0;
      if (sortField === "tokens") diff = usageB - usageA;
      else if (sortField === "messages") diff = msgsB - msgsA;
      else if (sortField === "date") diff = dateB - dateA;

      return sortAsc ? -diff : diff;
    });

    return result;
  }, [conversations, searchTerm, sortField, sortAsc]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  return (
    <div className="p-6 space-y-6 text-[#191919]">
      <header className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
            <Sparkles size={16} /> Token Analytics
          </div>
          <h2 className="text-2xl font-serif font-bold mt-1">AI Chat Token Usage Report</h2>
          <p className="text-sm text-indigo-200 mt-1">
            Track input and output tokens consumed per chat session across all tenant conversations.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 text-right shrink-0">
          <span className="text-[10px] text-slate-300 uppercase tracking-wider block">Grand Total Tokens</span>
          <div className="text-3xl font-extrabold text-cyan-400 leading-none mt-1">
            {summary.grandTotalTokens.toLocaleString()}
          </div>
          <small className="text-[11px] text-slate-400 mt-1 block">{summary.conversationCount} active conversations</small>
        </div>
      </header>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Zap size={20} className="text-yellow-500" />} label="Grand Total Tokens" value={summary.grandTotalTokens.toLocaleString()} subtext="Prompt + Completion" />
        <KpiCard icon={<Cpu size={20} className="text-blue-500" />} label="Prompt (Input) Tokens" value={summary.totalInputTokens.toLocaleString()} subtext="System & context prompts" />
        <KpiCard icon={<TrendingUp size={20} className="text-emerald-500" />} label="Completion (Output)" value={summary.totalOutputTokens.toLocaleString()} subtext="Generated bot responses" />
        <KpiCard icon={<Sparkles size={20} className="text-purple-500" />} label="Avg Tokens / Chat" value={summary.avgTokensPerChat.toLocaleString()} subtext={`Across ${summary.conversationCount} chats`} />
      </div>

      {/* Highest Usage Callout */}
      {summary.highestUsageConversation && summary.highestUsageConversation.totalTokens > 0 && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Highest Consuming Chat</span>
            <div className="font-semibold text-sm text-slate-900 mt-0.5">
              {summary.highestUsageConversation.propertyAddress} ({summary.highestUsageConversation.tenantEmail})
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg">
              ⚡ {summary.highestUsageConversation.totalTokens.toLocaleString()} tokens ({summary.highestUsageConversation.inputTokens.toLocaleString()} in / {summary.highestUsageConversation.outputTokens.toLocaleString()} out)
            </span>
            {onSelectConversation && (
              <button
                type="button"
                onClick={() => onSelectConversation(summary.highestUsageConversation!.id)}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 cursor-pointer transition-all"
              >
                Inspect Chat
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table Section */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">Per-Chat Token Breakdown</h3>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenant or property..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-lg border border-gray-300 text-xs w-64 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-slate-600 font-semibold">
                <th className="p-3">Property & Tenant</th>
                <th className="p-3">Issue / Category</th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort("messages")}>
                  <div className="flex items-center gap-1">
                    <MessageSquare size={13} /> Messages <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="p-3">Input Tokens</th>
                <th className="p-3">Output Tokens</th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort("tokens")}>
                  <div className="flex items-center gap-1">
                    <Zap size={13} /> Total Tokens <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => {
                  const usage = conv.tokenUsage ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
                  return (
                    <tr key={conv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{conv.propertyAddress || "N/A"}</div>
                        <div className="text-[11px] text-slate-500">{conv.tenantEmail}</div>
                      </td>
                      <td className="p-3">
                        <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                          {conv.verdict?.issueCategory || "Triage in progress"}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{conv.messages?.length ?? 0} msgs</td>
                      <td className="p-3 text-slate-600">{usage.inputTokens.toLocaleString()}</td>
                      <td className="p-3 text-slate-600">{usage.outputTokens.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`font-bold ${usage.totalTokens > 5000 ? "text-rose-600" : usage.totalTokens > 2000 ? "text-amber-600" : "text-emerald-600"}`}>
                          {usage.totalTokens.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {onSelectConversation && (
                          <button
                            type="button"
                            onClick={() => onSelectConversation(conv.id)}
                            className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[11px] font-semibold hover:bg-indigo-100 cursor-pointer"
                          >
                            Inspect
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                    No conversations found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ icon, label, value, subtext }: { icon: React.ReactNode; label: string; value: string; subtext: string }) {
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-900 mt-1">{value}</div>
      <div className="text-[10px] text-slate-400">{subtext}</div>
    </div>
  );
}
