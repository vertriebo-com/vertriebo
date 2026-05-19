import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { useLeadsFilter } from "../hooks/useLeadsFilter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Building2, ArrowRight, PhoneCall, Star, Flame,
  TrendingUp, Calendar, RefreshCw, Search, AlertCircle, Zap,
  CheckCircle2
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import moment from "moment";
import "moment/locale/de";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import DailyActionList from "@/components/dashboard/DailyActionList";
import DashboardPrimaryAction from "@/components/dashboard/DashboardPrimaryAction";
import ActiveResearchBanner from "@/components/leads/ActiveResearchBanner";
import TrialStatusBanner from "@/components/TrialStatusBanner";

export default function Dashboard() {
  const { user: authUser, org: authOrg, loading: orgLoading } = useLeadsFilter();
  const navigate = useNavigate();

  // orgData direkt aus useLeadsFilter – kein separates useState das den Initialwert einfriert
  const orgData = authOrg;

  // Für Checkout-Polling: lokaler Override-State nur wenn Billing-Refresh nötig
  const [orgOverride, setOrgOverride] = useState(null);
  const activeOrg = orgOverride || orgData;

  // Auto-refresh Org nach erfolgreichem Checkout
  useEffect(() => {
    const handleCheckoutSuccess = async () => {
      if (activeOrg?.id) {
        try {
          const orgs = await base44.entities.Organization.filter({ id: activeOrg.id });
          if (orgs[0]) setOrgOverride(orgs[0]);
        } catch {}
      }
    };
    window.addEventListener('checkout-success', handleCheckoutSuccess);

    // Checkout-URL-Polling
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success' && activeOrg?.id) {
      let pollCount = 0;
      const pollWebhookStatus = async () => {
        pollCount++;
        try {
          const orgs = await base44.entities.Organization.filter({ id: activeOrg.id });
          const freshOrg = orgs[0];
          if (freshOrg) {
            setOrgOverride(freshOrg);
            const isPaid = freshOrg.billing_status === 'active' && freshOrg.trial_stage === 'paid';
            if (isPaid || pollCount >= 40) {
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              setTimeout(pollWebhookStatus, 1500);
            }
          }
        } catch {}
      };
      pollWebhookStatus();
    }
    return () => window.removeEventListener('checkout-success', handleCheckoutSuccess);
  }, [activeOrg?.id]);

  const queryClient = useQueryClient();

  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-data", activeOrg?.id],
    queryFn: async () => {
      if (!activeOrg?.id) throw new Error('No organization');
      // org_id explizit übergeben → Backend validiert Zugehörigkeit
      const response = await base44.functions.invoke('getDashboardData', { org_id: activeOrg.id });
      return response.data;
    },
    enabled: !orgLoading && !!activeOrg?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
    placeholderData: null,
  });

  // Auto-Refresh beim Fokus
  useEffect(() => {
    const handleFocus = () => refetch();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  // Personalisierter Vorname
  const [displayName, setDisplayName] = useState("");
  useEffect(() => {
    if (!orgData?.id) return;
    base44.entities.OrganizationSettings.filter({ organization_id: orgData.id, key: "contact_name" })
      .then(settings => {
        const saved = settings?.[0]?.value?.trim();
        if (saved) {
          setDisplayName(saved);
        } else {
          const authName = (dashboardData?.user?.full_name || authUser?.full_name)?.split(" ")[0]?.trim();
          setDisplayName(authName || "");
        }
      })
      .catch(() => {
        const authName = (dashboardData?.user?.full_name || authUser?.full_name)?.split(" ")[0]?.trim();
        setDisplayName(authName || "");
      });
  }, [orgData?.id, dashboardData?.user?.full_name]);

  if (orgLoading || (isLoading && !dashboardData)) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Fehler beim Laden</p>
          <Button onClick={() => window.location.reload()} size="sm">Neu laden</Button>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const data = dashboardData?.data || {};
  const meta = dashboardData?.meta || {};
  const org = dashboardData?.org || activeOrg;

  const pipelineStats = stats.pipelineStats || {};
  const hotLeads = data.hotLeads || [];
  const todayTasks = data.todayTasks || [];
  const overdueTasks = data.overdueTasks || [];
  const actionableLeads = data.actionableLeads || [];
  const newLeadsFromResearch = data.newLeadsFromResearch || [];
  const totalLeads = meta.totalCompanies || 0;
  const contactsThisWeek = stats.contactsThisWeek || 0;
  const weeklyGoal = stats.weeklyGoal || 20;
  const weeklyProgress = Math.min(100, Math.round((contactsThisWeek / weeklyGoal) * 100));

  const greeting = moment().hour() < 12 ? "Guten Morgen" : moment().hour() < 18 ? "Guten Tag" : "Guten Abend";

  const handleUpgrade = () => navigate('/settings?tab=billing');
  const handleManagePlan = () => navigate('/settings?tab=billing');

  return (
    <div className="space-y-5 pb-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}{displayName ? `, ${displayName}` : ""} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {moment().locale("de").format("dddd, D. MMMM")}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-blue-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Aktualisieren</span>
        </button>
      </div>

      {/* Trial / Billing Banner */}
      {org && (org.trial_stage !== 'paid' || org.billing_status !== 'active') && (
        <TrialStatusBanner
          trial_stage={org.trial_stage}
          billing_status={org.billing_status}
          trial_leads_granted={org.trial_leads_granted || 0}
          onUpgrade={handleUpgrade}
          onManagePlan={handleManagePlan}
          usageInfo={meta.currentUsage}
        />
      )}

      {/* Active Research Banner */}
      {activeOrg?.id && (
        <ActiveResearchBanner
          orgId={activeOrg.id}
          onNewLeads={() => refetch()}
        />
      )}

      {/* Neue Leads aus Recherche */}
      {newLeadsFromResearch.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900">
                  {stats.newLeadsFromResearchCount || newLeadsFromResearch.length} neue Leads gefunden
                </p>
                <p className="text-xs text-emerald-700">Aus Ihrer letzten Recherche – bereit zur Bearbeitung</p>
              </div>
            </div>
            <Link to="/leads?new_run=latest">
              <Button variant="outline" size="sm" className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs">
                Ansehen <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Primary Action – Heute zuerst */}
      <DashboardPrimaryAction
        actionableLeads={actionableLeads}
        totalLeads={totalLeads}
      />

      {/* KPI-Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to="/leads" className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lead-Bestand</p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalLeads}</p>
        </Link>

        <Link to="/leads?temperature=hot" className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm hover:shadow-md hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Heiße Leads</p>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{hotLeads.length}</p>
        </Link>

        <Link to="/tasks" className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Aufgaben heute</p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{todayTasks.length}</p>
          {overdueTasks.length > 0 && (
            <p className="text-[11px] font-semibold text-red-500 mt-0.5">{overdueTasks.length} überfällig</p>
          )}
        </Link>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Wochenziel</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{weeklyProgress}%</p>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${weeklyProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{contactsThisWeek} / {weeklyGoal} Leads kontaktiert</p>
        </div>
      </div>

      {/* Hauptbereich: Tagesplan + Heiße Leads */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Tagesplan / Actionable Leads */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-900">Heute wichtig</h2>
            {(todayTasks.length + overdueTasks.length) > 0 && (
              <span className="ml-auto text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                {todayTasks.length + overdueTasks.length} Aufgaben
              </span>
            )}
          </div>
          <div className="p-4">
            <DailyActionList
              actionableLeads={actionableLeads}
              todayTasksCount={todayTasks.length}
              overdueTasksCount={overdueTasks.length}
            />
          </div>
        </div>

        {/* Heiße Leads */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-slate-900">Heiße Leads</h2>
            <Link to="/leads" className="ml-auto">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-slate-500 hover:text-slate-800">
                Alle <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {hotLeads.length > 0 ? (
              hotLeads.map(company => (
                <Link
                  key={company.id}
                  to={`/leads/${company.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-orange-50/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-100 to-red-100 border border-orange-200 flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{company.name}</p>
                    <p className="text-xs text-slate-500 truncate">{company.branche || company.ort || "Lead"}</p>
                  </div>
                  <StatusBadge status={company.status} />
                </Link>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <Flame className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  {totalLeads > 0 ? "Noch keine heißen Leads erkannt" : "Noch keine Leads vorhanden"}
                </p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  {totalLeads > 0
                    ? "Analysieren Sie Ihre Leads, damit Vertriebo heiße Kontakte erkennt."
                    : "Starten Sie eine Recherche, um erste Firmenkontakte zu finden."}
                </p>
                <div className="flex flex-col items-center gap-2">
                  {totalLeads > 0 && (
                    <Link to="/leads">
                      <Button size="sm" className="gap-2 text-xs bg-orange-500 hover:bg-orange-600 text-white">
                        <Zap className="w-3.5 h-3.5" />
                        Zur Lead-Übersicht
                      </Button>
                    </Link>
                  )}
                  <Link to="/leads">
                    <Button size="sm" variant="outline" className="gap-2 text-xs">
                      <Search className="w-3.5 h-3.5" />
                      Zur Lead-Übersicht
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline-Übersicht */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-sm font-semibold text-slate-900">Pipeline</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
            {[
              { label: "Neu", count: pipelineStats.neu, color: "bg-blue-500", hover: "hover:border-blue-200 hover:bg-blue-50" },
              { label: "Kontakt", count: pipelineStats.kontakt, color: "bg-cyan-500", hover: "hover:border-cyan-200 hover:bg-cyan-50" },
              { label: "Rückruf", count: pipelineStats.rueckruf, color: "bg-amber-500", hover: "hover:border-amber-200 hover:bg-amber-50" },
              { label: "Termin", count: pipelineStats.termin, color: "bg-violet-500", hover: "hover:border-violet-200 hover:bg-violet-50" },
              { label: "Angebot", count: pipelineStats.angebot, color: "bg-orange-500", hover: "hover:border-orange-200 hover:bg-orange-50" },
              { label: "Gewonnen", count: pipelineStats.gewonnen, color: "bg-emerald-500", hover: "hover:border-emerald-200 hover:bg-emerald-50" },
            ].map(stage => (
              <Link
                key={stage.label}
                to={`/leads?status=${stage.label}`}
                className={`flex flex-col items-center p-3 rounded-lg border border-[#E2E8F0] transition-all ${stage.hover}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${stage.color} mb-2`} />
                <p className="text-xl font-bold text-slate-900">{stage.count ?? 0}</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5 text-center">{stage.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Usage-Info (nur wenn Plan vorhanden) */}
      {activeOrg?.plan_id && meta?.currentUsage && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700">
              {meta.planName || "Plan"} · <span className="font-normal text-slate-500">Monatskontingent</span>
            </p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {meta.currentUsage?.leads_created || 0}
              {meta.maxContacts && meta.maxContacts !== -1 && (
                <span className="font-normal text-slate-500"> von {meta.maxContacts} neuen Leads genutzt</span>
              )}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Gesamtbestand: {totalLeads} Leads im CRM</p>
          </div>
          {meta.maxContacts && meta.maxContacts !== -1 && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((meta.currentUsage?.leads_created || 0) / meta.maxContacts) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {Math.max(0, meta.maxContacts - (meta.currentUsage?.leads_created || 0))} verbleibend
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}