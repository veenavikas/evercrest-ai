"use client";

import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  History,
  KeyRound,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
  Zap,
} from "lucide-react";
import { getSimilarCaseCitations } from "@/lib/workorder-ai/cases";
import type { ConversationRecord, ConversationStatus, SystemLogEntry } from "@/lib/workorder-ai/types";

type AdminReportProps = {
  conversation: ConversationRecord;
  logs?: SystemLogEntry[];
  onStatusChange?: (status: ConversationStatus) => Promise<void>;
};

export default function AdminReport({ conversation, logs = [], onStatusChange }: AdminReportProps) {
  const { verdict } = conversation;
  const similarCases = getSimilarCaseCitations(conversation, 5);
  const tenantMessages = conversation.messages.filter((message) => message.sender === "tenant");
  const reportLogs = logs.filter((entry) => entry.conversationId === conversation.id);
  const access = verdict.accessDetails;

  const usage = conversation.tokenUsage ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 space-y-6 text-[#191919]">
      <header className={`p-5 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
        verdict.severity === "emergency"
          ? "bg-rose-50 border-rose-200 text-rose-900"
          : verdict.severity === "urgent"
          ? "bg-amber-50 border-amber-200 text-amber-900"
          : "bg-blue-50 border-blue-200 text-blue-900"
      }`}>
        <div>
          <div className="flex items-center gap-2 text-xs uppercase font-semibold tracking-wider opacity-80">
            <span className="px-2 py-0.5 rounded-full bg-white/80 border text-[10px]">
              {formatLabel(verdict.severity)}
            </span>
            <span>Maintenance intelligence report</span>
          </div>
          <h2 className="text-xl font-serif font-semibold mt-1">{verdict.issueCategory}</h2>
          <div className="flex items-center gap-1.5 text-xs mt-1 opacity-90">
            <MapPin size={14} /> {conversation.propertyAddress} / {verdict.issueLocation}
          </div>
        </div>
        {onStatusChange && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onStatusChange("reviewed")}
              className="px-3.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCircle2 size={15} className="text-emerald-600" /> Reviewed
            </button>
            <button
              type="button"
              onClick={() => onStatusChange("closed")}
              className="px-3.5 py-1.5 bg-[#191919] text-white rounded-lg text-xs font-medium hover:bg-gray-800 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Wrench size={15} /> Close
            </button>
          </div>
        )}
      </header>

      {/* Executive Brief */}
      <section className="p-5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Executive brief</p>
          <h3 className="text-lg font-serif font-normal mt-1 text-slate-100">{buildExecutiveSummary(conversation)}</h3>
          <p className="text-xs text-slate-300 mt-1">
            {verdict.staffReviewRequired ? "Staff review is recommended before routing or scheduling." : "The report is ready for standard maintenance routing."}
          </p>
        </div>
        <div className="text-right shrink-0 bg-white/10 p-3 rounded-lg border border-white/15 backdrop-blur-xs">
          <span className="text-[10px] text-slate-300 uppercase tracking-wider block">Ticket Status</span>
          <strong className="text-sm font-semibold text-emerald-400 block mt-0.5">{conversationStatusLabel(conversation.status)}</strong>
          <small className="text-[10px] text-slate-400 block mt-0.5">Updated {formatDate(conversation.updatedAt)}</small>
        </div>
      </section>

      {/* Metric Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-label="Report summary metrics">
        <ReportMetric icon={<AlertTriangle size={18} className="text-amber-500" />} label="Priority" value={formatLabel(verdict.severity)} tone={verdict.severity} />
        <ReportMetric icon={<Wrench size={18} className="text-blue-500" />} label="Recommended trade" value={verdict.likelyVendorCategory || "Staff triage"} />
        <ReportMetric icon={<Camera size={18} className="text-indigo-500" />} label="Visual evidence" value={`${conversation.attachments.length} attachment${conversation.attachments.length === 1 ? "" : "s"}`} />
        <ReportMetric
          icon={<Sparkles size={18} className="text-purple-500" />}
          label="AI Token Usage"
          value={`${usage.totalTokens.toLocaleString()} tokens`}
          subtext={`${usage.inputTokens.toLocaleString()} in / ${usage.outputTokens.toLocaleString()} out`}
        />
      </section>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <ReportSection icon={<ClipboardCheck size={18} />} eyebrow="Issue evidence" title="What the tenant reported">
            <div className="space-y-3 mt-3">
              {tenantMessages.length ? tenantMessages.map((message) => (
                <blockquote key={message.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-sm">
                  <p className="text-slate-800">{message.body}</p>
                  <footer className="text-[11px] text-slate-400 mt-1.5">{formatDate(message.createdAt)}</footer>
                </blockquote>
              )) : <p className="text-xs text-gray-400 italic">No tenant messages were recorded.</p>}
            </div>
          </ReportSection>

          {conversation.attachments.length ? (
            <ReportSection icon={<Camera size={18} />} eyebrow="Visual evidence" title="Attachments and AI observations">
              <div className="grid sm:grid-cols-2 gap-4 mt-3">
                {conversation.attachments.map((attachment) => (
                  <article key={attachment.id} className="p-3 rounded-xl border border-gray-200 bg-slate-50 space-y-2">
                    {attachment.dataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={attachment.dataUrl} alt={attachment.name} className="w-full h-36 object-cover rounded-lg border" />
                    ) : null}
                    <div>
                      <strong className="text-xs font-semibold block text-slate-900">{attachment.name}</strong>
                      <p className="text-xs text-slate-600 mt-1">{attachment.aiNotes}</p>
                      {attachment.sizeBytes ? <small className="text-[10px] text-gray-400 block mt-1">{formatFileSize(attachment.sizeBytes)}</small> : null}
                    </div>
                  </article>
                ))}
              </div>
            </ReportSection>
          ) : null}

          <ReportSection icon={<Sparkles size={18} />} eyebrow="AI assessment" title="Differential analysis">
            {verdict.differentialAnalysis && verdict.differentialAnalysis.length ? (
              <div className="space-y-3 mt-3">
                {verdict.differentialAnalysis.map((item) => (
                  <article key={item.possibleIssue} className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-900">
                      <span>{item.possibleIssue}</span>
                      <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{Math.round(item.confidence)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.max(0, Math.min(100, item.confidence))}%` }} />
                    </div>
                    <p className="text-xs text-slate-600">{item.evidence}</p>
                  </article>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400 italic mt-2">No differential analysis is available yet.</p>}
          </ReportSection>

          <ReportSection icon={<History size={18} />} eyebrow="Historical evidence" title="Similar work orders">
            <p className="text-xs text-slate-500 mt-1 mb-3">Sanitized historical matches are ranked from the local case index. Use them as routing context.</p>
            {similarCases.length ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {similarCases.map((item) => (
                  <article key={`${item.sourceFile}:${item.sourceRow}:${item.workOrderNumber}`} className="p-3.5 rounded-xl border border-gray-200 bg-slate-50/50 space-y-2 text-xs">
                    <header className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">WO {item.workOrderNumber || "unknown"}</span>
                        <strong className="text-slate-900 text-xs block mt-0.5">{item.issueCategory}</strong>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-gray-200 text-gray-700">{item.normalizedUrgency}</span>
                    </header>
                    <p className="text-slate-600">{item.symptomSummary}</p>
                    <div className="text-[11px] text-blue-700 font-medium bg-blue-50/70 p-2 rounded-lg">{item.whySimilar}</div>
                  </article>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400 italic">No sufficiently similar historical cases were found.</p>}
          </ReportSection>
        </div>

        {/* Side Column */}
        <aside className="space-y-6">
          <ReportSection icon={<Zap size={18} />} eyebrow="AI Usage" title="Chat Token Consumption" compact>
            <dl className="space-y-1.5 text-xs mt-2">
              <div className="flex justify-between border-b py-1 text-slate-600"><dt>Prompt (Input)</dt><dd className="font-semibold text-slate-800">{usage.inputTokens.toLocaleString()} tokens</dd></div>
              <div className="flex justify-between border-b py-1 text-slate-600"><dt>Completion (Output)</dt><dd className="font-semibold text-slate-800">{usage.outputTokens.toLocaleString()} tokens</dd></div>
              <div className="flex justify-between py-1 text-slate-900"><dt className="font-semibold">Total Tokens</dt><dd className="font-bold text-blue-600">{usage.totalTokens.toLocaleString()} tokens</dd></div>
            </dl>
          </ReportSection>

          <ReportSection icon={<Wrench size={18} />} eyebrow="Recommended action" title="Routing guidance" compact>
            <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl my-2">
              <span className="text-[10px] uppercase tracking-wider text-blue-700 font-medium block">Likely vendor</span>
              <strong className="text-sm font-semibold text-blue-900 block mt-0.5">{verdict.likelyVendorCategory || "Staff triage"}</strong>
            </div>
            <ReportList items={verdict.staffReviewReason} empty="Standard review; no special routing reason recorded." />
            {verdict.repairpersonAdvice ? <p className="text-xs bg-gray-50 p-2.5 rounded-lg border text-slate-700 mt-2"><strong>Technician note:</strong> {verdict.repairpersonAdvice}</p> : null}
            {verdict.costEstimation ? <p className="text-xs bg-gray-50 p-2.5 rounded-lg border text-slate-700 mt-2"><strong>Planning range:</strong> {verdict.costEstimation}</p> : null}
          </ReportSection>

          <ReportSection icon={<ShieldCheck size={18} />} eyebrow="Risk review" title="Safety and compliance" compact>
            <ReportList items={[...verdict.safetyConcerns, ...verdict.complianceSensitiveFlags]} empty="No safety or compliance flags recorded." />
          </ReportSection>

          <ReportSection icon={<UserRound size={18} />} eyebrow="Resident" title="Tenant and property" compact>
            <dl className="space-y-1 text-xs mt-2 text-slate-600">
              <div className="flex justify-between border-b py-1"><dt>Tenant</dt><dd className="font-medium text-slate-900">{conversation.tenantName ?? "Tenant on file"}</dd></div>
              <div className="flex justify-between border-b py-1"><dt>Email</dt><dd className="font-mono text-slate-800 text-[11px]">{conversation.tenantEmail}</dd></div>
              <div className="flex justify-between py-1"><dt>Address</dt><dd className="font-medium text-slate-900 text-right">{conversation.propertyAddress}</dd></div>
            </dl>
          </ReportSection>

          <ReportSection icon={<KeyRound size={18} />} eyebrow="Dispatch readiness" title="Access details" compact>
            <dl className="space-y-1 text-xs mt-2 text-slate-600">
              <div className="flex justify-between border-b py-1"><dt>Permission to enter</dt><dd className="font-medium text-slate-900">{formatLabel(access?.permissionToEnter || "unclear")}</dd></div>
              <div className="flex justify-between border-b py-1"><dt>Occupied</dt><dd className="font-medium text-slate-900">{formatLabel(access?.occupied || "unclear")}</dd></div>
              <div className="flex justify-between border-b py-1"><dt>Pets</dt><dd className="font-medium text-slate-900">{formatLabel(access?.petsPresent || "unclear")}</dd></div>
              <div className="flex justify-between py-1"><dt>Restricted times</dt><dd className="font-medium text-slate-900">{access?.restrictedTimes || "None"}</dd></div>
            </dl>
          </ReportSection>

          <ReportSection icon={<PhoneCall size={18} />} eyebrow="Open items" title="Missing information" compact>
            <ReportList items={verdict.missingInfo} empty="Core intake information is complete." />
          </ReportSection>
        </aside>
      </div>

      <details className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs cursor-pointer">
        <summary className="font-medium flex items-center gap-2"><FileText size={15} /> Raw staff handoff email report</summary>
        <pre className="mt-3 p-4 bg-slate-950 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {conversation.staffEmail?.body ?? "No staff handoff email has been generated yet."}
        </pre>
      </details>

      <SystemActivity logs={reportLogs} />
    </div>
  );
}

