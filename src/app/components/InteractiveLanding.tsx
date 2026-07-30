"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MessageSquare, Zap, Shield, BarChart3, Clock, Users, CheckCircle } from "lucide-react";
import BoomerangVideoBg from "./BoomerangVideoBg";

interface Property {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  heroImageUrl: string | null;
}

interface InteractiveLandingProps {
  properties: Property[];
}

const CAPABILITIES = [
  {
    icon: MessageSquare,
    title: "Report Any Home Issue, Anytime",
    text: "Tenants describe their problem in plain English — leaking pipe, broken AC, faulty lock — and the AI understands it instantly, 24 hours a day, 7 days a week.",
  },
  {
    icon: Zap,
    title: "Automatic Work Order Creation",
    text: "The moment an issue is reported, a structured work order is created and dispatched to the Evercrest admin team — no forms, no phone queues, no waiting.",
  },
  {
    icon: Shield,
    title: "Passwordless Magic Link Login",
    text: "Tenants sign in with a secure one-time magic link sent to their email — no passwords to create, remember, or reset.",
  },
  {
    icon: BarChart3,
    title: "Admin Dashboard & Tracking",
    text: "The Evercrest team sees every reported issue in real time — status, priority, assigned technician, and full conversation history, all in one place.",
  },
  {
    icon: Users,
    title: "Property-Wide Announcements",
    text: "Evercrest staff can push notices — maintenance windows, lease reminders, community updates — directly to tenants at a specific home or across all properties.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "You spot an issue at home",
    body: "Something's wrong — the AC stopped working, there's a water leak under the sink, or the front door lock is sticking. Instead of waiting on hold, you open Evercrest.",
  },
  {
    step: "02",
    title: "Describe it in your own words",
    body: "Type or say exactly what's happening. The AI understands the problem, asks any follow-up questions it needs, and confirms your home address and unit details automatically.",
  },
  {
    step: "03",
    title: "Work order raised instantly",
    body: "A structured work order — with issue type, urgency level, and your details — is created and sent directly to the Evercrest admin team, usually in under 30 seconds.",
  },
  {
    step: "04",
    title: "You get a confirmation & updates",
    body: "You receive a confirmation right away. As your issue is actioned — technician assigned, visit scheduled, job completed — you're updated at every step.",
  },
];

const STATS = [
  { value: "< 30s", label: "Average time to create a work order" },
  { value: "24/7", label: "Available — no office hours needed" },
  { value: "0", label: "Phone calls required to report an issue" },
  { value: "100%", label: "Of issues logged with full audit trail" },
];

