import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { LayoutDashboard, Building2, ListTodo, CalendarCheck, Settings } from "lucide-react";

const NAV = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/leads", label: "Leads", icon: Building2 },
  { path: "/tasks", label: "Aufgaben", icon: ListTodo },
  { path: "/calendar", label: "Kalender", icon: CalendarCheck },
  { path: "/settings", label: "Einstellungen", icon: Settings, adminOnly: true },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // User role for admin-only tabs
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      if (!me) return;
      const isPlatformAdmin = me.role === "admin";
      let isOrgAdmin = false;
      const memberships = await base44.entities.OrganizationMember.filter({ user_email: me.email, status: "active" });
      if (memberships?.[0]?.role === "organization_admin") isOrgAdmin = true;
      setIsAdmin(isPlatformAdmin || isOrgAdmin);
    })();
  }, []);

  const handleTabClick = (path) => {
    const isActive = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
    if (isActive) {
      navigate(path, { replace: true });
    } else {
      navigate(path);
    }
  };

  // Filter admin-only tabs
  const visibleNav = NAV.filter(item => !item.adminOnly || isAdmin);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] z-30 flex shadow-lg" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {visibleNav.map(({ path, label, icon: Icon }) => {
        const isActive = path === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(path);
        return (
          <button
            key={path}
            onClick={() => handleTabClick(path)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors ${
              isActive ? "text-blue-600" : "text-slate-500"
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : ""}`} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}