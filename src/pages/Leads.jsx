import { useState, useEffect, useRef } from "react";
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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "../components/StatusBadge";
import AddCompanyDialog from "../components/AddCompanyDialog";
import LeadScoreBadge from "../components/LeadScoreBadge";
import QuickLogButton from "../components/QuickLogButton";

const STATUSES = ["Alle", "Neu", "Kontakt", "Rückruf", "Termin", "Angebot", "Gewonnen", "Verloren"];
const SORT_OPTIONS = [
  { value: "priority", label: "Priorität" },
  { value: "name", label: "Name A–Z" },
  { value: "score", label: "Score" },
  { value: "created", label: "Neueste" },
  { value: "last_contact", label: "Letzter Kontakt" },
];

const STATUS_LEFT_COLOR = {
  "Neu":      "bg-blue-500",
  "Kontakt":  "bg-cyan-500",
  "Rückruf":  "bg-amber-400",
  "Termin":   "bg-purple-500",
  "Angebot":  "bg-orange-400",
  "Gewonnen": "bg-emerald-500",
  "Verloren": "bg-red-500",
};

const STATUS_GLOW = {
  "Neu":      "shadow-blue-900/40",
  "Kontakt":  "shadow-cyan-900/40",
  "Rückruf":  "shadow-amber-900/40",
  "Termin":   "shadow-purple-900/40",
  "Angebot":  "shadow-orange-900/40",
  "Gewonnen": "shadow-emerald-900/40",
  "Verloren": "shadow-red-900/40",
};

export default function Leads() {
  const { user, filterCompanies, loading: filterLoading } = useLeadsFilter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [sortBy, setSortBy] = useState("priority");
  const [showAdd, setShowAdd] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const searchRef = useRef(null);

  const { data: companies = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-created_date", 500),
    staleTime: 60_000,
  });

  const loadData = () => refetch();
  const { containerRef, isRefreshing } = usePullToRefresh(loadData);

  useEffect(() => {
    if (window.innerWidth >= 1024) searchRef.current?.focus();
  }, []);

  const isAdmin = user?.role === "admin";

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
      default: // priority
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

      {/* ── Header ── */}
      <div>
        <h1 className="text-4xl font-black tracking-tight">Leads</h1>
        <p className="text-muted-foreground mt-0.5 text-sm font-medium">{filtered.length} Firmen</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-card/60 backdrop-blur-sm border border-border rounded-2xl p-4 space-y-3">
        {/* Top row: action buttons */}
        <div className="flex flex-wrap gap-2">
          {selected.size > 0 ? (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5">
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
              <Button
                variant={showNewOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowNewOnly(v => !v)}
                className="gap-1.5 text-xs font-semibold rounded-xl"
              >
                ⚡ Neue Standorte
              </Button>
              <Button
                variant={showArchived ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowArchived(v => !v)}
                className="gap-1.5 text-xs rounded-xl"
              >
                {showArchived ? "Archiv ausblenden" : "Archiv anzeigen"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCsvExport} className="gap-1.5 text-xs rounded-xl">
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 text-xs rounded-xl ml-auto">
                <Plus className="w-3.5 h-3.5" /> Hinzufügen
              </Button>
            </>
          )}
        </div>

        {/* Search + Status filter row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Firma, Branche oder Ort suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50 rounded-xl border-border/60"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36 rounded-xl bg-background/50 border-border/60">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl bg-background/50 border-border/60">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Active filter pills */}
        {(statusFilter !== "Alle" || showNewOnly || search) && (
          <div className="flex flex-wrap gap-1.5">
            {statusFilter !== "Alle" && (
              <button onClick={() => setStatusFilter("Alle")} className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors">
                {statusFilter} <X className="w-3 h-3" />
              </button>
            )}
            {showNewOnly && (
              <button onClick={() => setShowNewOnly(false)} className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full hover:bg-amber-200 transition-colors">
                ⚡ Neue Standorte <X className="w-3 h-3" />
              </button>
            )}
            {search && (
              <button onClick={() => setSearch("")} className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted text-muted-foreground border border-border px-2.5 py-1 rounded-full hover:bg-muted/80 transition-colors">
                „{search}" <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Lead Cards ── */}
      <div className="grid gap-3">
        {filtered.map(company => {
          const leftColor = STATUS_LEFT_COLOR[company.status] || "bg-slate-500";
          const glowColor = STATUS_GLOW[company.status] || "";
          const isSelected = selected.has(company.id);

          return (
            <div
              key={company.id}
              className={`relative bg-card border rounded-2xl overflow-hidden shadow-lg transition-all group ${glowColor} ${isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40 hover:shadow-xl"}`}
            >
              {/* Left status stripe */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${company.is_hot ? "bg-gradient-to-b from-orange-400 to-red-500" : leftColor}`} />

              {/* Checkbox */}
              <div className="absolute top-3 left-3 z-10">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => toggleSelect(company.id, e)}
                  className="w-4 h-4 rounded accent-primary cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>

              <Link to={`/leads/${company.id}`} className="block pl-5 pr-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  {/* Left: icon + info */}
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Company icon */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${company.is_hot ? "bg-gradient-to-br from-orange-400/30 to-red-500/20 border border-orange-400/30" : "bg-gradient-to-br from-primary/20 to-blue-600/10 border border-primary/20"}`}>
                      {company.is_hot ? <Flame className="w-5 h-5 text-orange-400" /> : <Building2 className="w-5 h-5 text-primary" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {company.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{company.branche || "Keine Branche"}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {company.ort && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {company.ort}{company.entfernung_km ? ` (${company.entfernung_km} km)` : ""}
                          </span>
                        )}
                        {company.telefon && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate max-w-[130px]">{company.telefon}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: status + score */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <StatusBadge status={company.status} />
                    <LeadScoreBadge score={company.priority_score} isHot={company.is_hot} notizen={company.notizen} />
                  </div>
                </div>

                {/* Action row */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
                  <div className="flex items-center gap-1.5">
                    {company.telefon && (
                      <a
                        href={`tel:${company.telefon}`}
                        onClick={e => e.stopPropagation()}
                        className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                        title="Anrufen"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={(e) => handleNotReached(e, company)}
                      className="p-2 rounded-xl bg-muted/50 border border-border/50 text-muted-foreground hover:bg-amber-500/10 hover:border-amber-500/20 hover:text-amber-500 transition-colors"
                      title="Nicht erreicht"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDelete(e, company.id)}
                        className="p-2 rounded-xl bg-muted/50 border border-border/50 text-muted-foreground hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Lead löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <QuickLogButton companyId={company.id} companyName={company.name} onLogged={loadData} />
                </div>
              </Link>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Building2 className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">Keine Leads gefunden</p>
            <p className="text-xs mt-1 opacity-70">Filter anpassen oder neuen Lead hinzufügen</p>
          </div>
        )}
      </div>

      <AddCompanyDialog open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadData} />
    </div>
  );
}