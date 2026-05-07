import { useState } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, MapPin, Zap, ArrowRight, SkipForward, AlertTriangle, Database, Search } from "lucide-react";
import { toast } from "sonner";

export default function StartLeadsStep({ org, selectedIndustry, plz, plzCity, radius, onDone }) {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("generateLeads", {
        organization_id: org.id,
        count: 25,
      });
      if (res.data?.success) {
        setResult(res.data);
        setGenerated(true);
        toast.success(`${res.data.created} Startkontakte generiert!`);
      } else if (res.data?.reason === "research_credits_exhausted") {
        setError(`Nicht genügend Recherche-Credits verfügbar. (${res.data.used}/${res.data.limit} verbraucht)`);
      } else {
        setError(res.data?.error || "Fehler bei der Lead-Generierung");
      }
    } catch (e) {
      setError("Fehler: " + e.message);
    }
    setLoading(false);
  };

  if (generated && result) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-7 h-7 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold mb-1">🎉 {result.created} Startkontakte gefunden!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Radius: {result.radius_km} km · KW {result.week} · Quelle: Google Maps
        </p>

        {/* Verbrauchsübersicht */}
        <div className="bg-muted/50 border border-border rounded-xl p-3 mb-5 text-left space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Verbrauchsabrechnung</p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> Recherche-Credits verbraucht</span>
            <span className="font-bold text-foreground">{result.research_credits_used}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5"><Search className="w-3.5 h-3.5" /> Recherche-Läufe</span>
            <span className="font-bold text-foreground">1</span>
          </div>
          {result.api_calls && (
            <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border">
              <span>Google API-Calls (intern)</span>
              <span>{(result.api_calls.nearby_search || 0) + (result.api_calls.place_details || 0)} Requests</span>
            </div>
          )}
        </div>

        <Button onClick={onDone} className="w-full gap-2">
          Zum Dashboard <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-1">Erste Firmenkontakte recherchieren?</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Das System kann jetzt sofort <strong>25 Startkontakte</strong> aus Google Maps für Ihr Gebiet laden.
      </p>

      {/* Preview Box */}
      <div className="bg-muted/50 border border-border rounded-xl p-4 mb-4 space-y-2.5">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="text-muted-foreground">Gebiet:</span>
          <span className="font-semibold">{plzCity || plz} · {radius} km Radius</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xl">{selectedIndustry?.icon || "🏢"}</span>
          <span className="text-muted-foreground">Branche:</span>
          <span className="font-semibold">{selectedIndustry?.name || "Allgemein"}</span>
        </div>
        <div className="border-t border-border pt-2.5 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Erwarteter Verbrauch</p>
          <div className="flex items-center gap-2 text-sm">
            <Database className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-muted-foreground">Recherche-Credits:</span>
            <span className="font-bold text-amber-600">bis zu 25</span>
            <span className="text-xs text-muted-foreground">(1 pro Kontakt)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Search className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-muted-foreground">Recherche-Lauf:</span>
            <span className="font-bold text-blue-600">1</span>
            <span className="text-xs text-muted-foreground">(1 Suchlauf)</span>
          </div>
        </div>
      </div>

      {/* Erklärung */}
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
        <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800">
          <strong>Recherche-Credits</strong> = Anzahl recherchierter Firmenkontakte (1 Credit pro Firma).<br />
          <strong>Recherche-Läufe</strong> = Anzahl gestarteter Suchen (dieser Lauf = 1).<br />
          Beide Werte sind durch Ihren Plan begrenzt.
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onDone} className="gap-2 text-muted-foreground">
          <SkipForward className="w-4 h-4" /> Später
        </Button>
        <Button onClick={handleGenerate} disabled={loading} className="flex-1 gap-2">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird gesucht...</>
            : <><Zap className="w-4 h-4" /> 25 Startkontakte generieren</>
          }
        </Button>
      </div>
    </div>
  );
}