"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Mail } from "lucide-react";

export default function DirectoryPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/directory")
      .then(res => res.json())
      .then(d => {
        if (d.entries) setEntries(d.entries);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading directory...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/chat" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Chat</span>
          </Link>
          <h1 className="font-semibold text-gray-800">Resident Directory</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entries.map((entry, i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <User size={32} />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">{entry.displayName || "Resident"}</h3>
              {entry.unitNumber && (
                <p className="text-sm font-medium text-blue-600 mt-1">Unit {entry.unitNumber}</p>
              )}
              {entry.bio && (
                <p className="text-gray-500 text-sm mt-3">{entry.bio}</p>
              )}
              {entry.email && (
                <a href={`mailto:${entry.email}`} className="mt-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  <Mail size={16} /> Contact
                </a>
              )}
            </div>
          ))}
          {entries.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No residents are currently listed in the directory.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
