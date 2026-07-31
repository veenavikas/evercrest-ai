"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Wrench, 
  MessageSquare, 
  Users, 
  BarChart3, 
  Settings,
  Building,
  Calendar,
  Bell,
  FileText,
  LogOut
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // On login page, render children standalone without admin sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/work-orders", label: "Work Orders", icon: Wrench },
    { href: "/admin/conversations", label: "Conversations", icon: MessageSquare },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/properties", label: "Properties", icon: Building },
    { href: "/admin/amenities", label: "Amenities", icon: Calendar },
    { href: "/admin/announcements", label: "Announcements", icon: Bell },
    { href: "/admin/documents", label: "Documents", icon: FileText },
    { href: "/admin/whitelist", label: "Whitelist", icon: Users },
    { href: "/admin/system-logs", label: "System Logs", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#f4f5f8] text-[#191919]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200/80 flex flex-col shadow-xs">
        <div className="p-5 border-b border-gray-200/80">
          <h1 className="text-xl font-serif font-bold text-gray-900 tracking-tight">CrestFix Admin</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-xs ${
                  isActive 
                    ? "bg-[#191919] text-white shadow-xs" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200/80">
          <form action="/api/admin/auth/logout" method="POST">
            <button type="submit" className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer">
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}

