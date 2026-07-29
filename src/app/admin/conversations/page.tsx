"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = () => {
    fetch("/api/admin/conversations")
      .then(res => res.json())
      .then(d => {
        if (d.conversations) setConversations(d.conversations);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500">Tenant</th>
              <th className="px-6 py-3 font-medium text-gray-500">Started</th>
              <th className="px-6 py-3 font-medium text-gray-500">Last Message</th>
              <th className="px-6 py-3 font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {conversations.map((conv) => (
              <tr key={conv.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{conv.tenant?.fullName || "Unknown"}</div>
                  <div className="text-xs text-gray-500">{conv.tenant?.email}</div>
                </td>
                <td className="px-6 py-4 text-gray-500">{new Date(conv.startedAt).toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-500">{new Date(conv.lastMessageAt).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${conv.isArchived ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                    {conv.isArchived ? "Archived" : "Active"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                    <MessageSquare size={14} /> View Log
                  </button>
                </td>
              </tr>
            ))}
            {conversations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No conversations found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
