import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useLeadsFilter } from "../hooks/useLeadsFilter";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Phone,
  Clock,
  ArrowRight,
  AlertCircle,
  PhoneCall,
  CheckCircle2
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import WeekProgress from "../components/WeekProgress";
import WeeklyGoal from "../components/WeeklyGoal";
import TodayCallCard from "../components/TodayCallCard";
import TagesplanCard from "../components/TagesplanCard";
import { Button } from "@/components/ui/button";
import moment from "moment";

export default function Dashboard() {
  const { user, org, filterCompanies, loading: filterLoading } = useLeadsFilter();
  // Patch user with org so query can access org.id
  if (user && !user.org) user.org = org;

  const orgId = user?.org?.id || null;

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ["companies", orgId],
    queryFn: () => orgId
      ? base44.entities.Company.filter({ organization_id: orgId }, "-created_date", 500)
      : Promise.resolve([]),
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks", orgId],
    queryFn: () => orgId
      ? base44.entities.Task.filter({ organization_id: orgId }, "-faellig_am", 100)
      : Promise.resolve([]),
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const loading = loadingCompanies || loadingTasks || filterLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const myCompanies = filterCompanies(companies);
  const myTasks = isAdmin ? tasks : tasks.filter(t => t.assigned_to === user?.email);
  const openTasks = myTasks.filter(t => !t.erledigt);
  const overdueTasks = openTasks.filter(t => t.faellig_am && moment(t.faellig_am).isBefore(moment()));
  const todayTasks = openTasks.filter(t => t.faellig_am && moment(t.faellig_am).isSame(moment(), "day"));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Hallo, {user?.full_name?.split(" ")[0] || "Vertriebler"} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {moment().format("dddd, D. MMMM YYYY")}
        </p>
      </div>

      {/* Week Progress + Goal */}
      <div className="grid md:grid-cols-2 gap-4">
        <WeekProgress user={user} />
        <WeeklyGoal user={user} />
      </div>

      {/* Tagesplan */}
      <TagesplanCard companies={myCompanies} tasks={[...overdueTasks, ...todayTasks]} user={user} />

      {/* Rückrufe */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Rückrufe</h2>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {myCompanies.filter(c => c.status === "Rückruf").length}
            </span>
          </div>
          <Link to="/leads?status=Rückruf">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              Alle <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        <div className="divide-y divide-border">
          {myCompanies
            .filter(c => c.status === "Rückruf")
            .slice(0, 6)
            .map(company => (
            <div key={company.id} className="px-5 py-3 flex items-center gap-3">
              <Link to={`/leads/${company.id}`} className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{company.name}</p>
                <p className="text-xs text-muted-foreground">{company.telefon || "–"}</p>
              </Link>
              <div className="flex items-center gap-1.5 shrink-0">
                {company.telefon && (
                  <a href={`tel:${company.telefon}`} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Anrufen">
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
          {myCompanies.filter(c => c.status === "Rückruf").length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              Keine Rückrufe offen 🎉
            </div>
          )}
        </div>
      </div>

      {/* Heiße & Neueste Leads */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">🔥 Aktive Leads</h2>
          <Link to="/leads">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              Alle anzeigen <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Firma</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Branche</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Ort</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...myCompanies]
                .sort((a, b) => {
                  if (a.is_hot && !b.is_hot) return -1;
                  if (!a.is_hot && b.is_hot) return 1;
                  const prio = { "Rückruf": 0, "Termin": 1, "Angebot": 2, "Kontakt": 3, "Neu": 4 };
                  return (prio[a.status] ?? 9) - (prio[b.status] ?? 9);
                })
                .slice(0, 8)
                .map(company => (
                <tr key={company.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3">
                    <Link to={`/leads/${company.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground hidden md:table-cell">{company.branche || "-"}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground hidden lg:table-cell">{company.ort || "-"}</td>
                  <td className="px-5 py-3"><StatusBadge status={company.status} /></td>
                </tr>
              ))}
              {myCompanies.filter(c => c.is_hot || c.status === "Rückruf" || c.status === "Termin" || c.status === "Angebot").length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">Keine aktiven Leads</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}