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
  CheckCircle2,
  TrendingUp,
  Target,
  Calendar,
  Star,
  Zap,
  Activity
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import { Button } from "@/components/ui/button";
import moment from "moment";

export default function Dashboard() {
  const { user, org, filterCompanies, loading: filterLoading } = useLeadsFilter();
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

  // Pipeline stats
  const pipelineStats = {
    neu: myCompanies.filter(c => c.status === "Neu").length,
    kontakt: myCompanies.filter(c => c.status === "Kontakt").length,
    rueckruf: myCompanies.filter(c => c.status === "Rückruf").length,
    termin: myCompanies.filter(c => c.status === "Termin").length,
    angebot: myCompanies.filter(c => c.status === "Angebot").length,
    gewonnen: myCompanies.filter(c => c.status === "Gewonnen").length,
  };

  // Hot leads
  const hotLeads = myCompanies.filter(c => c.is_hot || c.priority_score > 70).slice(0, 5);

  // Weekly progress (contacts made this week)
  const thisWeekStart = moment().startOf("week");
  const contactsThisWeek = myCompanies.filter(c => 
    c.last_contact_date && moment(c.last_contact_date).isAfter(thisWeekStart)
  ).length;
  const weeklyGoal = 20; // Default goal
  const weeklyProgress = Math.min(100, Math.round((contactsThisWeek / weeklyGoal) * 100));

  return (
    <div className="space-y-6">
      {/* Header with greeting */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-foreground">
          {moment().hour() < 12 ? "Guten Morgen" : moment().hour() < 18 ? "Guten Tag" : "Guten Abend"}, {user?.full_name?.split(" ")[0] || "Vertriebler"} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hier ist dein Plan für heute – {moment().format("dddd, D. MMMM YYYY")}
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rückrufe</p>
              <p className="text-2xl font-bold text-foreground mt-1">{pipelineStats.rueckruf}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Heutige Aufgaben</p>
              <p className="text-2xl font-bold text-foreground mt-1">{todayTasks.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Heiße Leads</p>
              <p className="text-2xl font-bold text-foreground mt-1">{hotLeads.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Woche</p>
              <p className="text-2xl font-bold text-foreground mt-1">{contactsThisWeek}/{weeklyGoal}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Progress Bar */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Wochenziel</h2>
          </div>
          <span className="text-sm font-bold text-primary">{weeklyProgress}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${weeklyProgress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {contactsThisWeek} Kontakte diese Woche · Noch {weeklyGoal - contactsThisWeek} bis zum Ziel
        </p>
      </div>

      {/* Main Action Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Priorities */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Heute wichtig</h2>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {overdueTasks.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">{overdueTasks.length} überfällige Aufgabe(n)</p>
                  <p className="text-xs text-red-700 mt-0.5">Bitte zuerst erledigen</p>
                </div>
              </div>
            )}
            
            {todayTasks.length > 0 ? (
              <div className="space-y-2">
                {todayTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.titel}</p>
                      <p className="text-xs text-muted-foreground">{task.company_name || "Allgemein"}</p>
                    </div>
                    <Link to={`/tasks`}>
                      <ArrowRight className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Alle Aufgaben erledigt!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Keine Aufgaben für heute</p>
              </div>
            )}
          </div>
        </div>

        {/* Hot Leads */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-semibold">Heiße Leads</h2>
            </div>
            <Link to="/leads">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                Alle <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {hotLeads.length > 0 ? (
              hotLeads.map(company => (
                <Link key={company.id} to={`/leads/${company.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-400/20 to-red-500/20 border border-orange-400/30 flex items-center justify-center shrink-0">
                    {company.is_hot ? (
                      <Star className="w-4 h-4 text-orange-500" />
                    ) : (
                      <Building2 className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{company.name}</p>
                    <p className="text-xs text-muted-foreground">{company.branche || "Keine Branche"}</p>
                  </div>
                  <StatusBadge status={company.status} />
                </Link>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Keine heißen Leads vorhanden
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Pipeline-Übersicht</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: "Neu", count: pipelineStats.neu, color: "bg-blue-500" },
              { label: "Kontakt", count: pipelineStats.kontakt, color: "bg-cyan-500" },
              { label: "Rückruf", count: pipelineStats.rueckruf, color: "bg-amber-500" },
              { label: "Termin", count: pipelineStats.termin, color: "bg-purple-500" },
              { label: "Angebot", count: pipelineStats.angebot, color: "bg-orange-500" },
              { label: "Gewonnen", count: pipelineStats.gewonnen, color: "bg-emerald-500" },
            ].map(stage => (
              <Link 
                key={stage.label} 
                to={`/leads?status=${stage.label}`}
                className="flex flex-col items-center p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/40 transition-all"
              >
                <div className={`w-3 h-3 rounded-full ${stage.color} mb-2`} />
                <p className="text-lg font-bold text-foreground">{stage.count}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{stage.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Letzte Aktivitäten</h2>
          </div>
          <Link to="/leads">
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
              Alle <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        <div className="divide-y divide-border">
          {myCompanies.slice(0, 5).map(company => (
            <Link key={company.id} to={`/leads/${company.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-blue-600/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{company.name}</p>
                <p className="text-xs text-muted-foreground">
                  {company.last_contact_date 
                    ? `Letzter Kontakt: ${moment(company.last_contact_date).format("DD.MM.")}`
                    : "Neuer Lead"}
                </p>
              </div>
              <StatusBadge status={company.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}