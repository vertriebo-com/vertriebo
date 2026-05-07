import { useState } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, MapPin, Zap, ArrowRight, SkipForward, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function StartLeadsStep({ org, selectedIndustry, plz, plzCity, radius, onDone }) {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [result, setResult] = useState(null);

  const CREDITS_COST = 1; // 1 Recherche-Credit pro Generierungslauf

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("generateLeads", {
        organization_id: org.id,
        count: 25,
      });
      if (res.data?.success) {
        setResult(res.data);
        setGenerated(true);
        toast.success(`${res.data.created} Startkontakte generiert!`);
      } else {
        toast.error(res.data?.error || "Fehler bei der Lead-Generierung");
      }
    } catch (e) {
      toast.error("Fehler: " + e.message);
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
        <div className="flex flex-col gap-2">
          <Button onClick={onDone} className="w-full gap-2">
            Zum Dashboard <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
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
      <div className="bg-muted/50 border border-border rounded-xl p-4 mb-5 space-y-2">
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
        <div className="flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-muted-foreground">Verbrauch:</span>
          <span className="font-semibold text-amber-600">{CREDITS_COST} Recherche-Credit</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Ergebnis:</span>
          <span className="font-semibold">~25 Firmen mit Adresse, Telefon, Website</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800">
          <strong>Hinweis:</strong> Die Recherche verwendet die Google Places API und verbraucht einen Recherche-Credit. Ihr Monatsbudget bleibt davon unberührt – der Trial enthält kostenlose Credits.
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onDone}
          className="gap-2 text-muted-foreground"
        >
          <SkipForward className="w-4 h-4" /> Später
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 gap-2"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird gesucht...</>
            : <><Zap className="w-4 h-4" /> 25 Startkontakte generieren</>
          }
        </Button>
      </div>
    </div>
  );
}