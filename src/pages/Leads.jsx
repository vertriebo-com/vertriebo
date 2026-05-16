import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useLeadsFilter } from "../hooks/useLeadsFilter";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Filter, X, MoreVertical, Download, TrendingUp, Building2, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AddCompanyDialog from "../components/AddCompanyDialog";
import FocusCards from "../components/leads/FocusCards";
import PipelineBar from "../components/leads/PipelineBar";
import LeadRow from "../components/leads/LeadRow";
import EngineStatsBox from "../components/leads/EngineStatsBox";
import ResearchDialog from "../components/leads/ResearchDialog";
import LearnedIntelligencePanel from "../components/settings/LearnedIntelligencePanel";
import moment from "moment";

export default function Leads() {
  const { user, org, filterCompanies, loading: filterLoading } = useLeadsFilter();
  
  // ═ States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [focusFilter, setFocusFilter] = useState(null);
  const [sortBy, setSortBy] = useState("priority");
  const [showAdd, setShowAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("Alle");
  const [assignedFilter, setAssignedFilter] = useState("Alle");
  const [showArchived, setShowArchived] = useState(false);
  const [members, setMembers] = useState([]);
  const [showActions, setShowActions] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [researching, setResearching] = useState(false);
  const [newRunFilter, setNewRunFilter] = useState(null);
  const [lastEngineResult, setLastEngineResult] = useState(null);
  const [showAllLeads, setShowAllLeads] = useState(false);
  const [leadLimit, setLeadLimit] = useState(100);
  const [loadingMore, setLoadingMore] = useState(false);
  const [learnedIntelligenceLoaded, setLearnedIntelligenceLoaded] = useState(false);

  // ═ Effects
  // Parse new_run query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNewRunFilter(params.get("new_run"));
  }, []);

  const orgId = org?.id || null;
  const { data: companies = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["companies", orgId, leadLimit],
    queryFn: () => {
      console.time("[Leads] Company query");
      const result = orgId
        ? base44.entities.Company.filter({ organization_id: orgId }, "-created_date", leadLimit)
        : Promise.resolve([]);
      console.timeEnd("[Leads] Company query");
      return result;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const { data: outcomes = [] } = useQuery({
    queryKey: ["leadOutcomes", orgId],
    queryFn: () => {
      console.time("[Leads] Outcome query");
      const result = orgId
        ? base44.entities.LeadOutcome.filter({ organization_id: orgId }, "-created_date", 200)
        : Promise.resolve([]);
      console.timeEnd("[Leads] Outcome query");
      return result;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const outcomeByCompany = {};
  for (const o of [...outcomes].sort((a, b) => new Date(b.created_date) - new Date(a.created_date))) {
    if (!outcomeByCompany[o.company_id]) outcomeByCompany[o.company_id] = o.outcome_type;
  }

  useEffect(() => {
    if (orgId) {
      base44.entities.OrganizationMember.filter({ organization_id: orgId, status: "active" })
        .then(setMembers);
    }
  }, [orgId]);

  // LearnedIntelligence deferred laden (nach 2s)
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("[Leads] Enabling LearnedIntelligence after 2s");
      setLearnedIntelligenceLoaded(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // ═ Helpers & Derived Values
  const loadData = () => refetch();
  const isAdmin = user?.role === "admin" || user?.org_role === "organization_admin" || (org && org.owner_email === user?.email);

  const applySort = (arr) => {
    const sorted = [...arr];
    switch (sortBy) {
      case "name": return sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      case "score": return sorted.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
      case "created": return sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      case "last_contact": return sorted.sort((a, b) => new Date(b.last_contact_date || 0) - new Date(a.last_contact_date || 0));
      default: return sorted.sort((a, b) => {
        if (a.is_hot && !b.is_hot) return -1;
        if (!a.is_hot && b.is_hot) return 1;
        const statusPrio = { "Rückruf": 0, "Termin": 1, "Angebot": 2, "Kontakt": 3, "Neu": 4, "Gewonnen": 5, "Verloren": 6 };
        return (statusPrio[a.status] ?? 9) - (statusPrio[b.status] ?? 9);
      });
    }
  };

  const filtered = useMemo(() => {
    console.time("[Leads] filter + sort");
    const result = applySort(
      filterCompanies(companies).filter(c => {
        if (!showArchived && ["Gewonnen", "Verloren"].includes(c.status)) return false;
        if (statusFilter && c.status !== statusFilter) return false;
        if (priorityFilter !== "Alle") {
          const score = c.priority_score || 0;
          if (priorityFilter === "Hoch" && score < 60) return false;
          if (priorityFilter === "Mittel" && (score < 30 || score >= 60)) return false;
          if (priorityFilter === "Niedrig" && score >= 30) return false;
        }
        if (assignedFilter !== "Alle" && c.assigned_to !== assignedFilter) return false;
        if (newRunFilter && c.research_run_id !== newRunFilter) return false;
        
        // Focus Filters
        const today = moment().format("YYYY-MM-DD");
        const weekAgo = moment().subtract(7, "days").toISOString();
        if (focusFilter === "call_today" && !(c.last_contact_date && c.last_contact_date.startsWith(today))) return false;
        if (focusFilter === "callback_open" && c.status !== "Rückruf") return false;
        if (focusFilter === "hot_leads" && !c.is_hot) return false;
        if (focusFilter === "new_this_week" && !(c.created_date && c.created_date >= weekAgo)) return false;
        
        if (search) {
          const s = search.toLowerCase();
          return (c.name?.toLowerCase().includes(s) || c.branche?.toLowerCase().includes(s) || c.ort?.toLowerCase().includes(s));
        }
        return true;
      })
    );
    console.timeEnd("[Leads] filter + sort");
    return result;
  }, [companies, filterCompanies, showArchived, statusFilter, priorityFilter, assignedFilter, newRunFilter, focusFilter, search]);

  // Pagination: Nur erste 50 initial, danach alle
  const visibleLeads = useMemo(() => {
    console.time("[Leads] visibleLeads slice");
    const result = showAllLeads ? filtered : filtered.slice(0, 50);
    console.timeEnd("[Leads] visibleLeads slice");
    return result;
  }, [filtered, showAllLeads]);

  const handleCsvExport = () => {
    const headers = ["Name","Branche","Telefon","E-Mail","Status","Priorität"];
    const rows = filtered.map(c => [c.name, c.branche, c.telefon, c.email, c.status, c.priority_score].map(v => `"${v || ""}"`).join(","));
    const blob = new Blob(["\uFEFF" + [headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleAnalyzeLatest = async () => {
    if (!orgId || researching) return;
    try {
      setResearching(true);
      toast.info("Vertriebo Engine analysiert die neuesten Leads…");

      const result = await base44.functions.invoke("analyzeLeadEngine", {
        organization_id: orgId,
        mode: "latest",
        limit: 10
      });

      if (result?.data?.success) {
        const analyzed = result.data.analyzed_count || result.data.analyzed || 0;
        toast.success(`${analyzed} Leads analysiert. Hot/Warm/Cold wurde aktualisiert.`);
        setLastEngineResult({
          analyzed,
          at: new Date().toISOString()
        });
        await refetch();
      } else {
        toast.error(result?.data?.error || "Die Vertriebo Engine konnte nicht gestartet werden.");
      }
    } catch (error) {
      console.error("[Leads] Engine analysis error:", error);
      toast.error(error?.message || "Analyse fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setResearching(false);
    }
  };



  if (loading || filterLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm font-medium text-slate-700 mt-1">
            {filtered.length < companies.length
              ? `${filtered.length} von ${companies.length} geladenen Kontakten angezeigt`
              : `${companies.length} Kontakte geladen`}
            {filtered.filter(c => c.status === "Rückruf").length > 0 && ` · ${filtered.filter(c => c.status === "Rückruf").length} Rückrufe offen`}
            {companies.length >= leadLimit && (
              <button
                onClick={async () => { setLoadingMore(true); setLeadLimit(l => l + 100); setLoadingMore(false); }}
                className="ml-3 text-blue-600 hover:text-blue-700 underline font-semibold"
              >
                Weitere laden
              </button>
            )}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowResearch(true)}
            className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-3 rounded-2xl shadow-md hover:shadow-lg transition-all group shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold leading-tight">Firmen recherchieren</div>
              <div className="text-[11px] text-blue-200 font-medium leading-tight">Vertriebo Lead-Recherche</div>
            </div>
          </button>
        )}
      </div>

      {/* Vertriebo Engine Stats */}
      <EngineStatsBox companies={filtered} onAnalyzeLatest={isAdmin ? handleAnalyzeLatest : null} analyzingLatest={researching} lastEngineResult={lastEngineResult} />

      {/* LearnedIntelligence Widget – Deferred laden */}
      {learnedIntelligenceLoaded && (
        <LearnedIntelligencePanel organizationId={orgId} />
      )}
      {!learnedIntelligenceLoaded && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm text-center text-sm text-slate-500">
          Intelligente Signale werden geladen…
        </div>
      )}

      {/* Focus Cards */}
      <FocusCards companies={companies} activeFocus={focusFilter} onFilterClick={setFocusFilter} />

      {/* Pipeline Bar */}
      <PipelineBar companies={companies} activeStatus={statusFilter} onStatusClick={setStatusFilter} />

      {/* Search + Actions */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Firma, Branche oder Ort suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border border-[#E2E8F0] text-slate-900 placeholder:text-slate-500 focus:border-blue-400"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-40 bg-white border border-[#E2E8F0] text-slate-900">
              <SelectValue placeholder="Sortieren" />
            </SelectTrigger>
            <SelectContent>
              {[{value:"priority",label:"Priorität"},{value:"name",label:"Name A–Z"},{value:"created",label:"Neueste"},{value:"last_contact",label:"Letzter Kontakt"}].map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline" className="gap-2 bg-white border border-[#E2E8F0] text-slate-700 hover:bg-slate-50">
            <Filter className="w-3.5 h-3.5" /> Filter
          </Button>
          <div className="flex-1" />
          <Button onClick={() => setShowAdd(true)} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm shrink-0">
            <Plus className="w-4 h-4" /> Neuer Lead
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowActions(!showActions)} className="gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
              <MoreVertical className="w-3.5 h-3.5" /> Mehr
            </Button>
            {showActions && (
              <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {isAdmin && (
                  <a href="/import" onClick={() => setShowActions(false)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <Upload className="w-4 h-4" /> CSV importieren
                  </a>
                )}
                <button onClick={() => { handleCsvExport(); setShowActions(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <Download className="w-4 h-4" /> Exportieren
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="grid sm:grid-cols-3 gap-3 pt-3 border-t border-border">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger><SelectValue placeholder="Priorität" /></SelectTrigger>
              <SelectContent>{["Alle","Hoch","Mittel","Niedrig"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger><SelectValue placeholder="Vertriebler" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Alle">Alle Vertriebler</SelectItem>
                {members.map(m => <SelectItem key={m.id} value={m.user_email}>{m.user_email}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
              Archivierte anzeigen
            </label>
          </div>
        )}

        {/* Active Filters */}
        {(statusFilter || focusFilter || priorityFilter !== "Alle" || assignedFilter !== "Alle" || search || newRunFilter) && (
          <div className="flex flex-wrap gap-2">
            {statusFilter && <button onClick={() => setStatusFilter(null)} className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full hover:bg-primary/20"><span>{statusFilter}</span><X className="w-3 h-3"/></button>}
            {focusFilter && <button onClick={() => setFocusFilter(null)} className="inline-flex items-center gap-1 text-xs font-medium bg-muted text-muted-foreground border border-border px-2.5 py-1 rounded-full"><span>{focusFilter}</span><X className="w-3 h-3"/></button>}
            {priorityFilter !== "Alle" && <button onClick={() => setPriorityFilter("Alle")} className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full"><span>Priorität: {priorityFilter}</span><X className="w-3 h-3"/></button>}
            {assignedFilter !== "Alle" && <button onClick={() => setAssignedFilter("Alle")} className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full"><span>Vertriebler: {assignedFilter}</span><X className="w-3 h-3"/></button>}
            {newRunFilter && <button onClick={() => setNewRunFilter(null)} className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full"><span>Neue Leads aus letzter Recherche</span><X className="w-3 h-3"/></button>}
            {search && <button onClick={() => setSearch("")} className="inline-flex items-center gap-1 text-xs font-medium bg-muted text-muted-foreground border border-border px-2.5 py-1 rounded-full"><span>Suche</span><X className="w-3 h-3"/></button>}
          </div>
        )}
      </div>

      {/* Leads List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-16 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Keine Leads gefunden</h3>
          <p className="text-sm text-slate-600 mb-6">
            {companies.length === 0 ? "Noch keine Firmenkontakte vorhanden." : "Filter anpassen oder neuen Lead hinzufügen."}
          </p>
          {companies.length === 0 ? (
           <div className="flex flex-col gap-3 max-w-sm mx-auto">
             <Button size="lg" onClick={() => setShowResearch(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm w-full">
               <TrendingUp className="w-4 h-4" /> Firmen automatisch recherchieren
             </Button>
             {isAdmin && (
               <a href="/import" className="w-full">
                 <Button variant="outline" size="lg" className="gap-2 border border-[#E2E8F0] w-full">
                   <Upload className="w-4 h-4" /> CSV/Excel importieren
                 </Button>
               </a>
             )}
            </div>
           ) : (
             <Button variant="outline" onClick={() => { setStatusFilter(null); setFocusFilter(null); setSearch(""); }} className="gap-2 border border-[#E2E8F0]">Filter zurücksetzen</Button>
           )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleLeads.map(company => (
            <LeadRow key={company.id} company={company} isAdmin={isAdmin} onLogged={loadData} outcome={outcomeByCompany[company.id] || null} />
          ))}

          {/* Seitenweise anzeigen (innerhalb geladener Kontakte) */}
          {!showAllLeads && filtered.length > 50 && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setShowAllLeads(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50"
              >
                {filtered.length - 50} weitere angezeigte Kontakte einblenden
              </button>
            </div>
          )}

          {/* Weitere Kontakte vom Server nachladen */}
          {companies.length >= leadLimit && (
            <div className="flex flex-col items-center pt-6 gap-2">
              <button
                onClick={() => { setLeadLimit(l => l + 100); setShowAllLeads(false); }}
                disabled={loadingMore}
                className="px-5 py-2.5 text-sm font-semibold text-blue-600 hover:text-blue-700 border border-blue-300 rounded-xl hover:bg-blue-50 disabled:opacity-50"
              >
                {loadingMore ? "Wird geladen…" : "Weitere 100 Kontakte laden"}
              </button>
              <p className="text-xs text-slate-500">Aktuell {companies.length} Kontakte geladen</p>
            </div>
          )}
        </div>
      )}

      <AddCompanyDialog open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadData} />
      <ResearchDialog
        open={showResearch}
        orgId={orgId}
        onClose={() => setShowResearch(false)}
        onSuccess={() => { refetch(); setShowResearch(false); }}
      />
    </div>
  );
}