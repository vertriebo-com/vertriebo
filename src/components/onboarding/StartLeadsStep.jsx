import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, MapPin, Zap, ArrowRight, SkipForward, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function StartLeadsStep({ org, onDone }) {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({});
  const [billingOk, setBillingOk] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Lade Billing-Status
        const orgs = await base44.entities.Organization.filter({ id: org.id });
        const orgFull = orgs[0];
        const isBillingOk = ["trialing", "active"].includes(orgFull.billing_status);
        setBillingOk(isBillingOk);

        // Lade Settings
        const settingsRecords = await base44.entities.OrganizationSettings.filter({
          organization_id: org.id,
        });
        const settingsMap = {};
        settingsRecords.forEach(s => {
          settingsMap[s.key] = s.value;
        });
        setSettings(settingsMap);
      } catch (e) {
        console.error("Failed to load org data:", e.message);
      }
    })();
  }, [org.id]);

  const targetCustomers = [
    ...((settings.target_customer_types || "").split(", ").filter(x => x.trim())),
    ...((settings.custom_target_customer_types || "").split(", ").filter(x => x.trim())),
  ];

  const excluded = [
    ...((settings.excluded_customer_types || "").split(", ").filter(x => x.trim())),
    ...((settings.custom_excluded_customer_types || "").split(", ").filter(x => x.trim())),
  ];

  const hasTargetCustomers = targetCustomers.length > 0;

  const handleGenerate = async () => {
    if (!hasTargetCustomers) {
      toast.error("Bitte definieren Sie zuerst Zielkunden im Onboarding.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("generateLeads", {
        organization_id: org.id,
        target_count: 25,
      });

      if (res.data?.success) {
        setResult(res.data);
        setGenerated(true);
        toast.success(`${res.data.count} Firmenkontakte generiert!`);
      } else {
        setError(res.data?.error || "Fehler bei der Lead-Recherche");
      }
    } catch (e) {
      setError("Fehler: " + e.message);
    }
    setLoading(false);
  };

  if (generated && result) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Startkontakte generiert!</h2>
            <p className="text-sm font-medium text-slate-600 mt-0.5">{result.count} passende Firmen recherchiert</p>
          </div>
        </div>

        <div className="space-y-3 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          {result.summary && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-700 uppercase mb-1">✓ Gespeichert</p>
                  <p className="text-2xl font-black text-green-600">{result.summary.created}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 uppercase mb-1">⊘ Übersprungen</p>
                  <p className="text-2xl font-black text-slate-400">{result.summary.skipped_duplicate + result.summary.skipped_excluded + result.summary.skipped_no_match}</p>
                </div>
              </div>

              <div className="border-t border-slate-300 pt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Dubletten:</span>
                  <span className="font-semibold text-slate-900">{result.summary.skipped_duplicate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Ausgeschlossen:</span>
                  <span className="font-semibold text-slate-900">{result.summary.skipped_excluded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Keine Übereinstimmung:</span>
                  <span className="font-semibold text-slate-900">{result.summary.skipped_no_match}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mb-6 text-xs text-blue-900 font-medium">
          💡 Sie können jederzeit weitere Firmenkontakte im Leads-Bereich recherchieren.
        </div>

        <Button onClick={onDone} className="w-full gap-2 bg-green-600 hover:bg-green-700">
          Zum Dashboard <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (!billingOk) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Billing erforderlich</h2>
            <p className="text-sm text-slate-600 font-medium">Wählen Sie zuerst einen Plan</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
          <p className="text-sm text-amber-900 font-medium mb-2">Startkontakte benötigen einen aktiven Plan</p>
          <p className="text-xs text-amber-800 leading-relaxed">Schließen Sie die Plan-Auswahl ab, um Firmenkontakte zu recherchieren. Sie können dies später auch in den Einstellungen nachholen.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onDone} className="flex-1">
            <SkipForward className="w-4 h-4 mr-2" /> Überspringen
          </Button>
          <Button onClick={onDone} className="flex-1">Weiter</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Erste Firmenkontakte recherchieren</h2>
          <p className="text-sm text-slate-600 font-medium">Automatisch recherchierte Leads basierend auf Ihrem Profil</p>
        </div>
      </div>

      <div className="space-y-3 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        {settings.own_industry && (
          <div className="flex items-center gap-3">
            <span className="text-lg">🏢</span>
            <div className="flex-1 text-sm">
              <p className="text-xs font-semibold text-slate-700 uppercase">Ihre Branche</p>
              <p className="text-slate-900 font-bold">{settings.own_industry}</p>
            </div>
          </div>
        )}

        {settings.services && (
          <div className="flex items-start gap-3 pt-2 border-t border-slate-300">
            <span className="text-lg mt-0.5">⚙️</span>
            <div className="flex-1 text-sm">
              <p className="text-xs font-semibold text-slate-700 uppercase">Leistungen</p>
              <p className="text-slate-900 font-bold line-clamp-2">{settings.services}</p>
            </div>
          </div>
        )}

        {hasTargetCustomers && (
          <div className="flex items-start gap-3 pt-2 border-t border-slate-300">
            <span className="text-lg mt-0.5">🎯</span>
            <div className="flex-1 text-sm">
              <p className="text-xs font-semibold text-slate-700 uppercase">Zielkunden</p>
              <p className="text-slate-900 font-bold line-clamp-2">{targetCustomers.join(", ")}</p>
            </div>
          </div>
        )}

        {settings.service_area_city && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-300">
            <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="text-xs font-semibold text-slate-700 uppercase">Suchgebiet</p>
              <p className="text-slate-900 font-bold">{settings.service_area_city} ({settings.service_area_radius_km} km Radius)</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
        <p className="text-xs font-bold text-blue-900 uppercase mb-2">Verbrauch</p>
        <p className="text-sm text-blue-900 font-semibold">bis zu <span className="text-blue-700">25 Recherche-Credits</span></p>
        <p className="text-xs text-blue-800 mt-2">Es werden nur Firmen gespeichert, die zu Ihren Zielkunden passen. Unpassende Treffer werden automatisch verworfen.</p>
      </div>

      {!hasTargetCustomers && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
          <p className="text-sm font-semibold text-red-900">⚠️ Keine Zielkunden definiert</p>
          <p className="text-xs text-red-800 mt-2">Bitte wählen Sie zuerst mindestens eine Zielkundengruppe im vorigen Schritt.</p>
        </div>
      )}

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
          disabled={loading || !billingOk || !hasTargetCustomers}
          className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird recherchiert...</>
            : <><TrendingUp className="w-4 h-4" /> 25 Kontakte recherchieren</>
          }
        </Button>
      </div>
    </div>
  );
}