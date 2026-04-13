import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { toast } from "sonner";
import { useLeadsFilter } from "../hooks/useLeadsFilter";
import {
  Search,
  Plus,
  Filter,
  Building2,
  MapPin,
  Phone,
  Mail,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "../components/StatusBadge";
import AddCompanyDialog from "../components/AddCompanyDialog";
import LeadScoreBadge from "../components/LeadScoreBadge";
import QuickLogButton from "../components/QuickLogButton";
import { Flame, Download } from "lucide-react";

const STATUSES = ["Alle", "Neu", "Kontakt", "Rückruf", "Termin", "Angebot", "Gewonnen", "Verloren"];

export default function Leads() {
  const { user, filterCompanies, loading: filterLoading } = useLeadsFilter();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [showAdd, setShowAdd] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");

  const loadData = async () => {
    try {
      const comps = await base44.entities.Company.list("-created_date", 500);
      setCompanies(comps);
    } catch (e) {
      console.error("loadData error", e);
    } finally {
      setLoading(false);
    }
  };

  const { containerRef, isRefreshing } = usePullToRefresh(loadData);

  useEffect(() => {
    loadData();
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
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Lead wirklich löschen?")) return;
    await base44.entities.Company.delete(companyId);
    setCompanies(prev => prev.filter(c => c.id !== companyId));
  };

  const ARCHIVED_STATUSES = ["Gewonnen", "Verloren"];

  const filtered = filterCompanies(companies)
    .filter(c => {
      // Archiv: Gewonnen/Verloren standardmäßig ausblenden
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
    .sort((a, b) => {
      if (a.is_hot && !b.is_hot) return -1;
      if (!a.is_hot && b.is_hot) return 1;
      const statusPrio = { "Rückruf": 0, "Termin": 1, "Angebot": 2, "Kontakt": 3, "Neu": 4, "Gewonnen": 5, "Verloren": 6 };
      const ap = statusPrio[a.status] ?? 9;
      const bp = statusPrio[b.status] ?? 9;
      if (ap !== bp) return ap - bp;
      return (b.priority_score || 0) - (a.priority_score || 0);
    });

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
    <div className="space-y-5" ref={containerRef}>
      {isRefreshing && (
        <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-2">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Aktualisieren...
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} Firmen</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5">
              <span className="text-xs font-medium text-primary">{selected.size} ausgewählt</span>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue placeholder="Status..." />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.filter(s => s !== "Alle").map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7 text-xs" onClick={handleBulkStatus} disabled={!bulkStatus}>Anwenden</Button>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelected(new Set())}>✕</button>
            </div>
          )}
          <Button
            variant={showNewOnly ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowNewOnly(v => !v)}
            className="gap-2 text-xs"
          >
            ⚡ Neue Standorte
          </Button>
          <Button
            variant={showArchived ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowArchived(v => !v)}
            className="gap-2 text-xs"
          >
            {showArchived ? "Archiv ausblenden" : "Archiv anzeigen"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCsvExport} className="gap-2 text-xs">
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2 text-xs">
            <Plus className="w-4 h-4" /> Hinzufügen
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Firma, Branche oder Ort suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lead Cards */}
      <div className="grid gap-3">
        {filtered.map(company => (
          <div key={company.id} className={`bg-card border rounded-xl p-4 hover:shadow-md transition-all group flex items-start gap-2 ${selected.has(company.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
            <div className="pt-1 shrink-0">
              <input
                type="checkbox"
                checked={selected.has(company.id)}
                onChange={(e) => toggleSelect(company.id, e)}
                className="w-4 h-4 rounded accent-primary cursor-pointer"
              />
            </div>
            <Link
            to={`/leads/${company.id}`}
            className="flex-1 block"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${company.is_hot ? "bg-orange-100" : "bg-primary/10"}`}>
                  {company.is_hot ? <Flame className="w-4 h-4 text-orange-500" /> : <Building2 className="w-4 h-4 text-primary" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
                    {company.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{company.branche || "Keine Branche"}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                    {company.ort && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 flex-shrink-0" /> {company.ort}
                        {company.entfernung_km ? ` (${company.entfernung_km} km)` : ""}
                      </span>
                    )}
                    {company.telefon && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{company.telefon}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <StatusBadge status={company.status} />
                <LeadScoreBadge score={company.priority_score} isHot={company.is_hot} />
                <QuickLogButton companyId={company.id} companyName={company.name} onLogged={loadData} />
                {isAdmin && (
                  <button
                    onClick={(e) => handleDelete(e, company.id)}
                    className="p-1 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="Lead löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </Link>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Keine Leads gefunden</p>
          </div>
        )}
      </div>

      <AddCompanyDialog open={showAdd} onClose={() => setShowAdd(false)} onCreated={loadData} />
    </div>
  );
}