export function SystemActivity({ logs }: { logs: SystemLogEntry[] }) {
  return (
    <details className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs cursor-pointer mt-4">
      <summary className="font-medium flex items-center gap-2">
        <Activity size={16} /> System Activity / {logs.length} event{logs.length === 1 ? "" : "s"}
      </summary>
      <div className="mt-3 space-y-2">
        {logs.length ? (
          logs.map((entry) => (
            <article key={entry.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <strong className="text-slate-200">{entry.event}</strong>
                <span>{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-slate-300">{entry.message}</p>
              {entry.details ? (
                <pre className="text-[10px] font-mono text-slate-500 bg-slate-900 p-2 rounded overflow-x-auto">
                  {JSON.stringify(entry.details, null, 2)}
                </pre>
              ) : null}
            </article>
          ))
        ) : (
          <p className="text-slate-500 italic">No system activity recorded yet.</p>
        )}
      </div>
    </details>
  );
}

function ReportMetric({ icon, label, value, subtext, tone }: { icon: React.ReactNode; label: string; value: string; subtext?: string; tone?: string }) {
  return (
    <article className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs space-y-1">
      <div className="mb-1">{icon}</div>
      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium block">{label}</span>
      <strong className="text-sm font-semibold text-slate-900 block">{value}</strong>
      {subtext ? <small className="text-[10px] text-slate-500 block">{subtext}</small> : null}
    </article>
  );
}

function ReportSection({ icon, eyebrow, title, compact = false, children }: { icon: React.ReactNode; eyebrow: string; title: string; compact?: boolean; children: React.ReactNode }) {
  return (
    <section className={`p-4 rounded-xl border border-gray-200 bg-white ${compact ? "" : "p-5"}`}>
      <header className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
        <div className="p-2 rounded-lg bg-slate-100 text-slate-700">{icon}</div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium block">{eyebrow}</span>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
      </header>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ReportList({ items, empty = "" }: { items: string[]; empty?: string }) {
  const values = Array.from(new Set(items.filter(Boolean)));
  if (!values.length) return empty ? <p className="text-xs text-slate-400 italic mt-1">{empty}</p> : null;
  return (
    <ul className="space-y-1 text-xs text-slate-700 mt-2 list-disc list-inside">
      {values.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function buildExecutiveSummary(conversation: ConversationRecord) {
  const { verdict } = conversation;
  const status = verdict.currentStatus && verdict.currentStatus !== "Unknown" ? ` It is reported as ${verdict.currentStatus.toLowerCase()}.` : "";
  return `${verdict.issueCategory} reported in ${verdict.issueLocation || "an unspecified area"}.${status}`;
}

function conversationStatusLabel(status: ConversationStatus) {
  if (status === "ticket_submitted" || status === "email_sent") return "Ticket submitted";
  if (status === "needs_more_info") return "Intake in progress";
  return formatLabel(status);
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