export default function InteractiveLanding({ properties }: InteractiveLandingProps) {
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <div className="relative bg-white text-[#191919] font-sans antialiased overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════════════════
          HERO — Full-Screen Boomerang Video
      ═══════════════════════════════════════════════════════════════ */}
      {/* Fixed Navbar — Logo left + Magic Link CTA right */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex items-center justify-between pointer-events-auto">
        {/* Logo — SVG mark + wordmark on one line */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <svg
            viewBox="0 0 256 256"
            fill="currentColor"
            className="w-5 h-5 text-[#191919] shrink-0 transition-transform duration-200 group-hover:scale-105"
          >
            <path d="M 144 256 L 27.598 256 L 144 139.598 Z" />
            <path d="M 256 207.5 L 200 256 L 200 56 L 0 56 L 48 0 L 256 0 Z" />
            <path d="M 0 204.402 L 0 112 L 92.402 112 Z" />
          </svg>
          <span className="font-semibold text-sm tracking-tight text-[#191919] whitespace-nowrap">
            CrestFix
          </span>
        </Link>

        {/* CTA */}
        <Link
          href="/login"
          className="px-5 py-2.5 bg-[#1A6BFF] hover:bg-[#1557E8] text-white text-sm font-medium rounded-xl shadow-xs hover:shadow-sm transition-all whitespace-nowrap"
        >
          Magic Link
        </Link>
      </nav>

      <section className="relative flex flex-col items-center overflow-hidden h-screen">
        {/* Boomerang Video Background */}
        <BoomerangVideoBg />

        {/* Gradient overlay — bottom fade to white so bottom panel blends */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-white/10 via-transparent to-white/60 pointer-events-none" />

        {/* Hero Text — top-center */}
        <div className="relative z-10 flex flex-col items-center text-center pt-20 sm:pt-24 md:pt-28 lg:pt-32 px-4 sm:px-6 w-full">
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200/80 text-[11px] uppercase tracking-[0.18em] text-[#191919]/70 font-medium shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            CrestFix · Now Live
          </div>

          {/* H1 */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tighter text-[#191919] font-normal whitespace-nowrap">
            Meet CrestFix.
          </h1>

          {/* Subcopy */}
          <p className="mt-5 sm:mt-6 max-w-sm sm:max-w-md text-sm md:text-[15px] text-[#191919]/65 leading-relaxed font-normal">
            Your home, handled. Report any issue at your Evercrest home in Texas
            — our AI creates a work order for the team instantly, any time of day.
          </p>

          {/* Single Primary CTA */}
          <div className="mt-7 sm:mt-8 flex justify-center">
            <Link
              href="/login"
              className="px-8 py-3.5 bg-[#1A6BFF] hover:bg-[#1557E8] text-white text-sm font-medium rounded-xl inline-flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
            >
              Report an Issue
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────
            Bottom Info Panel — anchored to bottom of first viewport
        ───────────────────────────────────────────────────────── */}
        <div className="mt-auto relative z-10 w-full max-w-6xl px-4 sm:px-6 mx-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-t-2xl border border-gray-200 border-b-0 shadow-lg pt-8 sm:pt-10 px-5 sm:px-8 md:px-12 pb-0">
            {/* Row 1 */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-end">
              <div>
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/45 font-medium">
                  WHAT DO WE DO?
                </span>
                <h2 className="mt-3 text-2xl sm:text-3xl md:text-[38px] font-serif font-normal leading-tight tracking-tight text-[#191919]">
                  Your home issue,{" "}
                  <br className="hidden sm:block" />
                  resolved faster.
                </h2>
              </div>
              <div>
                <p className="text-sm md:text-[15px] text-[#191919]/65 leading-relaxed font-normal">
                  Evercrest leases quality homes across Texas and puts tenants
                  first. Instead of waiting on hold or sending emails into the
                  void, you simply tell our AI what&rsquo;s wrong — and a work
                  order lands on the admin team&rsquo;s desk in seconds.
                </p>
              </div>
            </div>

            {/* Hairline */}
            <div className="mt-7 sm:mt-9 h-px bg-gray-200/60 w-full" />

            {/* Row 2 — 3 feature pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 py-5">
              {[
                { num: "01", label: "Report It", desc: "Describe any home issue in plain language" },
                { num: "02", label: "Track It", desc: "Work order created & status updated live" },
                { num: "03", label: "Resolved", desc: "Admin team acts, you get confirmation" },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTab(activeTab === idx ? null : idx)}
                  className="group bg-[#F4F3F3] hover:bg-[#EAEAEA] border border-gray-200/60 cursor-pointer px-5 py-3.5 flex items-center justify-between rounded-xl text-left transition-all duration-200"
                >
                  <div className="flex items-center text-sm">
                    <span className="text-[#191919]/35 tabular-nums">{item.num}</span>
                    <span className="mx-2 text-[#191919]/25">/</span>
                    <span className="font-medium text-[#191919]">{item.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#1A6BFF] group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          STATS BAR
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#0F1F5C] py-12 px-6 sm:px-10 md:px-14">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <div key={i} className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="font-serif text-3xl sm:text-4xl text-white font-normal">{stat.value}</div>
              <div className="mt-2 text-xs text-white/60 leading-snug font-normal">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CAPABILITIES GRID
      ═══════════════════════════════════════════════════════════════ */}
      <section id="capabilities" className="py-24 px-6 sm:px-10 md:px-14 bg-[#FAFAFA]">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="grid md:grid-cols-2 gap-8 items-end mb-16">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/45 font-medium">
                FOR TENANTS & THE TEAM
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-serif font-normal tracking-tight text-[#191919] leading-tight">
                Built around how you actually live
              </h2>
            </div>
            <div>
              <p className="text-sm md:text-[15px] text-[#191919]/65 leading-relaxed">
                Evercrest Homes manages leased residences across Texas.
                This platform gives tenants a direct line to report issues
                and gives the admin team a real-time view of every home,
                every request, and every resolution.
              </p>
            </div>
          </div>

          {/* 3×2 cards */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {CAPABILITIES.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <div
                  key={i}
                  className="group p-7 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:shadow-md hover:border-gray-300 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1A6BFF]/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5 text-[#1A6BFF]" size={20} />
                  </div>
                  <h3 className="text-base font-serif font-normal text-[#191919] mb-2.5 leading-snug">
                    {cap.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#191919]/60 leading-relaxed font-normal">
                    {cap.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          HOW IT WORKS — Interactive Step Walkthrough
      ═══════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 px-6 sm:px-10 md:px-14 bg-[#F4F3F3]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/45 font-medium">
              HOW IT WORKS
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-serif font-normal tracking-tight text-[#191919]">
              From reported issue to work order in seconds
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* Step list */}
            <div className="space-y-4">
              {HOW_IT_WORKS.map((step, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`w-full text-left px-6 py-5 rounded-2xl transition-all duration-300 ${
                    activeStep === i
                      ? "bg-white border border-gray-200 shadow-sm"
                      : "bg-transparent border border-transparent hover:bg-white/60 hover:border-gray-200/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`text-[11px] font-medium tabular-nums pt-0.5 transition-colors ${
                        activeStep === i ? "text-[#1A6BFF]" : "text-[#191919]/35"
                      }`}
                    >
                      {step.step}
                    </span>
                    <div>
                      <div
                        className={`text-sm font-medium transition-colors ${
                          activeStep === i ? "text-[#191919]" : "text-[#191919]/60"
                        }`}
                      >
                        {step.title}
                      </div>
                      {activeStep === i && (
                        <p className="mt-2 text-[13px] text-[#191919]/60 leading-relaxed">
                          {step.body}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Visual panel */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Simulated chat UI */}
              <div className="px-5 py-4 border-b border-gray-200/60 flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-[#191919]/60 font-medium tracking-wide uppercase">CrestFix · Live</span>
              </div>
              <div className="p-5 space-y-4 min-h-[260px]">
                {activeStep >= 0 && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F4F3F3] flex items-center justify-center shrink-0 text-xs font-semibold text-[#191919]/70">R</div>
                    <div className="bg-[#F4F3F3] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[75%]">
                      <p className="text-[13px] text-[#191919]">My AC isn&rsquo;t working and it&rsquo;s 95°F inside — 4212 Maple Creek, Unit 7</p>
                    </div>
                  </div>
                )}
                {activeStep >= 1 && (
                  <div className="flex gap-3 justify-end">
                    <div className="bg-[#1A6BFF] text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[75%] shadow-xs">
                      <p className="text-[13px]">Got it — I&rsquo;ve confirmed your address at 4212 Maple Creek, Unit 7 and logged this as a high-priority HVAC issue. Creating your work order now.</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#1A6BFF] flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 256 256" fill="white" className="w-4 h-4"><path d="M 144 256 L 27.598 256 L 144 139.598 Z" /><path d="M 256 207.5 L 200 256 L 200 56 L 0 56 L 48 0 L 256 0 Z" /><path d="M 0 204.402 L 0 112 L 92.402 112 Z" /></svg>
                    </div>
                  </div>
                )}
                {activeStep >= 2 && (
                  <div className="flex gap-3 justify-end">
                    <div className="bg-[#1A6BFF] text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] shadow-xs">
                      <p className="text-[13px]">Work order #WO-2847 has been created and sent to the Evercrest team. You&rsquo;ll receive an update once a technician is assigned.</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#1A6BFF] flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 256 256" fill="white" className="w-4 h-4"><path d="M 144 256 L 27.598 256 L 144 139.598 Z" /><path d="M 256 207.5 L 200 256 L 200 56 L 0 56 L 48 0 L 256 0 Z" /><path d="M 0 204.402 L 0 112 L 92.402 112 Z" /></svg>
                    </div>
                  </div>
                )}
                {activeStep >= 3 && (
                  <div className="mt-3 px-4 py-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-3 shadow-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-medium text-emerald-900">Work order logged & team notified</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">The Evercrest admin team can see this issue right now in the dashboard — with your details, urgency level, and full conversation history.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          PROPERTIES PORTFOLIO
      ═══════════════════════════════════════════════════════════════ */}
      <section id="properties" className="py-24 px-6 sm:px-10 md:px-14 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/45 font-medium">
                OUR HOMES
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-serif font-normal text-[#191919]">
                Evercrest Homes, Texas
              </h2>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#191919] hover:opacity-70 transition-opacity shrink-0"
            >
              <span>View All Properties</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((prop) => (
                <Link
                  key={prop.id}
                  href={`/properties/${prop.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-200/80 shadow-xs hover:shadow-md hover:border-gray-300 transition-all duration-300 flex flex-col"
                >
                  <div className="aspect-[4/3] bg-[#F4F3F3] relative overflow-hidden">
                    {prop.heroImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={prop.heroImageUrl}
                        alt={prop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-serif text-xl">
                        {prop.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-serif font-normal text-[#191919] group-hover:text-[#1A6BFF] transition-colors leading-snug">
                        {prop.name}
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5 uppercase tracking-wide font-medium">
                        {prop.city}, {prop.state}
                      </p>
                      {prop.description && (
                        <p className="text-[13px] text-[#191919]/60 mt-3 line-clamp-2 leading-relaxed">
                          {prop.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-[13px] font-medium text-[#191919]">
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 group-hover:text-[#1A6BFF] transition-all" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-[#F4F3F3] rounded-2xl border border-gray-200/60">
              <div className="font-serif text-xl text-[#191919]/40 mb-2">No active properties</div>
              <p className="text-sm text-[#191919]/35">Properties will appear here once they&rsquo;re added through the admin dashboard.</p>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          TESTIMONIALS / SOCIAL PROOF
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 sm:px-10 md:px-14 bg-[#0F1F5C]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-medium">
              WHAT TENANTS SAY
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-serif font-normal text-white leading-tight">
              Home issues handled without the hassle
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "My kitchen faucet was leaking at 11 PM. I typed it in, and within a minute I had a confirmation that a work order was created. Someone came the next morning. That never happened before.",
                name: "James R.",
                role: "Evercrest Tenant · Austin, TX",
              },
              {
                quote: "I used to dread calling the office during lunch just to report something small. Now I just send a message here and I'm done in 30 seconds. It actually keeps track of everything too.",
                name: "Aisha M.",
                role: "Evercrest Tenant · Houston, TX",
              },
              {
                quote: "The login is so simple — just my email and a link, no password nonsense. And when my AC was flagged urgent, I got a follow-up the same day. I feel like my issues actually matter now.",
                name: "Carlos D.",
                role: "Evercrest Tenant · Dallas, TX",
              },
            ].map((t, i) => (
              <div key={i} className="p-7 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-md">
                <p className="text-[14px] text-white/70 leading-relaxed font-normal mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <div className="text-sm font-medium text-white">{t.name}</div>
                  <div className="text-[12px] text-white/40 mt-0.5">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CTA — Final Full-Width Call to Action
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 sm:px-10 md:px-14 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/40 font-medium">
            FOR EVERCREST TENANTS
          </span>
          <h2 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-serif font-normal text-[#191919] leading-tight tracking-tight">
            Got an issue at home? We&rsquo;re on it.
          </h2>
          <p className="mt-5 text-sm md:text-base text-[#191919]/60 leading-relaxed max-w-xl mx-auto">
            Sign in to your Evercrest account and tell our AI what&rsquo;s wrong.
            Your work order reaches the team in seconds — no calls, no waiting, no chasing.
          </p>
          <div className="mt-9 flex justify-center">
            <Link
              href="/login"
              className="px-8 py-3.5 bg-[#1A6BFF] hover:bg-[#1557E8] text-white text-sm font-medium rounded-xl inline-flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
            >
              Report an Issue Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Minimal Footer ─── */}
      <footer className="border-t border-gray-100 py-5 px-6 sm:px-10 md:px-14">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <svg viewBox="0 0 256 256" fill="currentColor" className="w-4 h-4 text-[#191919]">
              <path d="M 144 256 L 27.598 256 L 144 139.598 Z" />
              <path d="M 256 207.5 L 200 256 L 200 56 L 0 56 L 48 0 L 256 0 Z" />
              <path d="M 0 204.402 L 0 112 L 92.402 112 Z" />
            </svg>
            <span className="font-semibold text-sm text-[#191919] whitespace-nowrap">CrestFix</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-5 text-xs text-[#191919]/45">
            <a href="#" className="hover:text-[#191919] transition-colors whitespace-nowrap">Privacy Policy</a>
            <span className="text-[#191919]/20">·</span>
            <a href="#" className="hover:text-[#191919] transition-colors whitespace-nowrap">Terms &amp; Conditions</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
