"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Send,
  CheckCircle2,
  Building,
  Wrench,
  Bell,
  Calendar,
  LogOut,
  Sparkles,
  Phone,
  ShieldCheck,
  AlertTriangle,
  Clock,
  User,
  ChevronRight,
  MessageSquare,
  Droplets,
  ThermometerSnowflake,
  KeyRound,
  Zap,
  Tv,
  RefreshCw
} from "lucide-react";

type Message = {
  id: number;
  sender: "tenant" | "assistant";
  content: string;
};

type Draft = {
  category: string;
  urgency: string;
  unitNumber: string;
  description: string;
  readyToSubmit: boolean;
};

type UserProfile = {
  id: number;
  email: string;
  fullName: string;
  propertyCode?: string | null;
  property?: {
    id: number;
    name: string;
    code?: string | null;
    addressLine1: string;
    city: string;
    state: string;
    postalCode?: string | null;
    description?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
  } | null;
};

const ISSUE_SUGGESTIONS = [
  { label: "Water Leak / Plumbing", icon: Droplets, prompt: "I have a water leak under the sink that needs fixing." },
  { label: "AC / HVAC Problem", icon: ThermometerSnowflake, prompt: "My AC isn't cooling properly and room is warm." },
  { label: "Lock & Key Issue", icon: KeyRound, prompt: "My front door lock is sticking and difficult to open." },
  { label: "Power & Electrical", icon: Zap, prompt: "Several electrical outlets stopped working in the kitchen." },
  { label: "Appliance Repair", icon: Tv, prompt: "The dishwasher is making a loud noise and not draining." },
];

