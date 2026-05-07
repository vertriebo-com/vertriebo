import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ResearchDialog({ open, orgId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [result, setResult] = useState(null);
  const [settings, setSettings] = useState(null);
  const [plan, setPlan] = useState(null);
  const [targetCount, setTargetCount] = useState(25);

  useEffect(() => {
    if (open && orgId) {
      loadSettings();
    }
  }, [open, orgId]);

  const loadSettings = async () => {
    setLoading(true);
    setResult(null);
    try {
      // Org-Einstellungen laden
      const settingsData = await base44.entities.OrganizationSettings.filter({ organization_id: orgId });
      const settingsMap = {};
      settingsData.forEach(s => { settingsMap[s.key] = s.value; });
      setSettings(settingsMap);

      // Organization laden
      const orgs = await base44.entities.Organization.filter({ id: orgId });
      const org = orgs[0];

      // Plan laden
      if (org?.plan_id) {
        const plans = await base44.entities.Plan.filter({ id: org.plan_id });
        const planData = plans[0];
        setPlan(planData);
        setTargetCount(Math.min(25, planData?.max_leads_per_month || 25));
      }
    } catch (err) {
      toast.error("Fehler beim Laden der Einstellungen");
    } finally {
      setLoading(false);
    }
  };

  const handleStartResearch = async () => {
    setResearching(true);
    try {
      const res = await base44.functions.invoke("generateLeads", {
        organization_id: orgId,
        target_count: targetCount,
      });

      if (res.data?.success) {
        setResult({
          success: true,
          count: res.data.count || targetCount,
          message: `${res.data.count || targetCount} neue Firmenkontakte wurden erstellt`,
        });
        onSuccess?.();
      } else {
        setResult({
          success: false,
          message: res.data?.error || "Recherche fehlgeschlagen",
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message: err.message || "Ein Fehler ist aufgetreten",
      });
    } finally {
      setResearching(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">Neue Firmen recherchieren</h2>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Vertriebo sucht passende Firmenkontakte anhand Ihres Zielgebiets, Ihrer Branche und Ihrer Zielkunden.
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {/* Result State */}
        {!loading && result && (
          <div className="space-y-4 py-4">
            <div className={`flex items-start gap-3 p-4 rounded-xl border-2 ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="text-sm font-medium" style={{ color: result.success ? "#15803d" : "#991b1b" }}>
                {result.message}
              </div>
            </div>
            <Button onClick={onClose} className="w-full">
              Schließen
            </Button>
          </div>
        )}

        {/* Form State */}
        {!loading && !result && (
          <div className="space-y-4 py-4">
            {/* Settings Info */}
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
              {settings?.lead_plz && (
                <div>
                  <p className="text-xs text-slate-600 font-medium">Suchgebiet</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {settings.lead_plz} {settings.lead_plz_city ? `· ${settings.lead_plz_city}` : ""}
                  </p>
                </div>
              )}
              {settings?.lead_radius_km && (
                <div>
                  <p className="text-xs text-slate-600 font-medium">Suchradius</p>
                  <p className="text-sm font-semibold text-slate-900">{settings.lead_radius_km} km</p>
                </div>
              )}
              {settings?.industry_name && (
                <div>
                  <p className="text-xs text-slate-600 font-medium">Branche</p>
                  <p className="text-sm font-semibold text-slate-900">{settings.industry_name}</p>
                </div>
              )}
              {settings?.zielkunden && (
                <div>
                  <p className="text-xs text-slate-600 font-medium">Zielkunden</p>
                  <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                    {settings.zielkunden.split(", ").slice(0, 3).join(", ")}
                    {settings.zielkunden.split(", ").length > 3 ? "..." : ""}
                  </p>
                </div>
              )}
            </div>

            {/* Target Count */}
            <div>
              <p className="text-xs font-semibold text-slate-900 mb-2">Anzahl Firmenkontakte</p>
              <div className="grid grid-cols-3 gap-2">
                {[25, 50, 100].map(count => (
                  <button
                    key={count}
                    onClick={() => setTargetCount(count)}
                    disabled={plan && plan.max_leads_per_month !== -1 && count > plan.max_leads_per_month}
                    className={`px-3 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${
                      targetCount === count
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-slate-200 text-slate-700 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-2">
                💡 Verbraucht Recherche-Credits.
                {plan && plan.max_lead_generations_per_month !== -1 && (
                  <span> Ihr Plan: {plan.max_lead_generations_per_month}/Monat</span>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={researching}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleStartResearch}
                disabled={researching}
                className="flex-1 gap-2"
              >
                {researching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Läuft...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    Recherche starten
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}