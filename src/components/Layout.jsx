import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import MobileBottomNav from "./MobileBottomNav";
import AppHeader from "./AppHeader";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  Users,
  ListTodo,
  BarChart3,
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
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/leads", label: "Leads", icon: Building2 },
  { path: "/map", label: "Karte", icon: Map },
  { path: "/tasks", label: "Aufgaben", icon: ListTodo },
  { path: "/calendar", label: "Kalender", icon: CalendarCheck },
  { path: "/documents", label: "Dokumente", icon: FileText },
  { path: "/statistics", label: "Statistiken", icon: BarChart3, adminOnly: true },
  { path: "/blacklist", label: "Blacklist", icon: Ban },
  { path: "/settings", label: "Einstellungen", icon: Settings, adminOnly: true },
];

// Sub-pages that should show a back button on mobile
const SUB_PAGES = ["/leads/", "/tasks/", "/documents/"];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [orgRole, setOrgRole] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
      if (!me) return;
      // Plattform-Admin hat immer Zugriff
      if (me.role === "admin") { setOrgRole("organization_admin"); return; }
      // OrganizationMember-Rolle laden
      const memberships = await base44.entities.OrganizationMember.filter({ user_email: me.email, status: "active" });
      setOrgRole(memberships?.[0]?.role || "sales_rep");
    })();
  }, []);

  const isAdmin = user?.role === "admin" || orgRole === "organization_admin";

  const filteredNav = NAV_ITEMS.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F6F8FB]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Premium Dark */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">Vertriebo</h1>
              <p className="text-[10px] text-slate-400 font-medium">KI-Vertriebssystem</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : ""}`} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-800">
          {user && (
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center text-sm font-bold text-blue-400 border border-blue-500/30">
                  {user.full_name?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.full_name || "Benutzer"}</p>
                  <p className="text-[10px] text-slate-400 font-medium capitalize">
                    {orgRole === "organization_admin" ? "Admin" : orgRole === "sales_rep" ? "Vertriebler" : user.role || "Vertriebler"}
                  </p>
                </div>
                <button onClick={handleLogout} className="text-slate-500 hover:text-white transition-colors p-1.5 hover:bg-slate-700/50 rounded-lg">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content - Light Mode */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F6F8FB]">
        {/* App Header - Zentrale Header-Komponente */}
        <AppHeader />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-8" style={{ overscrollBehavior: "none", paddingLeft: "max(1.25rem, env(safe-area-inset-left))", paddingRight: "max(1.25rem, env(safe-area-inset-right))" }}>
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}