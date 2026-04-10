import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  Filter,
  Building2,
  MapPin,
  Phone,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "../components/StatusBadge";
import AddCompanyDialog from "../components/AddCompanyDialog";
import LeadScoreBadge from "../components/LeadScoreBadge";
import { Flame, Download } from "lucide-react";

const STATUSES = ["Alle", "Neu", "Kontakt", "Rückruf", "Termin", "Angebot", "Gewonnen", "Verloren"];

export default function Leads() {
  const [companies, setCompanies] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [me, comps] = await Promise.all([
      base44.auth.me(),
      base44.entities.Company.list("-created_date", 200),
    ]);
    setUser(me);
    setCompanies(comps);
    setLoading(false);
  };

  const isAdmin = user?.role === "admin";

  const filtered = companies
    .filter(c => {
      if (!isAdmin && c.assigned_to !== user?.email) return false;
      if (statusFilter !== "Alle" && c.status !== statusFilter) return false;
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
      // Hot leads first, then by priority_score, then Rückruf status
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} Firmen</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCsvExport} className="gap-2">
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Firma hinzufügen
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
          <Link
            key={company.id}
            to={`/leads/${company.id}`}
            className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all hover:border-primary/30 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${company.is_hot ? "bg-orange-100" : "bg-primary/10"}`}>
                  {company.is_hot ? <Flame className="w-5 h-5 text-orange-500" /> : <Building2 className="w-5 h-5 text-primary" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
                    {company.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{company.branche || "Keine Branche"}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {company.ort && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {company.ort}
                        {company.entfernung_km ? ` (${company.entfernung_km} km)` : ""}
                      </span>
                    )}
                    {company.telefon && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" /> {company.telefon}
                      </span>
                    )}
                    {company.email && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" /> {company.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={company.status} />
                <LeadScoreBadge score={company.priority_score} isHot={company.is_hot} />
              </div>
              </div>
              </Link>
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