"use client";

import { useState } from "react";
import { FileText, Download, Plus, Search, Shield, Eye, Trash2 } from "lucide-react";

type DocumentItem = {
  id: string;
  title: string;
  category: "Leases" | "Maintenance Rules" | "HOA & Compliance" | "Tenant Manuals";
  fileName: string;
  fileSize: string;
  updatedAt: string;
  downloadUrl: string;
};

const initialDocuments: DocumentItem[] = [
  {
    id: "doc-1",
    title: "Evercrest Tenant Maintenance & Troubleshooting Intake Rules",
    category: "Maintenance Rules",
    fileName: "tenant_maintenance_intake_troubleshooting_compliance_reviewed.xlsx",
    fileSize: "24.5 KB",
    updatedAt: "2026-07-29",
    downloadUrl: "#",
  },
  {
    id: "doc-2",
    title: "Standard Residential Lease Agreement & Rules Addendum",
    category: "Leases",
    fileName: "standard_residential_lease_addendum_2026.pdf",
    fileSize: "1.2 MB",
    updatedAt: "2026-07-15",
    downloadUrl: "#",
  },
  {
    id: "doc-3",
    title: "Appfolio Resident Directory & Access Whitelist Roster",
    category: "HOA & Compliance",
    fileName: "Appfolio_email_table_1.xlsx",
    fileSize: "19.2 KB",
    updatedAt: "2026-07-31",
    downloadUrl: "#",
  },
  {
    id: "doc-4",
    title: "Property Amenities & Community Guidelines",
    category: "Tenant Manuals",
    fileName: "evercrest_community_guidelines.pdf",
    fileSize: "450 KB",
    updatedAt: "2026-06-10",
    downloadUrl: "#",
  },
];

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isUploading, setIsUploading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<DocumentItem["category"]>("Maintenance Rules");

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      fileName: `${newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.pdf`,
      fileSize: "320 KB",
      updatedAt: new Date().toISOString().split("T")[0],
      downloadUrl: "#",
    };

    setDocuments([newDoc, ...documents]);
    setNewTitle("");
    setIsUploading(false);
  };

  const handleDelete = (id: string) => {
    setDocuments(documents.filter((d) => d.id !== id));
  };

  return (
    <div className="space-y-6 text-[#191919]">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Property & Compliance Documents</h1>
          <p className="text-xs text-gray-500 mt-1">Manage lease templates, maintenance guidelines, and property documentation.</p>
        </div>
        <button
          onClick={() => setIsUploading(!isUploading)}
          className="bg-[#191919] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-gray-800 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
        >
          <Plus size={15} /> Upload Document
        </button>
      </div>

      {/* Upload Modal / Panel */}
      {isUploading && (
        <form onSubmit={handleUpload} className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Upload New Property Document</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Document Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. 2026 HVAC Maintenance Policy"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="Maintenance Rules">Maintenance Rules</option>
                <option value="Leases">Leases</option>
                <option value="HOA & Compliance">HOA & Compliance</option>
                <option value="Tenant Manuals">Tenant Manuals</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsUploading(false)}
              className="px-3.5 py-1.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-xs"
            >
              Save Document
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {["All", "Maintenance Rules", "Leases", "HOA & Compliance", "Tenant Manuals"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredDocs.length > 0 ? (
          filteredDocs.map((doc) => (
            <article key={doc.id} className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs hover:shadow-xs transition-shadow space-y-3">
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {doc.category}
                    </span>
                    <h3 className="text-xs font-semibold text-slate-900 mt-1">{doc.title}</h3>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-gray-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                  title="Delete Document"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-gray-100">
                <span className="font-mono text-slate-600">{doc.fileName} ({doc.fileSize})</span>
                <span>Updated {doc.updatedAt}</span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <a
                  href={doc.downloadUrl}
                  onClick={(e) => {
                    e.preventDefault();
                    alert(`Downloading ${doc.fileName}...`);
                  }}
                  className="flex-1 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={14} /> Download
                </a>
              </div>
            </article>
          ))
        ) : (
          <div className="col-span-2 p-12 text-center text-slate-400 italic bg-white rounded-2xl border border-gray-200">
            No documents found matching your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
