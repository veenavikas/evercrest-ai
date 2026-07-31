"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, ShieldCheck, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password) {
      setError("Please enter your User ID or Email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Invalid credentials");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please verify your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d1117] text-slate-100 flex flex-col justify-center items-center px-4 py-12 overflow-y-auto selection:bg-blue-500 selection:text-white">
      {/* Background Texture & Ambient Lights */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/90 via-[#0d1117] to-[#080b10] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Skeuomorphic Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 border border-slate-600/50 shadow-[0_10px_25px_rgba(0,0,0,0.6),_inset_0_1px_1px_rgba(255,255,255,0.2)] mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),_0_4px_8px_rgba(0,0,0,0.4)]">
              <ShieldCheck className="w-6 h-6 text-white drop-shadow-md" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight drop-shadow-md">
            CrestFix Admin Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 font-medium">
            Restricted access — authenticate with your credentials.
          </p>
        </div>

        {/* Skeuomorphic Tactile Card Container */}
        <div className="bg-[#161b22] border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8),_inset_0_1px_1px_rgba(255,255,255,0.1)] space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs flex items-center gap-2.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* User ID / Email Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-2">
                User ID / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter User ID or Email"
                  className="w-full pl-10 pr-4 py-3.5 bg-[#0d1117] border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),_0_1px_1px_rgba(255,255,255,0.05)] transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3.5 bg-[#0d1117] border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),_0_1px_1px_rgba(255,255,255,0.05)] transition-all"
                />
              </div>
            </div>

            {/* Skeuomorphic 3D Push Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 hover:from-blue-400 hover:to-blue-600 active:translate-y-0.5 text-white font-semibold text-sm rounded-2xl shadow-[0_6px_12px_rgba(26,107,255,0.35),_inset_0_1px_1px_rgba(255,255,255,0.4),_0_2px_0_#1d4ed8] flex items-center justify-center gap-2 border border-blue-400/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium">
            ← Return to CrestFix Home
          </a>
        </div>
      </div>
    </div>
  );
}
