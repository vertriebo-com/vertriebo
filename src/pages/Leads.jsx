import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLeadsFilter } from "../hooks/useLeadsFilter";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Filter, X, MoreVertical, Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddCompanyDialog from "../components/AddCompanyDialog";
import FocusCards from "../components/leads/FocusCards";
import PipelineBar from "../components/leads/PipelineBar";
import LeadRow from "../components/leads/LeadRow";
import moment from "moment";

export default function Leads() {
  const { user, org, filterCompanies, loading: filterLoading } = useLeadsFilter();
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

  const orgId = org?.id || null;
  const { data: companies = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["companies", orgId],
    queryFn: () => orgId
      ? base44.entities.Company.filter({ organization_id: orgId }, "-created_date", 500)
      : Promise.resolve([]),
    enabled: !!orgId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (orgId) {
      base44.entities.OrganizationMember.filter({ organization_id: orgId, status: "active" })
        .then(setMembers);
    }
  }, [orgId]);

  const loadData = () => refetch();
  const isAdmin = user?.role === "admin" || user?.role === "organization_admin";

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

  const filtered = applySort(
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

  const handleCsvExport = () => {
    const headers = ["Name","Branche","Telefon","E-Mail","Status","Priorität"];
    const rows = filtered.map(c => [c.name, c.branche, c.telefon, c.email, c.status, c.priority_score].map(v => `"${v || ""}"`).join(","));
    const blob = new Blob(["\uFEFF" + [headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
    URL.revokeObjectURL(url);
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Leads</h1>
        <p className="text-sm font-medium text-slate-700 mt-1">
          {filtered.length} von {companies.length} Firmen · {filtered.filter(c => c.status === "Rückruf").length} Rückrufe offen
        </p>
      </div>

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
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Neuer Lead
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowActions(!showActions)} className="gap-1.5 bg-white border border-[#E2E8F0] text-slate-700 hover:bg-slate-50">
              <MoreVertical className="w-3.5 h-3.5" /> Mehr
            </Button>
            {showActions && (
              <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden">
                {isAdmin && (
                  <a href="/import" onClick={() => setShowActions(false)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    <TrendingUp className="w-4 h-4" /> Firmen recherchieren
                  </a>
                )}
                <button onClick={() => { handleCsvExport(); setShowActions(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <Download className="w-4 h-4" /> CSV Export
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
        {(statusFilter || focusFilter || priorityFilter !== "Alle" || assignedFilter !== "Alle" || search) && (
          <div className="flex flex-wrap gap-2">
            {statusFilter && <button onClick={() => setStatusFilter(null)} className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full hover:bg-primary/20"><span>{statusFilter}</span><X className="w-3 h-3"/></button>}
            {focusFilter && <button onClick={() => setFocusFilter(null)} className="inline-flex items-center gap-1 text-xs font-medium bg-muted text-muted-foreground border border-border px-2.5 py-1 rounded-full"><span>{focusFilter}</span><X className="w-3 h-3"/></button>}
            {priorityFilter !== "Alle" && <button onClick={() => setPriorityFilter("Alle")} className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full"><span>Priorität: {priorityFilter}</span><X className="w-3 h-3"/></button>}
            {assignedFilter !== "Alle" && <button onClick={() => setAssignedFilter("Alle")} className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full"><span>Vertriebler: {assignedFilter}</span><X className="w-3 h-3"/></button>}
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
           <div className="flex flex-col sm:flex-row gap-3 justify-center">
             <Button size="lg" onClick={() => setShowAdd(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"><Plus className="w-4 h-4" /> Ersten Lead anlegen</Button>
             {isAdmin && <a href="/import"><Button variant="outline" size="lg" className="gap-2 border border-[#E2E8F0]"><TrendingUp className="w-4 h-4" /> Firmen recherchieren</Button></a>}
           </div>
          ) : (
            <Button variant="outline" onClick={() => { setStatusFilter(null); setFocusFilter(null); setSearch(""); }} className="gap-2 border border-[#E2E8F0]">Filter zurücksetzen</Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(company => (
            <LeadRow key={company.id} company={company} isAdmin={isAdmin} onLogged={loadData} />
          ))}
        </div>
      )}

      <AddCompanyDialog open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadData} />
    </div>
  );
}

import { Building2 } from "lucide-react";