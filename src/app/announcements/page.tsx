"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Calendar } from "lucide-react";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/announcements")
      .then(res => res.json())
      .then(d => {
        if (d.announcements) setAnnouncements(d.announcements);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading announcements...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/chat" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Chat</span>
          </Link>
          <h1 className="font-semibold text-gray-800">Announcements</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full space-y-6">
        {announcements.map((ann) => (
          <div key={ann.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
            {ann.isImportant && (
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
            )}
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${ann.isImportant ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                <Bell size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{ann.title}</h2>
                  <div className="flex items-center gap-1 text-sm text-gray-500 whitespace-nowrap">
                    <Calendar size={14} />
                    {new Date(ann.publishedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-gray-600">
                  {ann.content.split('\\n').map((para: string, i: number) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Bell className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 text-lg">No new announcements.</p>
          </div>
        )}
      </main>
    </div>
  );
}
