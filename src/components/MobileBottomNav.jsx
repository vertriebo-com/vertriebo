import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Building2, ListTodo, Map } from "lucide-react";

const NAV = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/leads", label: "Leads", icon: Building2 },
  { path: "/tasks", label: "Aufgaben", icon: ListTodo },
  { path: "/map", label: "Karte", icon: Map },
];

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 flex" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {NAV.map(({ path, label, icon: Icon }) => {
        const isActive = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}