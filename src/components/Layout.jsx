import { Outlet, Link, useLocation } from "react-router-dom";
import MobileBottomNav from "./MobileBottomNav";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  Users,
  ListTodo,
  BarChart3,
  Upload,
  Ban,
  Settings,
  Menu,
  X,
  Building2,
  LogOut,
  ChevronRight,
  Map,
  FileText,
  CalendarCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/leads", label: "Leads", icon: Building2 },
  { path: "/map", label: "Karte", icon: Map },
  { path: "/tasks", label: "Aufgaben", icon: ListTodo },
  { path: "/calendar", label: "Kalender", icon: CalendarCheck },
  { path: "/documents", label: "Dokumente", icon: FileText },
  { path: "/statistics", label: "Statistiken", icon: BarChart3, adminOnly: true },
  { path: "/import", label: "Import", icon: Upload, adminOnly: true },
  { path: "/blacklist", label: "Blacklist", icon: Ban, adminOnly: true },
  { path: "/settings", label: "Einstellungen", icon: Settings, adminOnly: true },
];

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const isAdmin = user?.role === "admin";

  const filteredNav = NAV_ITEMS.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Huwa Vertrieb</h1>
              <p className="text-[11px] text-sidebar-foreground/60">Gebäudedienste CRM</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-xs font-bold text-sidebar-primary">
                {user.full_name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{user.full_name || "Benutzer"}</p>
                <p className="text-[10px] text-sidebar-foreground/50 capitalize">{user.role || "vertriebler"}</p>
              </div>
              <button onClick={handleLogout} className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="text-sm font-semibold">Huwa Vertrieb</span>
          <div className="w-9" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:pb-6 lg:p-6">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}