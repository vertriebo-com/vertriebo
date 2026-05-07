import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { toast } from "sonner";
import { useLeadsFilter } from "../hooks/useLeadsFilter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Building2,
  MapPin,
  Phone,
  PhoneOff,
  Trash2,
  Flame,
  Download,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Mail,
  Calendar,
  User,
  Clock,
  Filter,
  ChevronDown,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "../components/StatusBadge";
import AddCompanyDialog from "../components/AddCompanyDialog";
import LeadScoreBadge from "../components/LeadScoreBadge";
import QuickLogButton from "../components/QuickLogButton";
import PriorityBadge from "../components/PriorityBadge";

const STATUSES = ["Alle", "Neu", "Kontakt", "Rückruf", "Termin", "Angebot", "Gewonnen", "Verloren"];
const PRIORITIES = ["Alle", "Hoch", "Mittel", "Niedrig"];
const SORT_OPTIONS = [
  { value: "priority", label: "Priorität" },
  { value: "name", label: "Name A–Z" },
  { value: "score", label: "Score" },
  { value: "created", label: "Neueste" },
  { value: "last_contact", label: "Letzter Kontakt" },
];

export default function Leads() {
  const { user, org, filterCompanies, loading: filterLoading } = useLeadsFilter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [priorityFilter, setPriorityFilter] = useState("Alle");
  const [assignedFilter, setAssignedFilter] = useState("Alle");
  const [sortBy, setSortBy] = useState("priority");
  const [showAdd, setShowAdd] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
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

  // Load organization members for filter
  useEffect(() => {
    if (orgId) {
      base44.entities.OrganizationMember.filter({ organization_id: orgId, status: "active" })
        .then(setMembers);
    }
  }, [orgId]);

  const loadData = () => refetch();
  const { containerRef, isRefreshing } = usePullToRefresh(loadData);

  const isAdmin = user?.role === "admin" || user?.role === "organization_admin";

  const toggleSelect = (id, e) => {
    e.preventDefault(); e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    await Promise.all([...selected].map(id => base44.entities.Company.update(id, { status: bulkStatus })));
    toast.success(`${selected.size} Leads auf "${bulkStatus}" gesetzt`);
    setSelected(new Set());
    setBulkStatus("");
    loadData();
  };

  const handleDelete = async (e, companyId) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm("Lead wirklich löschen?")) return;
    await base44.entities.Company.delete(companyId);
    loadData();
  };

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
      if (statusFilter !== "Alle" && c.status !== statusFilter) return false;
      if (priorityFilter !== "Alle") {
        const score = c.priority_score || 0;
        if (priorityFilter === "Hoch" && score < 60) return false;
        if (priorityFilter === "Mittel" && (score < 30 || score >= 60)) return false;
        if (priorityFilter === "Niedrig" && score >= 30) return false;
      }
      if (assignedFilter !== "Alle" && c.assigned_to !== assignedFilter) return false;
      if (showNewOnly && !c.notizen?.startsWith("⚡")) return false;
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

  const handleNotReached = async (e, company) => {
    e.preventDefault(); e.stopPropagation();
    const me = await base44.auth.me();
    await base44.entities.ContactLog.create({
      company_id: company.id, typ: "Anruf", ergebnis: "Nicht erreicht",
      notiz: "", naechster_schritt: "Erneut anrufen", user_email: me.email,
    });
    await base44.entities.Company.update(company.id, { status: "Rückruf", last_contact_date: new Date().toISOString() });
    toast.success(`${company.name} – Nicht erreicht gespeichert`);
    loadData();
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

      {/* Search + Main Filters */}
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
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
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="grid sm:grid-cols-3 gap-3 pt-3 border-t border-border">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priorität" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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

        {/* Active Filters */}
        {(statusFilter !== "Alle" || priorityFilter !== "Alle" || assignedFilter !== "Alle" || search) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {statusFilter !== "Alle" && (
              <button onClick={() => setStatusFilter("Alle")} className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors">
                Status: {statusFilter} <X className="w-3 h-3" />
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

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5">
              <span className="text-xs font-semibold text-primary">{selected.size} ausgewählt</span>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="h-7 w-32 text-xs bg-background">
                  <SelectValue placeholder="Status..." />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.filter(s => s !== "Alle").map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7 text-xs" onClick={handleBulkStatus} disabled={!bulkStatus}>Anwenden</Button>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelected(new Set())}><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleCsvExport} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> CSV Export
              </Button>
            </>
          )}
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Neuer Lead
        </Button>
      </div>

      {/* Leads Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map(c => c.id)) : new Set())}
                    className="w-4 h-4 rounded accent-primary"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Firma</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Kontakt</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Priorität</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden 2xl:table-cell">Letzter Kontakt</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Vertriebler</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(company => {
                const isSelected = selected.has(company.id);
                return (
                  <tr key={company.id} className={`hover:bg-muted/30 transition-colors ${isSelected ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelect(company.id, e)}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/leads/${company.id}`} className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${company.is_hot ? "bg-gradient-to-br from-orange-400/20 to-red-500/20 border border-orange-400/30" : "bg-gradient-to-br from-primary/10 to-blue-600/10 border border-primary/20"}`}>
                          {company.is_hot ? <Flame className="w-5 h-5 text-orange-500" /> : <Building2 className="w-5 h-5 text-primary" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold hover:text-primary transition-colors truncate">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.branche || "Keine Branche"}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-1">
                        {company.telefon && (
                          <a href={`tel:${company.telefon}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                            <Phone className="w-3 h-3" /> {company.telefon}
                          </a>
                        )}
                        {company.email && (
                          <a href={`mailto:${company.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors truncate">
                            <Mail className="w-3 h-3" /> {company.email}
                          </a>
                        )}
                        {!company.telefon && !company.email && <span className="text-xs text-muted-foreground">–</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <StatusBadge status={company.status} />
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <LeadScoreBadge score={company.priority_score} isHot={company.is_hot} notizen={company.notizen} />
                    </td>
                    <td className="px-4 py-3 hidden 2xl:table-cell">
                      {company.last_contact_date ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(company.last_contact_date).toLocaleDateString("de-DE")}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">–</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {company.assigned_to ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="truncate max-w-[120px]">{company.assigned_to}</span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">–</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {company.telefon && (
                          <a
                            href={`tel:${company.telefon}`}
                            onClick={e => e.stopPropagation()}
                            className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-colors"
                            title="Anrufen"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={(e) => handleNotReached(e, company)}
                          className="p-2 rounded-lg bg-muted/50 border border-border/50 text-muted-foreground hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 transition-colors"
                          title="Nicht erreicht"
                        >
                          <PhoneOff className="w-4 h-4" />
                        </button>
                        <QuickLogButton companyId={company.id} companyName={company.name} onLogged={loadData} />
                        {isAdmin && (
                          <button
                            onClick={(e) => handleDelete(e, company.id)}
                            className="p-2 rounded-lg bg-muted/50 border border-border/50 text-muted-foreground hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                            title="Lead löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
                    <p className="text-sm font-medium text-foreground">Keine Leads gefunden</p>
                    <p className="text-xs text-muted-foreground mt-1">Filter anpassen oder neuen Lead hinzufügen</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddCompanyDialog open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadData} />
    </div>
  );
}