export default function ChatPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"chat" | "tickets" | "announcements" | "amenities">("chat");

  const [messages, setMessages] = useState<Message[]>([
    { id: 0, sender: "assistant", content: "Hello! I am your 24/7 CrestFix Maintenance Assistant. What issue can I help you resolve today?" }
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedWO, setSubmittedWO] = useState<string | null>(null);

  // User Profile & Interconnected Data State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, draft, loading]);

  const loadResidentData = async () => {
    setIsRefreshing(true);
    try {
      const [meRes, woRes, annRes] = await Promise.all([
        fetch("/api/auth/me").then((r) => r.json()),
        fetch("/api/work-orders").then((r) => (r.ok ? r.json() : { workOrders: [] })),
        fetch("/api/announcements").then((r) => (r.ok ? r.json() : { announcements: [] })),
      ]);

      if (meRes.user) setProfile(meRes.user);
      if (woRes.workOrders) setWorkOrders(woRes.workOrders);
      if (annRes.announcements) setAnnouncements(annRes.announcements);
    } catch (err) {
      console.error("Failed to load resident workspace data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadResidentData();
  }, []);

  const sendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || loading || submittedWO) return;

    const userMsg: Message = { id: Date.now(), sender: "tenant", content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: userMsg.content }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.workOrderDraft) setDraft(data.workOrderDraft);

      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: "assistant", content: data.reply }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "assistant", content: "Sorry, I encountered a temporary connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const confirmWorkOrder = async () => {
    if (!draft || !conversationId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, draft }),
      });

      const data = await res.json();
      if (data.workOrder) {
        setSubmittedWO(data.message);
        setDraft(null);
        // Refresh work orders list live
        loadResidentData();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const contactPhone = profile?.property?.contactPhone || "(800) 555-0199";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#191919] flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* ═══════════════════════════════════════════════════════════════
          HEADER BAR — Official Brand SVG Logo & Clean Navigation
      ═══════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Official Geometric CrestFix Mark */}
            <div className="w-8 h-8 rounded-lg bg-[#191919] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 256 256" fill="currentColor" className="w-4 h-4 text-white">
                <path d="M 144 256 L 27.598 256 L 144 139.598 Z" />
                <path d="M 256 207.5 L 200 256 L 200 56 L 0 56 L 48 0 L 256 0 Z" />
                <path d="M 0 204.402 L 0 112 L 92.402 112 Z" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-[#191919] flex items-center gap-1.5">
                CrestFix <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-medium border border-slate-200">Resident</span>
              </span>
            </div>
          </Link>

          {profile?.property && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
              <Building size={13} className="text-slate-500" />
              <span className="font-medium text-slate-900 truncate max-w-[220px]">{profile.property.addressLine1}</span>
              {profile.propertyCode && (
                <span className="font-mono font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded text-[10px]">
                  {profile.propertyCode}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Data Sync Button */}
          <button
            onClick={loadResidentData}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Refresh Live Data"
          >
            <RefreshCw size={15} className={isRefreshing ? "animate-spin text-slate-900" : ""} />
          </button>

          {/* Quick Action Badges */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setActiveTab("tickets")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === "tickets" ? "bg-[#191919] text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Wrench size={14} />
              Tickets ({workOrders.length})
            </button>
            <button
              onClick={() => setActiveTab("announcements")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === "announcements" ? "bg-[#191919] text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Bell size={14} />
              Notices ({announcements.length})
            </button>
          </div>

          {/* User Sign Out */}
          <button
            onClick={handleSignOut}
            className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Sign Out"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN RESPONSIVE WORKSPACE (Light Theme matching Landing & Admin)
      ═══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          
          {/* ───────────────────────────────────────────────────────────
              LEFT SIDEBAR — Navigation & Resident Profile (3-Cols on Desktop)
          ─────────────────────────────────────────────────────────── */}
          <aside className="hidden lg:flex lg:col-span-3 flex-col gap-4 sticky top-24">
            {/* Resident Profile Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#191919] flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : <User size={18} />}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-slate-900 truncate text-sm">{profile?.fullName || "Valued Resident"}</h3>
                  <p className="text-xs text-slate-500 truncate">{profile?.email || "Resident Account"}</p>
                </div>
              </div>

              {profile?.property ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-medium">Home Address</span>
                    <span className="font-mono bg-slate-900 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">
                      {profile.propertyCode || profile.property.code || "HOME"}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 leading-tight">{profile.property.addressLine1}</p>
                  <p className="text-slate-500">{profile.property.city}, {profile.property.state}</p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
                  <span>Whitelisted Resident Access</span>
                </div>
              )}
            </div>

            {/* Sidebar Navigation */}
            <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm space-y-1">
              <button
                onClick={() => setActiveTab("chat")}
                className={`w-full px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center justify-between transition-all ${
                  activeTab === "chat"
                    ? "bg-[#191919] text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare size={18} />
                  <span>AI Maintenance Chat</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </button>

              <button
                onClick={() => setActiveTab("tickets")}
                className={`w-full px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center justify-between transition-all ${
                  activeTab === "tickets"
                    ? "bg-[#191919] text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Wrench size={18} />
                  <span>My Work Orders</span>
                </div>
                <span className="bg-slate-100 text-slate-900 text-xs px-2 py-0.5 rounded-full font-bold">
                  {workOrders.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("announcements")}
                className={`w-full px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center justify-between transition-all ${
                  activeTab === "announcements"
                    ? "bg-[#191919] text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bell size={18} />
                  <span>Notices & Broadcasts</span>
                </div>
                <span className="bg-slate-100 text-slate-900 text-xs px-2 py-0.5 rounded-full font-bold">
                  {announcements.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("amenities")}
                className={`w-full px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center justify-between transition-all ${
                  activeTab === "amenities"
                    ? "bg-[#191919] text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Calendar size={18} />
                  <span>Amenities & Services</span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>
            </div>

            {/* Admin Interconnected Emergency Hotline Card */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-amber-900 mb-1">
                <AlertTriangle size={16} className="text-amber-600" />
                <span>24/7 Emergency Dispatch</span>
              </div>
              <p className="text-amber-800 mb-3 leading-relaxed">
                For active water leaks, gas issues, or lockouts, call our emergency team directly.
              </p>
              <a
                href={`tel:${contactPhone}`}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Phone size={14} />
                Call {contactPhone}
              </a>
            </div>
          </aside>

          {/* ───────────────────────────────────────────────────────────
              CENTER WORKSPACE — AI Chat / Active Tab Content (6-7 Cols)
          ─────────────────────────────────────────────────────────── */}
          <section className="col-span-1 lg:col-span-6 flex flex-col h-[calc(100vh-140px)] min-h-[560px] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            
            {/* CHAT TAB CONTENT */}
            {activeTab === "chat" && (
              <div className="flex flex-col h-full">
                {/* Chat Header */}
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <div>
                      <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        Maintenance AI Assistant
                        <Sparkles size={14} className="text-indigo-600" />
                      </h2>
                      <p className="text-[11px] text-slate-500">Describe any maintenance issue — AI generates a work order in seconds.</p>
                    </div>
                  </div>
                  {submittedWO && (
                    <button
                      onClick={() => {
                        setSubmittedWO(null);
                        setDraft(null);
                        setMessages([
                          { id: Date.now(), sender: "assistant", content: "How else can I assist with your home maintenance today?" },
                        ]);
                      }}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3 py-1 rounded-lg transition-colors font-medium"
                    >
                      New Request
                    </button>
                  )}
                </div>

                {/* Quick Issue Suggestion Chips */}
                <div className="px-4 py-2 bg-slate-100/60 border-b border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0">Quick Options:</span>
                  {ISSUE_SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(item.prompt)}
                      disabled={loading || !!submittedWO}
                      className="shrink-0 text-xs bg-white hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 font-medium"
                    >
                      <item.icon size={13} className="text-indigo-600" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* Message Log Container */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/40">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === "tenant" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.sender === "tenant"
                            ? "bg-[#191919] text-white rounded-br-none shadow-sm"
                            : "bg-white border border-slate-200 text-slate-900 rounded-bl-none shadow-2xs"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {loading && !draft && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs text-slate-600 italic flex items-center gap-2 shadow-2xs">
                        <Sparkles size={14} className="animate-spin text-indigo-600" />
                        AI is diagnosing issue & preparing work order draft...
                      </div>
                    </div>
                  )}

                  {/* Interactive Work Order Draft Confirmation Card */}
                  {draft && draft.readyToSubmit && !submittedWO && (
                    <div className="bg-gradient-to-br from-indigo-50/90 to-blue-50/60 border border-indigo-200 rounded-2xl p-4 sm:p-5 my-3 shadow-md">
                      <div className="flex items-center justify-between mb-3 border-b border-indigo-200 pb-2.5">
                        <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                          <CheckCircle2 size={18} className="text-indigo-600" />
                          <span>Ready to Submit Work Order?</span>
                        </div>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                          CONFIRMED DRAFT
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                        <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                          <span className="text-slate-500 block text-[10px] font-medium">CATEGORY</span>
                          <span className="font-bold text-slate-900 capitalize">{draft.category}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                          <span className="text-slate-500 block text-[10px] font-medium">URGENCY</span>
                          <span className="font-bold text-amber-600 capitalize">{draft.urgency}</span>
                        </div>
                        <div className="col-span-2 bg-white p-2.5 rounded-xl border border-indigo-100">
                          <span className="text-slate-500 block text-[10px] font-medium">ISSUE DESCRIPTION</span>
                          <span className="font-medium text-slate-800">{draft.description}</span>
                        </div>
                      </div>

                      <button
                        onClick={confirmWorkOrder}
                        disabled={loading}
                        className="w-full bg-[#191919] hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                      >
                        <CheckCircle2 size={18} />
                        Confirm & Dispatch Work Order
                      </button>
                    </div>
                  )}

                  {/* Submission Confirmation Banner */}
                  {submittedWO && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center my-3 shadow-sm">
                      <CheckCircle2 className="mx-auto text-emerald-600 mb-2 animate-bounce" size={36} />
                      <h4 className="text-emerald-900 font-bold text-base mb-1">Work Order Created!</h4>
                      <p className="text-emerald-800 text-xs leading-relaxed max-w-md mx-auto">{submittedWO}</p>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>

                {/* Input Bar */}
                <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Describe your maintenance problem (e.g. leaky sink, AC issue)..."
                    disabled={loading || !!submittedWO}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition-colors disabled:opacity-50"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading || !!submittedWO}
                    className="bg-[#191919] hover:bg-slate-800 text-white p-2.5 rounded-xl disabled:opacity-50 transition-colors shadow-sm shrink-0"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* TICKETS TAB CONTENT (Real-time Interconnected with Admin) */}
            {activeTab === "tickets" && (
              <div className="flex flex-col h-full p-5 overflow-y-auto space-y-4 bg-white">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">My Maintenance Work Orders</h2>
                    <p className="text-xs text-slate-500">Live ticket status synced directly with Property Admin.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("chat")}
                    className="bg-[#191919] hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Sparkles size={14} />
                    Report New Issue
                  </button>
                </div>

                {workOrders.map((wo) => (
                  <div key={wo.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                        {wo.referenceCode}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full capitalize ${
                          wo.status === "resolved" || wo.status === "closed"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : wo.status === "in_progress" || wo.status === "assigned"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {wo.status.replace("_", " ")}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 capitalize text-sm">{wo.category} Issue</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{wo.description}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {new Date(wo.createdAt).toLocaleDateString()}
                      </span>
                      <span className="capitalize font-medium text-slate-700">Urgency: {wo.urgency}</span>
                    </div>
                  </div>
                ))}

                {workOrders.length === 0 && (
                  <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
                    <CheckCircle2 className="mx-auto text-slate-400 mb-3" size={48} />
                    <p className="text-slate-600 text-sm font-medium">No active maintenance work orders found.</p>
                    <button
                      onClick={() => setActiveTab("chat")}
                      className="mt-3 text-indigo-600 hover:underline text-xs font-bold"
                    >
                      Report an issue via AI Chat
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ANNOUNCEMENTS TAB CONTENT */}
            {activeTab === "announcements" && (
              <div className="flex flex-col h-full p-5 overflow-y-auto space-y-4 bg-white">
                <div className="pb-3 border-b border-slate-200">
                  <h2 className="font-bold text-slate-900 text-base">Community Notices & Broadcasts</h2>
                  <p className="text-xs text-slate-500">Official updates published by Property Management.</p>
                </div>

                {announcements.map((ann) => (
                  <div key={ann.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{ann.title}</span>
                      <span className="text-[10px] text-slate-500">{new Date(ann.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{ann.content}</p>
                  </div>
                ))}

                {announcements.length === 0 && (
                  <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
                    <Bell className="mx-auto text-slate-400 mb-3" size={48} />
                    <p className="text-slate-600 text-sm">No active property notices at this time.</p>
                  </div>
                )}
              </div>
            )}

            {/* AMENITIES TAB CONTENT */}
            {activeTab === "amenities" && (
              <div className="flex flex-col h-full p-5 overflow-y-auto space-y-4 bg-white">
                <div className="pb-3 border-b border-slate-200">
                  <h2 className="font-bold text-slate-900 text-base">Property Amenities & Facilities</h2>
                  <p className="text-xs text-slate-500">View resident services available at your property.</p>
                </div>

                {profile?.property?.description && (
                  <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-4 space-y-1">
                    <h3 className="font-bold text-indigo-950 text-sm">✨ Property Features & Amenities</h3>
                    <p className="text-xs text-indigo-900 leading-relaxed font-medium">{profile.property.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm">🏊 Community Pool & Lounge</h3>
                    <p className="text-xs text-slate-600">Open 7:00 AM – 10:00 PM daily. Keycard access required.</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm">🏋️ Fitness Center</h3>
                    <p className="text-xs text-slate-600">24/7 keycard access for whitelisted residents.</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm">🎉 Clubhouse Lounge</h3>
                    <p className="text-xs text-slate-600">Available for party reservations. Contact office.</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm">📦 Package Lockers</h3>
                    <p className="text-xs text-slate-600">24/7 automated delivery locker pickup.</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ───────────────────────────────────────────────────────────
              RIGHT SIDEBAR — Admin Interconnected Property Info (3-Cols)
          ─────────────────────────────────────────────────────────── */}
          <aside className="hidden lg:flex lg:col-span-3 flex-col gap-4 sticky top-24">
            {/* Property Overview Widget */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building size={16} className="text-indigo-600" />
                Assigned Residence
              </h3>

              {profile?.property ? (
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{profile.property.name}</span>
                      <span className="font-mono bg-slate-900 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">
                        {profile.propertyCode || profile.property.code}
                      </span>
                    </div>
                    <p className="text-slate-600">{profile.property.addressLine1}</p>
                    <p className="text-slate-500">{profile.property.city}, {profile.property.state} {profile.property.postalCode}</p>
                  </div>

                  {/* Interconnected Contact Details */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700 space-y-1 text-[11px]">
                    <span className="block text-slate-500 font-bold text-[10px]">PROPERTY MANAGEMENT CONTACT</span>
                    <p className="font-medium">Phone: {contactPhone}</p>
                    <p className="font-medium truncate">Email: {profile.property.contactEmail || "admin@evercrest.com"}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                  <p>Connected via Whitelisted Resident Email.</p>
                </div>
              )}
            </div>

            {/* Active Tickets Quick Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Wrench size={16} className="text-indigo-600" />
                  Recent Activity
                </h3>
                <span className="text-xs text-indigo-600 font-bold">{workOrders.length} Tickets</span>
              </div>

              <div className="space-y-2">
                {workOrders.slice(0, 3).map((wo) => (
                  <div key={wo.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-indigo-700 font-bold">{wo.referenceCode}</span>
                      <span className="text-[10px] font-bold text-slate-800 capitalize">{wo.status.replace("_", " ")}</span>
                    </div>
                    <p className="text-slate-700 truncate font-medium">{wo.category} - {wo.description}</p>
                  </div>
                ))}

                {workOrders.length === 0 && (
                  <p className="text-xs text-slate-500 italic">No recent maintenance requests.</p>
                )}
              </div>
            </div>
          </aside>

        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE BOTTOM NAVIGATION TAB BAR (`< lg` Screens)
      ═══════════════════════════════════════════════════════════════ */}
      <nav className="lg:hidden sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 grid grid-cols-4 gap-1 shadow-lg">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-colors ${
            activeTab === "chat" ? "bg-[#191919] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MessageSquare size={18} />
          <span>AI Chat</span>
        </button>

        <button
          onClick={() => setActiveTab("tickets")}
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-colors relative ${
            activeTab === "tickets" ? "bg-[#191919] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Wrench size={18} />
          <span>Tickets</span>
          {workOrders.length > 0 && (
            <span className="absolute top-1 right-3 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {workOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("announcements")}
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-colors relative ${
            activeTab === "announcements" ? "bg-[#191919] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Bell size={18} />
          <span>Notices</span>
          {announcements.length > 0 && (
            <span className="absolute top-1 right-3 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {announcements.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("amenities")}
          className={`flex flex-col items-center py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-colors ${
            activeTab === "amenities" ? "bg-[#191919] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Calendar size={18} />
          <span>Services</span>
        </button>
      </nav>
    </div>
  );
}
