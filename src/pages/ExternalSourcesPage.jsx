import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Database, ArrowLeft, Download } from "lucide-react";
import { Link } from "react-router-dom";
import ExternalSourceCard from "../components/external-sources/ExternalSourceCard";
import { useLeadsFilter } from "../hooks/useLeadsFilter";

const TABS = [
  { key: "all",              label: "Alle" },
  { key: "ready_for_review", label: "Bereit" },
  { key: "needs_review",     label: "Prüfung" },
  { key: "pending",          label: "Ausstehend" },
  { key: "promoted_to_company", label: "Übernommen" },
  { key: "outside_radius",   label: "Außer Radius" },
  { key: "rejected",         label: "Abgelehnt" },
  { key: "failed",           label: "Fehlgeschlagen" },
];

function matchesTab(source, tab) {
  if (tab === "all") return true;
  if (tab === "pending") return source.enrichment_status === "pending" && source.match_status === "imported";
  return source.match_status === tab || source.enrichment_status === tab;
}

export default function ExternalSourcesPage() {
  const { user, org, loading: filterLoading } = useLeadsFilter();
  const [activeTab, setActiveTab] = useState("all");
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importCity, setImportCity] = useState("");
  const [importRadius, setImportRadius] = useState(25);
  const [importLimit, setImportLimit] = useState(20);

  const orgId = org?.id || null;
  const isAdmin = user?.role === "admin" || user?.org_role === "organization_admin" || (org && org.owner_email === user?.email);

  const { data: sources = [], isLoading, refetch } = useQuery({
    queryKey: ["externalSources", orgId],
    queryFn: () => orgId
      ? base44.entities.ExternalCompanySource.filter({ organization_id: orgId }, "-created_date", 200)
      : Promise.resolve([]),
    enabled: !!orgId,
    staleTime: 30_000,
  });

  // Pre-fill city from org settings
  useEffect(() => {
    if (org) {
      const city = org.service_area_city || org.city || "";
      setImportCity(city);
      if (org.service_area_radius_km) setImportRadius(org.service_area_radius_km);
    }
  }, [org]);

  // Redirect sales rep away
  useEffect(() => {
    if (user && !filterLoading && !isAdmin) {
      window.location.href = "/leads";
    }
  }, [user, isAdmin, filterLoading]);

  const handleMatchWithGoogle = async () => {
    if (!orgId || matchingLoading) return;
    setMatchingLoading(true);
    try {
      const res = await base44.functions.invoke("matchExternalSourceWithGooglePlaces", {
        organization_id: orgId,
        limit: 10,
        dry_run: false,
      });
      const data = res.data;
      if (data?.success !== false) {
        const count = data?.processed || data?.updated || 0;
        toast.success(`${count} Kandidaten mit Google abgeglichen.`);
        refetch();
      } else {
        toast.error(data?.error || "Google-Abgleich fehlgeschlagen.");
      }
    } catch (e) {
      toast.error(e?.message || "Google-Abgleich fehlgeschlagen.");
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleOpenRegisterImport = async () => {
    if (!orgId || importLoading) return;
    const city = importCity.trim();
    if (!city) { toast.error("Bitte Stadt eingeben."); return; }
    setImportLoading(true);
    try {
      const res = await base44.functions.invoke("syncOpenRegister", {
        organization_id: orgId,
        city,
        radius_km: Number(importRadius),
        limit: Number(importLimit),
        dry_run: false,
      });
      const data = res.data;
      if (data?.success !== false) {
        const saved = data?.saved ?? data?.inserted ?? data?.count ?? 0;
        toast.success(`${saved} Import-Kandidaten wurden geladen.`);
        refetch();
      } else {
        toast.error(data?.error || "Import fehlgeschlagen.");
      }
    } catch (e) {
      toast.error(e?.message || "Import fehlgeschlagen.");
    } finally {
      setImportLoading(false);
    }
  };

  const filtered = sources.filter(s => matchesTab(s, activeTab));

  // Tab-Zähler
  const counts = {};
  for (const tab of TABS) {
    counts[tab.key] = tab.key === "all" ? sources.length : sources.filter(s => matchesTab(s, tab.key)).length;
  }

  const pendingCount = sources.filter(s => s.enrichment_status === "pending" && s.match_status === "imported").length;
  const readyCount   = sources.filter(s => s.match_status === "ready_for_review").length;
  const reviewCount  = sources.filter(s => s.match_status === "needs_review").length;

  if (filterLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/leads" className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">Import-Kandidaten</h1>
            </div>
          </div>
          <p className="text-sm text-slate-600 font-medium max-w-lg">
            Import-Kandidaten sind gefundene Firmen aus externen Quellen. Prüfen Sie die Übereinstimmung, bevor Sie sie als Lead übernehmen.
          </p>
          {org && (
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Org: {org.name} · ID: {org.id}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 border-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Aktualisieren
          </Button>
          {pendingCount > 0 && (
            <Button
              size="sm"
              onClick={handleMatchWithGoogle}
              disabled={matchingLoading}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {matchingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Nächste {Math.min(pendingCount, 10)} mit Google abgleichen
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {sources.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {[
            { label: "Gesamt", value: sources.length, color: "text-slate-700" },
            { label: "Bereit", value: readyCount, color: "text-green-700" },
            { label: "Prüfung", value: reviewCount, color: "text-amber-700" },
            { label: "Ausstehend", value: pendingCount, color: "text-slate-500" },
            { label: "Übernommen", value: sources.filter(s => s.match_status === 'promoted_to_company').length, color: "text-blue-700" },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-[#E2E8F0] rounded-xl p-3 text-center shadow-sm">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-white border border-[#E2E8F0] rounded-xl p-1.5 shadow-sm">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {sources.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 max-w-lg mx-auto">
          <div className="text-center mb-6">
            <Database className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">Keine Import-Kandidaten</h3>
            <p className="text-sm text-slate-500">Importieren Sie Firmen aus dem OpenRegister, um Kandidaten zu laden.</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Stadt *</label>
              <Input
                placeholder="z.B. Berlin"
                value={importCity}
                onChange={e => setImportCity(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Radius (km)</label>
                <Input
                  type="number"
                  min={5} max={100}
                  value={importRadius}
                  onChange={e => setImportRadius(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Limit</label>
                <Input
                  type="number"
                  min={5} max={100}
                  value={importLimit}
                  onChange={e => setImportLimit(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleOpenRegisterImport}
              disabled={importLoading || !importCity.trim()}
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {importLoading ? "Importiert…" : "OpenRegister-Kandidaten importieren"}
            </Button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center">
          <p className="text-sm text-slate-500">Keine Kandidaten in dieser Kategorie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(source => (
            <ExternalSourceCard
              key={source.id}
              source={source}
              orgId={orgId}
              onRefetch={refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}