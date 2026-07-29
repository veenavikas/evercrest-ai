import Link from "next/link";
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
  FileText
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Evercrest Admin</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <item.icon size={18} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
              Sign Out
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
