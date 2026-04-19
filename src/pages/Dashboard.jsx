import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useLeadsFilter } from "../hooks/useLeadsFilter";
import {
  Building2,
  Phone,
  CalendarCheck,
  Trophy,
  Clock,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import WeekProgress from "../components/WeekProgress";
import WeeklyGoal from "../components/WeeklyGoal";
import TodayCallCard from "../components/TodayCallCard";
import { Button } from "@/components/ui/button";
import moment from "moment";

export default function Dashboard() {
  const { user, filterCompanies, loading: filterLoading } = useLeadsFilter();
  const [companies, setCompanies] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [contactLogs, setContactLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [comps, allTasks, logs] = await Promise.all([
        base44.entities.Company.list("-created_date", 500),
        base44.entities.Task.list("-faellig_am", 100),
        base44.entities.ContactLog.list("-created_date", 50),
      ]);
      setCompanies(comps);
      setTasks(allTasks);
      setContactLogs(logs);
    } catch (e) {
      console.error("loadData error", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || filterLoading) {
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

  const statusCounts = {};
  myCompanies.forEach(c => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  });

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

      {/* Heute anrufen */}
      <TodayCallCard companies={myCompanies} />

      {/* Stats */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Überfällige & Heutige Aufgaben */}
        <div className="bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Heutige Aufgaben</h2>
              {overdueTasks.length > 0 && (
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {overdueTasks.length} überfällig
                </span>
              )}
            </div>
            <Link to="/tasks">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                Alle <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {[...overdueTasks, ...todayTasks].slice(0, 5).map(task => (
              <div key={task.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  task.faellig_am && moment(task.faellig_am).isBefore(moment()) ? "bg-red-500" : "bg-amber-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.titel}</p>
                  <p className="text-xs text-muted-foreground">{task.company_name}</p>
                </div>
                <PriorityBadge priority={task.prioritaet} />
              </div>
            ))}
            {overdueTasks.length === 0 && todayTasks.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Keine Aufgaben für heute 🎉
              </div>
            )}
          </div>
        </div>

        {/* Rückrufe */}
        <div className="bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Rückrufe</h2>
            </div>
            <Link to="/leads">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                Alle <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {myCompanies
              .filter(c => c.status === "Rückruf")
              .sort((a, b) => {
                // Abgelaufene Rückrufe zuerst
                const aOverdue = a.last_contact_date && new Date(a.last_contact_date) < new Date();
                const bOverdue = b.last_contact_date && new Date(b.last_contact_date) < new Date();
                if (aOverdue && !bOverdue) return -1;
                if (!aOverdue && bOverdue) return 1;
                return 0;
              })
              .slice(0, 5)
              .map(company => {
                const isOverdue = company.last_contact_date && new Date(company.last_contact_date) < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
                return (
              <Link key={company.id} to={`/leads/${company.id}`} className={`block px-5 py-3 hover:bg-muted/50 transition-colors ${isOverdue ? 'bg-red-50/50 border-l-2 border-red-400' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isOverdue ? 'text-red-700' : ''}`}>{company.name}</p>
                    <p className="text-xs text-muted-foreground">{company.telefon}</p>
                    {isOverdue && <p className="text-[10px] text-red-500 font-medium">⚠️ Seit 2+ Tagen kein Kontakt</p>}
                  </div>
                  <StatusBadge status={company.status} />
                </div>
              </Link>
                );
              })}
            {myCompanies.filter(c => c.status === "Rückruf").length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Keine Rückrufe offen
              </div>
            )}
          </div>
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