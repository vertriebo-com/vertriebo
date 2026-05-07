import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, MapPin, Zap, ArrowRight, SkipForward, AlertTriangle, Database, Search, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function StartLeadsStep({ org, selectedIndustry, plz, plzCity, radius, onDone }) {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [orgData, setOrgData] = useState(null);
  const [plan, setPlan] = useState(null);
  const [billingOk, setBillingOk] = useState(false);

  useEffect(() => {
    // Lade Organisation und Plan um Billing-Status zu prüfen
    (async () => {
      try {
        const orgs = await base44.entities.Organization.filter({ id: org.id });
        const orgFull = orgs[0];
        setOrgData(orgFull);
        
        const isBillingOk = ["trialing", "active"].includes(orgFull.billing_status);
        setBillingOk(isBillingOk);

        if (orgFull?.plan_id) {
          const plans = await base44.entities.Plan.filter({ id: orgFull.plan_id });
          setPlan(plans[0] || null);
        }
      } catch (e) {
        console.error("Failed to load org data:", e.message);
      }
    })();
  }, [org.id]);

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
      } else if (res.data?.reason === "billing_required" || res.data?.reason === "billing_blocked") {
        setError("Bitte wählen Sie zuerst einen Plan und schließen Sie die Bestellung ab.");
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
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        {/* Success Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Startkontakte generiert!</h2>
            <p className="text-sm font-medium text-slate-600 mt-0.5">{result.created} Firmen recherchiert</p>
          </div>
        </div>

        {/* Ergebnisdetails */}
        <div className="space-y-3 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-700 uppercase mb-1">Erfolgreich</p>
              <p className="text-2xl font-black text-emerald-600">{result.created}</p>
              <p className="text-xs text-slate-600 font-medium mt-0.5">Gespeicherte Leads</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700 uppercase mb-1">Übersprungen</p>
              <p className="text-2xl font-black text-slate-400">{(result.skipped || 0) + (result.skipped_irrelevant || 0)}</p>
              <p className="text-xs text-slate-600 font-medium mt-0.5">Ungültig/Falsch</p>
            </div>
          </div>

          <div className="border-t border-slate-300 pt-3">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-700 font-medium">Branche:</span>
              <span className="text-slate-900 font-bold">{result.industry || "Nicht angegeben"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 font-medium">Suchgebiet:</span>
              <span className="text-slate-900 font-bold">{result.radius_km} km Radius</span>
            </div>
          </div>
        </div>

        {/* Verbrauch */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
          <p className="text-xs font-bold text-blue-900 uppercase mb-3">Verbrauchte Credits</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-blue-900 font-medium">Recherche-Credits:</span>
              <span className="text-blue-700 font-bold">{result.research_credits_used}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-900 font-medium">Recherche-Läufe:</span>
              <span className="text-blue-700 font-bold">1</span>
            </div>
            <div className="text-xs text-blue-800 pt-2 border-t border-blue-200 mt-2">
              Diese Credits werden auf Ihr monatliches Kontingent angerechnet.
            </div>
          </div>
        </div>

        <Button onClick={onDone} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
          Zum Dashboard <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Nicht Billing-Okay State
  if (!billingOk) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Plan erforderlich</h2>
            <p className="text-sm text-slate-600 font-medium">Startkontakte brauchen einen aktiven Plan</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
          <p className="text-sm text-amber-900 font-medium mb-2">
            ⚠️ Kein aktiver Plan oder Trial vorhanden
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">
            Bitte schließen Sie zuerst Ihre Plan-Auswahl ab, damit Sie Startkontakte generieren können. Sie können dies jederzeit später auch von Ihrer Einstellungsseite aus tun.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onDone} className="flex-1">
            <SkipForward className="w-4 h-4 mr-2" /> Überspringen
          </Button>
          <Button onClick={onDone} className="flex-1">
            Weiter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Startkontakte generieren</h2>
          <p className="text-sm text-slate-600 font-medium">Automatisch recherchierte Firmenlisten</p>
        </div>
      </div>

      {/* Informationen */}
      <div className="space-y-3 mb-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="text-xs font-semibold text-slate-700 uppercase">Suchgebiet</p>
            <p className="text-slate-900 font-bold">{plzCity || plz} · {radius} km Radius</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg">{selectedIndustry?.icon || "🏢"}</span>
          <div className="flex-1 text-sm">
            <p className="text-xs font-semibold text-slate-700 uppercase">Branche</p>
            <p className="text-slate-900 font-bold">{selectedIndustry?.name || "Nicht gewählt"}</p>
          </div>
        </div>
      </div>

      {/* Verbrauch Preview */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-5">
        <p className="text-xs font-bold text-blue-900 uppercase mb-3">Geplanter Verbrauch</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-blue-900">Recherche-Credits:</span>
            <span className="font-bold text-blue-700">bis zu 25</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-900">Recherche-Läufe:</span>
            <span className="font-bold text-blue-700">1</span>
          </div>
          {plan && plan.max_leads_per_month !== -1 && (
            <div className="text-xs text-blue-800 pt-2 border-t border-blue-200 mt-2">
              Ihr Plan: {plan.max_leads_per_month} Credits/Monat verfügbar
            </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg mb-5 text-xs text-slate-800 font-medium">
        💡 Es werden nur Firmen gespeichert, die zu Ihrer Branche passen.
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-800 font-medium">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onDone} className="gap-2">
          <SkipForward className="w-4 h-4" /> Später
        </Button>
        <Button 
          onClick={handleGenerate} 
          disabled={loading || !billingOk} 
          className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird recherchiert...</>
            : <><TrendingUp className="w-4 h-4" /> 25 Startkontakte generieren</>
          }
        </Button>
      </div>
    </div>
  );
}