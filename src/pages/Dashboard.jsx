import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useLeadsFilter } from "../hooks/useLeadsFilter";
import TrialStatusBanner from "@/components/TrialStatusBanner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Building2,
  ArrowRight,
  PhoneCall,
  CheckCircle2,
  TrendingUp,
  Target,
  Calendar,
  Star,
  Zap,
  Activity,
  RefreshCw
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import moment from "moment";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import DailyActionList from "@/components/dashboard/DailyActionList";

export default function Dashboard() {
  const { user: authUser, org: authOrg } = useLeadsFilter();
  const [orgData, setOrgData] = useState(authOrg || null);
  const [userData, setUserData] = useState(authUser || null);

  // Auto-refresh Org nach erfolgreichem Checkout + URL-Check mit Polling
  useEffect(() => {
    const handleCheckoutSuccess = async () => {
      if (orgData?.id) {
        try {
          const orgs = await base44.entities.Organization.filter({ id: orgData.id });
          if (orgs[0]) setOrgData(orgs[0]);
        } catch (e) { console.warn('[Dashboard] Org refresh failed:', e); }
      }
    };
    
    window.addEventListener('checkout-success', handleCheckoutSuccess);

    // URL-Check: Wenn ?checkout=success → polln bis Webhook durch ist
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success' && orgData?.id) {
      console.log('[Dashboard] Checkout-URL erkannt, starte Polling für Webhook...');
      let pollCount = 0;
      const maxPolls = 40;

      const pollWebhookStatus = async () => {
        pollCount++;
        try {
          const orgs = await base44.entities.Organization.filter({ id: orgData.id });
          const freshOrg = orgs[0];
          if (freshOrg) {
            setOrgData(freshOrg);
            console.log(`[Dashboard] Poll ${pollCount}/${maxPolls}: billing_status="${freshOrg.billing_status}" trial_stage="${freshOrg.trial_stage}"`);

            const isPaid = freshOrg.billing_status === 'active' && freshOrg.trial_stage === 'paid';
            const isVerifiedTrial = freshOrg.trial_stage === 'verified_trial';
            
            if (isPaid || isVerifiedTrial) {
              console.log(`[Dashboard] Webhook-Verarbeitung bestätigt. Polling beendet.`);
              window.history.replaceState({}, document.title, window.location.pathname);
            } else if (pollCount < maxPolls) {
              setTimeout(pollWebhookStatus, 1500);
            } else {
              console.warn('[Dashboard] Polling-Timeout.');
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        } catch (e) { console.warn('[Dashboard] Polling-Fehler:', e); }
      };
      pollWebhookStatus();
    }
    
    return () => window.removeEventListener('checkout-success', handleCheckoutSuccess);
  }, [orgData?.id]);

  const queryClient = useQueryClient();

  // OPTIMIERT: Single API-Call für alle Dashboard-Daten
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-data", orgData?.id],
    queryFn: async () => {
      if (!orgData?.id) throw new Error('No organization');
      const response = await base44.functions.invoke('getDashboardData', {});
      return response.data;
    },
    enabled: !!orgData?.id,
    staleTime: 10_000, // 10 Sekunden Cache für frischere Daten
    placeholderData: null,
  });

  // Auto-Refresh beim Fokus (wenn User zurück zum Dashboard kommt)
  useEffect(() => {
    const handleFocus = () => {
      console.log('[Dashboard] Window focus - refetching data');
      refetch();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  // Daten aus aggregiertem Response extrahieren
  const user = dashboardData?.user || userData;
  const stats = dashboardData?.stats || {};
  const data = dashboardData?.data || {};
  const meta = dashboardData?.meta || {};

  const loading = isLoading;

  // Zeige Skeleton sofort, während Daten im Hintergrund laden
  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Fehler beim Laden</p>
          <p className="text-sm text-muted-foreground">{error.message || error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Neu laden
          </button>
        </div>
      </div>
    );
  }

  // Daten direkt aus aggregiertem Response verwenden
  const pipelineStats = stats.pipelineStats || {};
  const hotLeads = data.hotLeads || [];
  const todayTasks = data.todayTasks || [];
  const overdueTasks = data.overdueTasks || [];
  const recentActivities = data.recentActivities || [];
  const actionableLeads = data.actionableLeads || [];
  const newLeadsFromResearch = data.newLeadsFromResearch || [];
  const contactsThisWeek = stats.contactsThisWeek || 0;
  const weeklyGoal = stats.weeklyGoal || 20;
  const weeklyProgress = Math.min(100, Math.round((contactsThisWeek / weeklyGoal) * 100));

  return (
    <div className="space-y-6">
      {/* Usage Info Banner */}
      {orgData?.plan_id && dashboardData?.meta?.currentUsage && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-blue-600 font-semibold text-sm">{dashboardData?.meta?.planName || "Plan"}</span>
            <span className="text-slate-500 text-sm">·</span>
            <span className="text-slate-700 text-sm">
              {dashboardData?.meta?.currentUsage?.leads_created || 0} von {dashboardData?.meta?.maxContacts || 300} Kontakten diesen Monat
            </span>
          </div>
          <div className="w-48 h-2 bg-blue-100 rounded-full overflow-hidden">
            <div 
              className="h-2 bg-blue-500 rounded-full"
              style={{ width: `${Math.min(100, ((dashboardData?.meta?.currentUsage?.leads_created || 0) / (dashboardData?.meta?.maxContacts || 300)) * 100)}%` }}
            />
          </div>
          <span className="text-sm text-slate-500">{Math.max(0, (dashboardData?.meta?.maxContacts || 300) - (dashboardData?.meta?.currentUsage?.leads_created || 0))} verfügbar</span>
        </div>
      )}

      {/* Header with greeting */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">
          {moment().hour() < 12 ? "Guten Morgen" : moment().hour() < 18 ? "Guten Tag" : "Guten Abend"}, {user?.full_name?.split(" ")[0] || "Vertriebler"} 👋
        </h1>
        <p className="text-sm font-medium text-slate-700 mt-1">
          {moment().format("dddd, D. MMMM YYYY")}
        </p>
      </div>

      {/* Neue Leads aus Recherche */}
      {newLeadsFromResearch.length > 0 ? (
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">✨ Neu</p>
              <p className="text-sm font-bold text-emerald-900 mt-1">
                {stats.newLeadsFromResearchCount || newLeadsFromResearch.length} neue Firmenkontakte
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">Aus Ihrer letzten Recherche</p>
            </div>
            <Link to="/leads?new_run=latest">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                Ansehen <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      ) : null}

      {/* Quick Stats Row – Mobile responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wide">Rückrufe</p>
              {loading ? (
                <Skeleton className="h-10 w-12 mt-2" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 sm:mt-2">{pipelineStats.rueckruf}</p>
              )}
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wide">Heute</p>
              {loading ? (
                <Skeleton className="h-10 w-12 mt-2" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 sm:mt-2">{todayTasks.length}</p>
              )}
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wide">Heiße Leads</p>
              {loading ? (
                <Skeleton className="h-10 w-12 mt-2" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 sm:mt-2">{hotLeads.length}</p>
              )}
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wide">Diese Woche</p>
              {loading ? (
                <Skeleton className="h-10 w-20 mt-2" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 sm:mt-2">{contactsThisWeek}/{weeklyGoal}</p>
              )}
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Progress Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">Wochenziel</h2>
          </div>
          {loading ? (
            <Skeleton className="h-6 w-12" />
          ) : (
            <span className="text-lg font-bold text-blue-600">{weeklyProgress}%</span>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-2.5 w-full rounded-full" />
        ) : (
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${weeklyProgress}%` }}
            />
          </div>
        )}
        {loading ? (
          <Skeleton className="h-3 w-32 mt-3" />
        ) : (
          <p className="text-xs font-medium text-slate-700 mt-3">
            {contactsThisWeek} Kontakte · {weeklyGoal - contactsThisWeek} bis zum Ziel
          </p>
        )}
      </div>

      {/* Main Action Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Priorities */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">Heute wichtig</h2>
            </div>
            <button
              onClick={() => refetch()}
              className="text-xs font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1"
              title="Daten aktualisieren"
            >
              <RefreshCw className="w-3 h-3" /> Aktualisieren
            </button>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Skeleton className="w-4 h-4 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <DailyActionList
                actionableLeads={actionableLeads}
                todayTasksCount={todayTasks.length}
                overdueTasksCount={overdueTasks.length}
              />
            )}
          </div>
        </div>

        {/* Hot Leads */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-orange-600" />
              <h2 className="text-sm font-semibold text-slate-900">Heiße Leads</h2>
            </div>
            <Link to="/leads">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-slate-700 hover:text-slate-900">
                Alle <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {loading ? (
              // Loading Skeleton
              [1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="w-16 h-6 rounded" />
                </div>
              ))
            ) : hotLeads.length > 0 ? (
              hotLeads.map(company => (
                <Link key={company.id} to={`/leads/${company.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-400/20 to-red-500/20 border border-orange-400/30 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{company.name}</p>
                    <p className="text-xs text-slate-700">{company.branche || "Keine Branche"}</p>
                  </div>
                  <StatusBadge status={company.status} />
                </Link>
              ))
            ) : (
              <div className="px-5 py-12 text-center">
                <Star className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-900">Keine heißen Leads</p>
                <p className="text-xs font-medium text-slate-700 mt-1">Alle Leads sehen gut aus</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-sm font-semibold text-slate-900">Pipeline-Übersicht</h2>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex flex-col items-center p-3 rounded-lg border border-slate-200">
                  <Skeleton className="w-3 h-3 rounded-full mb-2" />
                  <Skeleton className="h-6 w-8 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : (
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
                  className="flex flex-col items-center p-3 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <div className={`w-3 h-3 rounded-full ${stage.color} mb-2`} />
                  <p className="text-lg font-bold text-slate-900">{stage.count}</p>
                  <p className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide mt-1">{stage.label}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">Letzte Aktivitäten</h2>
          </div>
          <Link to="/leads">
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-slate-700 hover:text-slate-900">
              Alle <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
        <div className="divide-y divide-[#E2E8F0]">
          {loading ? (
            // Loading Skeleton
            [1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="w-16 h-6 rounded" />
              </div>
            ))
          ) : (
            recentActivities.map(company => (
              <Link key={company.id} to={`/leads/${company.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600/20 to-blue-600/10 border border-blue-600/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{company.name}</p>
                  <p className="text-xs text-slate-700">
                    {company.last_contact_date 
                      ? `Letzter Kontakt: ${moment(company.last_contact_date).format("DD.MM.")}`
                      : "Neuer Lead"}
                  </p>
                </div>
                <StatusBadge status={company.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}