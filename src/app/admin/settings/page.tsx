"use client";

import { useEffect, useState } from "react";
import { Lock, Shield, KeyRound, Check, AlertCircle, UserPlus, Mail, Trash2, Users } from "lucide-react";

type AdminAccount = {
  id: number;
  email: string;
  fullName?: string | null;
  createdAt?: string;
};

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Admin Emails State
  const [adminEmails, setAdminEmails] = useState<AdminAccount[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [adminAddMessage, setAdminAddMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  const fetchAdminEmails = async () => {
    try {
      const res = await fetch("/api/admin/allowed-emails");
      const data = await res.json();
      if (data.allowedEmails) {
        const filteredAdmins = data.allowedEmails.filter((e: any) => e.role === "admin");
        setAdminEmails(filteredAdmins);
      }
    } catch (err) {
      console.error("Failed to load admin emails:", err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchAdminEmails();
  }, []);

  const handleAddAdminEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAddMessage(null);

    if (!newAdminEmail || !newAdminEmail.includes("@")) {
      setAdminAddMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    try {
      const res = await fetch("/api/admin/allowed-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newAdminEmail,
          fullName: newAdminName || "CrestFix Admin",
          role: "admin",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setAdminAddMessage({ type: "success", text: `Admin email ${newAdminEmail} added successfully!` });
        setNewAdminEmail("");
        setNewAdminName("");
        fetchAdminEmails();
      } else {
        setAdminAddMessage({ type: "error", text: data.error?.message || "Failed to add admin email." });
      }
    } catch (err) {
      console.error("Error adding admin email:", err);
      setAdminAddMessage({ type: "error", text: "An error occurred while adding admin email." });
    }
  };

  const handleDeleteAdminEmail = async (id: number, email: string) => {
    if (!confirm(`Are you sure you want to revoke admin access for ${email}?`)) return;
    try {
      const res = await fetch("/api/admin/allowed-emails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, email }),
      });
      if (res.ok) {
        fetchAdminEmails();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to delete admin email");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New password and confirm password do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Admin password updated successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to update password." });
      }
    } catch (err) {
      console.error("Failed to change password:", err);
      setMessage({ type: "error", text: "An error occurred while updating password." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-[#191919]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-xs text-gray-500 mt-1">Manage portal security, admin credentials & admin team access.</p>
      </div>

      {/* Admin Profile Overview */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">CrestFix Administrator Account</h2>
            <p className="text-xs text-gray-500">Role: Portal Super Admin • Status: Authenticated</p>
          </div>
        </div>
      </div>

      {/* Admin Email Management Card (Test #7 Fix) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
          <UserPlus size={18} className="text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">Manage Authorized Admin Emails</h2>
        </div>

        {adminAddMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              adminAddMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {adminAddMessage.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{adminAddMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleAddAdminEmail} className="flex flex-wrap md:flex-nowrap gap-3 items-end">
          <div className="w-48">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Admin Full Name</label>
            <input
              type="text"
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              placeholder="e.g. Adithya Admin"
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Admin Email Address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@evercrest.com"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer h-[34px] shadow-xs"
          >
            <UserPlus size={15} /> Add Admin
          </button>
        </form>

        {/* Existing Admin Emails Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden pt-2">
          <div className="px-4 py-2 bg-slate-50 border-b border-gray-200 text-xs font-bold text-slate-700 flex items-center gap-2">
            <Users size={14} className="text-indigo-600" />
            <span>Authorized Admin Team ({adminEmails.length})</span>
          </div>
          {loadingAdmins ? (
            <div className="p-4 text-xs text-gray-400">Loading admin emails...</div>
          ) : adminEmails.length > 0 ? (
            <table className="w-full text-left text-xs divide-y divide-gray-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Admin Email</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {adminEmails.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-bold text-slate-900">{adm.fullName || "Admin User"}</td>
                    <td className="px-4 py-2.5 font-medium text-indigo-700 font-mono">{adm.email}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDeleteAdminEmail(adm.id, adm.email)}
                        className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Revoke Admin Access"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-xs text-gray-400 italic text-center">No secondary admin emails added yet. Default admin@evercrest.com active.</div>
          )}
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
          <KeyRound size={18} className="text-blue-600" />
          <h2 className="text-sm font-bold text-gray-900">Change Admin Password</h2>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {message.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Current Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-[#191919] text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {loading ? "Updating Password..." : "Update Admin Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
