import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { toast } from "sonner";
import { useLeadsFilter } from "../hooks/useLeadsFilter";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Download,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Filter,
  Building2,
  Flame,
  RefreshCcw,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddCompanyDialog from "../components/AddCompanyDialog";
import PipelineOverview from "../components/leads/PipelineOverview";
import QuickFilters from "../components/leads/QuickFilters";
import LeadCard from "../components/leads/LeadCard";
import moment from "moment";

const STATUSES = ["Neu", "Kontakt", "Rückruf", "Termin", "Angebot", "Gewonnen", "Verloren"];
const SORT_OPTIONS = [
  { value: "priority", label: "Priorität" },
  { value: "name", label: "Name A–Z" },
  { value: "score", label: "Score" },
  { value: "created", label: "Neueste" },
  { value: "last_contact", label: "Letzter Kontakt" },
];

export default function Leads() {
  const { user, org, filterCompanies, loading: filterLoading } = useLeadsFilter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [quickFilter, setQuickFilter] = useState(null);
  const [sortBy, setSortBy] = useState("priority");
  const [showAdd, setShowAdd] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("Alle");
  const [assignedFilter, setAssignedFilter] = useState("Alle");
  const [members, setMembers] = useState([]);

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
  const { containerRef, isRefreshing } = usePullToRefresh(loadData);

  const isAdmin = user?.role === "admin" || user?.role === "organization_admin";

  const ARCHIVED_STATUSES = ["Gewonnen", "Verloren"];

  const applySort = (arr) => {
    const sorted = [...arr];
    switch (sortBy) {
      case "name":
        return sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      case "score":
        return sorted.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
      case "created":
        return sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      case "last_contact":
        return sorted.sort((a, b) => new Date(b.last_contact_date || 0) - new Date(a.last_contact_date || 0));
      default:
        return sorted.sort((a, b) => {
          if (a.is_hot && !b.is_hot) return -1;
          if (!a.is_hot && b.is_hot) return 1;
          const statusPrio = { "Rückruf": 0, "Termin": 1, "Angebot": 2, "Kontakt": 3, "Neu": 4, "Gewonnen": 5, "Verloren": 6 };
          const ap = statusPrio[a.status] ?? 9;
          const bp = statusPrio[b.status] ?? 9;
          if (ap !== bp) return ap - bp;
          return (b.priority_score || 0) - (a.priority_score || 0);
        });
    }
  };

  const filtered = applySort(
    filterCompanies(companies).filter(c => {
      if (!showArchived && ARCHIVED_STATUSES.includes(c.status)) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (priorityFilter !== "Alle") {
        const score = c.priority_score || 0;
        if (priorityFilter === "Hoch" && score < 60) return false;
        if (priorityFilter === "Mittel" && (score < 30 || score >= 60)) return false;
        if (priorityFilter === "Niedrig" && score >= 30) return false;
      }
      if (assignedFilter !== "Alle" && c.assigned_to !== assignedFilter) return false;
      
      // Quick Filters
      if (quickFilter === "my_leads" && c.assigned_to !== user?.email) return false;
      if (quickFilter === "call_today") {
        const today = moment().format("YYYY-MM-DD");
        if (!c.last_contact_date || moment(c.last_contact_date).format("YYYY-MM-DD") !== today) return false;
      }
      if (quickFilter === "callback_open" && c.status !== "Rückruf") return false;
      if (quickFilter === "hot_leads" && !c.is_hot) return false;
      if (quickFilter === "new_import" && c.quelle !== "CSV Import") return false;
      if (quickFilter === "no_contact") {
        const daysSince = c.last_contact_date ? moment().diff(moment(c.last_contact_date), "days") : 999;
        if (daysSince < 14) return false;
      }
      
      if (search) {
        const s = search.toLowerCase();
        return (
          c.name?.toLowerCase().includes(s) ||
          c.branche?.toLowerCase().includes(s) ||
          c.ort?.toLowerCase().includes(s) ||
          c.ansprechpartner?.toLowerCase().includes(s)
        );
      }
      return true;
    })
  );

  const handleCsvExport = () => {
    const headers = ["Name","Branche","Adresse","PLZ","Ort","Telefon","E-Mail","Website","Ansprechpartner","Status","Entfernung (km)","Aktueller Dienstleister","Quelle","Notizen"];
    const rows = filtered.map(c => [
      c.name, c.branche, c.adresse, c.plz, c.ort, c.telefon, c.email, c.website,
      c.ansprechpartner, c.status, c.entfernung_km, c.aktueller_dienstleister, c.quelle,
      (c.notizen || "").replace(/\n/g, " ")
    ].map(v => `"${v || ""}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
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
    <div className="space-y-5 min-h-screen" ref={containerRef}>
      {isRefreshing && (
        <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-2">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Aktualisieren...
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Leads</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {filtered.length} Firmen · {filtered.filter(c => c.status === "Rückruf").length} Rückrufe offen
        </p>
      </div>

      {/* Pipeline Overview */}
      <PipelineOverview
        companies={companies}
        onStatusClick={setStatusFilter}
        activeStatus={statusFilter}
      />

      {/* Quick Filters */}
      <QuickFilters activeFilter={quickFilter} onFilterClick={setQuickFilter} />

      {/* Search + Filters */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Firma, Branche oder Ort suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-40">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline" className="gap-2">
            <Filter className="w-3.5 h-3.5" /> Filter
          </Button>
          <div className="flex-1" />
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Neuer Lead
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" className="gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Recherche
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleCsvExport} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="grid sm:grid-cols-3 gap-3 pt-3 border-t border-border">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priorität" />
              </SelectTrigger>
              <SelectContent>
                {["Alle", "Hoch", "Mittel", "Niedrig"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Vertriebler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Alle">Alle Vertriebler</SelectItem>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.user_email}>
                    {m.user_email} {m.role === "organization_admin" ? "(Admin)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={e => setShowArchived(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary"
                />
                Archivierte anzeigen
              </label>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {(statusFilter || quickFilter || priorityFilter !== "Alle" || assignedFilter !== "Alle" || search) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {statusFilter && (
              <button onClick={() => setStatusFilter(null)} className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors">
                Status: {statusFilter} <X className="w-3 h-3" />
              </button>
            )}
            {quickFilter && (
              <button onClick={() => setQuickFilter(null)} className="inline-flex items-center gap-1 text-xs font-medium bg-muted text-muted-foreground border border-border px-2.5 py-1 rounded-full hover:bg-muted/80 transition-colors">
                Filter: {quickFilter} <X className="w-3 h-3" />
              </button>
            )}
            {priorityFilter !== "Alle" && (
              <button onClick={() => setPriorityFilter("Alle")} className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full hover:bg-amber-200 transition-colors">
                Priorität: {priorityFilter} <X className="w-3 h-3" />
              </button>
            )}
            {assignedFilter !== "Alle" && (
              <button onClick={() => setAssignedFilter("Alle")} className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full hover:bg-blue-200 transition-colors">
                Vertriebler: {assignedFilter} <X className="w-3 h-3" />
              </button>
            )}
            {search && (
              <button onClick={() => setSearch("")} className="inline-flex items-center gap-1 text-xs font-medium bg-muted text-muted-foreground border border-border px-2.5 py-1 rounded-full hover:bg-muted/80 transition-colors">
                Suche: "{search}" <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Leads Grid */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
          <h3 className="text-lg font-bold text-foreground mb-2">Keine Leads gefunden</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {companies.length === 0
              ? "Noch keine Firmenkontakte vorhanden. Starten Sie jetzt mit der Lead-Generierung."
              : "Passen Sie Ihre Filter an oder fügen Sie einen neuen Lead hinzu."}
          </p>
          {companies.length === 0 ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => setShowAdd(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Ersten Lead anlegen
              </Button>
              {isAdmin && (
                <Button variant="outline" size="lg" className="gap-2">
                  <TrendingUp className="w-4 h-4" /> Firmen recherchieren
                </Button>
              )}
            </div>
          ) : (
            <Button variant="outline" onClick={() => { setStatusFilter(null); setQuickFilter(null); setSearch(""); }} className="gap-2">
              <RefreshCcw className="w-4 h-4" /> Filter zurücksetzen
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(company => (
            <LeadCard key={company.id} company={company} isAdmin={isAdmin} onLogged={loadData} />
          ))}
        </div>
      )}

      <AddCompanyDialog open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadData} />
    </div>
  );
}