import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function CostSummary({ skuBreakdown, estimatedCostCent }) {
  if (!skuBreakdown || estimatedCostCent == null) return null;
  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
      <div className="font-semibold text-slate-800 mb-1.5">Google API Kosten (geschätzt)</div>
      {Object.entries(skuBreakdown).map(([sku, data]) => (
        <div key={sku} className="flex justify-between text-slate-600">
          <span>{sku.replace(/_/g, ' ')}</span>
          <span className="font-mono">{data.requests}x → {data.estimated_cost_cent.toFixed(2)}¢</span>
        </div>
      ))}
      <div className="flex justify-between font-bold text-slate-900 border-t border-slate-300 pt-1 mt-1">
        <span>Gesamt</span>
        <span className="font-mono">{estimatedCostCent.toFixed(2)}¢ (~{(estimatedCostCent / 100).toFixed(4)} €)</span>
      </div>
    </div>
  );
}

export default function ResearchDialog({ open, orgId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [result, setResult] = useState(null);
  const [settings, setSettings] = useState({});
  const [targetCount, setTargetCount] = useState(25);
  const [usageInfo, setUsageInfo] = useState(null);
  const [planLimits, setPlanLimits] = useState(null);

  useEffect(() => {
    if (open && orgId) loadSettings();
  }, [open, orgId]);

  const loadSettings = async () => {
    setLoading(true);
    setResult(null);

    const [settingsData, orgs] = await Promise.all([
      base44.entities.OrganizationSettings.filter({ organization_id: orgId }),
      base44.entities.Organization.filter({ id: orgId }),
    ]);

    const settingsMap = {};
    settingsData.forEach(s => { settingsMap[s.key] = s.value; });
    setSettings(settingsMap);

    const org = orgs[0];
    if (org?.plan_id) {
      const [plans, usageLogs] = await Promise.all([
        base44.entities.Plan.filter({ id: org.plan_id }),
        base44.entities.UsageLog.filter({ organization_id: orgId, period_month: new Date().toISOString().slice(0, 7) }),
      ]);
      const plan = plans[0];
      const usage = usageLogs[0];
      if (plan) {
        setPlanLimits({
          max_lead_generations_per_month: plan.max_lead_generations_per_month ?? 100,
          max_leads_per_month: plan.max_leads_per_month ?? 300,
        });
      }
      if (usage) {
        setUsageInfo({
          lead_generations_used: usage.lead_generations_used ?? 0,
          leads_created: usage.leads_created ?? 0,
        });
      }
    }

    setLoading(false);
  };

  // Liest den Key "zielkunden" (gespeichert von CompanySettings)
  const targetCustomers = (settings.zielkunden || "").split(", ").filter(x => x.trim());

  const handleStartResearch = async () => {
    if (targetCustomers.length === 0) {
      toast.error("Bitte definieren Sie zuerst Zielkunden in den Einstellungen.");
      return;
    }
    setResearching(true);
    try {
      const res = await base44.functions.invoke("generateLeads", {
        organization_id: orgId,
        target_count: targetCount,
      });

      if (res.data?.success) {
        // UsageLog frisch aus DB laden (nicht schätzen)
        const periodMonth = new Date().toISOString().slice(0, 7);
        const usageLogs = await base44.entities.UsageLog.filter({ organization_id: orgId, period_month: periodMonth });
        if (usageLogs[0]) {
          setUsageInfo({
            lead_generations_used: usageLogs[0].lead_generations_used ?? 0,
            leads_created: usageLogs[0].leads_created ?? 0,
          });
        }
        setResult({ success: true, data: res.data });
        onSuccess?.();
      } else {
        setResult({ success: false, message: res.data?.error || "Recherche fehlgeschlagen", limitReached: res.data?.limitReached });
      }
    } catch (e) {
      const errMsg = e?.response?.data?.error || e?.message || "Unbekannter Fehler";
      setResult({ success: false, message: errMsg, limitReached: e?.response?.data?.limitReached });
    }
    setResearching(false);
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
          <div>
            <h2 className="text-lg font-bold text-slate-900">Neue Firmenkontakte recherchieren</h2>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Vertriebo nutzt Ihre Zielgruppe und Suchgebiet, um passende Firmenkontakte zu finden.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div className="space-y-4 py-2">
            {result.success ? (
              <>
                <div className={`flex items-start gap-3 p-4 rounded-xl border-2 ${
                  result.data.count >= 10 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
                }`}>
                  <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${result.data.count >= 10 ? "text-green-600" : "text-amber-600"}`} />
                  <div className={`text-sm font-semibold ${result.data.count >= 10 ? "text-green-900" : "text-amber-900"}`}>
                    {result.data.count} Firmenkontakte gespeichert
                    {result.data.effectiveTarget < result.data.requestedTarget && (
                      <span className="block text-xs font-normal mt-0.5">
                        (Budget: {result.data.effectiveTarget} von {result.data.requestedTarget} angefragt)
                      </span>
                    )}
                  </div>
                </div>

                {/* Haupt-Statistik */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                  <div className="grid grid-cols-3 gap-2 pb-2 border-b border-slate-200 text-center">
                    <div>
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">Angefragt</span>
                      <span className="text-lg font-bold text-slate-700">{result.data.requestedTarget}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">Roh-Treffer</span>
                      <span className="text-lg font-bold text-slate-700">{result.data.summary?.raw_hits ?? "–"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">Gespeichert</span>
                      <span className="text-lg font-bold text-green-600">{result.data.summary?.saved ?? result.data.count}</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span>Dubletten (übersprungen):</span>
                      <span className="font-semibold text-slate-900">{result.data.summary?.duplicates ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ausgeschlossen:</span>
                      <span className="font-semibold text-slate-900">{result.data.summary?.excluded ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Außerhalb Radius:</span>
                      <span className="font-semibold text-slate-900">{result.data.summary?.outsideRadius ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nicht passend (Zielgruppe):</span>
                      <span className="font-semibold text-slate-900">{result.data.summary?.noMatch ?? 0}</span>
                    </div>
                  </div>
                  {result.data.search_queries?.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ausgeführte Suchanfragen ({result.data.search_queries.length})</span>
                      <div className="text-slate-600 space-y-0.5">
                        {result.data.search_queries.map((q, i) => (
                          <div key={i} className="truncate">• {q}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Credits nach dem Lauf – direkt aus DB */}
                {planLimits && usageInfo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="font-semibold text-blue-900 mb-1">Verbrauch diesen Monat (aktualisiert)</div>
                    <div className="flex justify-between text-blue-800">
                      <span>Recherche-Läufe:</span>
                      <span className="font-semibold">
                        {usageInfo.lead_generations_used} / {planLimits.max_lead_generations_per_month === -1 ? "∞" : planLimits.max_lead_generations_per_month}
                        {planLimits.max_lead_generations_per_month !== -1 && (
                          <span className="ml-1 text-blue-600">· {Math.max(0, planLimits.max_lead_generations_per_month - usageInfo.lead_generations_used)} verfügbar</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-blue-800">
                      <span>Gespeicherte Kontakte:</span>
                      <span className="font-semibold">
                        {usageInfo.leads_created} / {planLimits.max_leads_per_month === -1 ? "∞" : planLimits.max_leads_per_month}
                        {planLimits.max_leads_per_month !== -1 && (
                          <span className="ml-1 text-blue-600">· {Math.max(0, planLimits.max_leads_per_month - usageInfo.leads_created)} verfügbar</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-3 p-4 rounded-xl border-2 bg-red-50 border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-red-900">{result.message}</div>
                  {result.limitReached && (
                    <div className="text-xs text-red-700 mt-1">Plan-Limit erreicht. Bitte nächsten Monat oder nach Plan-Upgrade erneut versuchen.</div>
                  )}
                </div>
              </div>
            )}
            <Button onClick={onClose} className="w-full">Schließen</Button>
          </div>
        )}

        {/* Form */}
        {!loading && !result && (
          <div className="space-y-4 py-2">
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
              {(settings?.lead_plz_city || settings?.lead_plz) && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Suchgebiet:</span>
                  <span className="font-semibold text-slate-900">
                    {settings.lead_plz_city || settings.lead_plz}
                    {settings.lead_radius_km && ` (${settings.lead_radius_km} km)`}
                  </span>
                </div>
              )}
              {targetCustomers.length > 0 && (
                <div>
                  <span className="text-slate-600 block mb-1">Zielkunden:</span>
                  <span className="font-semibold text-slate-900 line-clamp-2">
                    {targetCustomers.slice(0, 3).join(", ")}{targetCustomers.length > 3 ? ", ..." : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Credits-Übersicht */}
            {planLimits && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-2">
                <div className="font-semibold text-blue-900 mb-1">Credits diesen Monat</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-blue-800">
                    <span>Recherche-Läufe:</span>
                    <span className="font-semibold">
                      {usageInfo?.lead_generations_used ?? 0} / {planLimits.max_lead_generations_per_month === -1 ? "∞" : planLimits.max_lead_generations_per_month} genutzt
                      {planLimits.max_lead_generations_per_month !== -1 && (
                        <span className="ml-1 text-blue-600">· {Math.max(0, planLimits.max_lead_generations_per_month - (usageInfo?.lead_generations_used ?? 0))} verfügbar</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-blue-800">
                    <span>Gespeicherte Kontakte:</span>
                    <span className="font-semibold">
                      {usageInfo?.leads_created ?? 0} / {planLimits.max_leads_per_month === -1 ? "∞" : planLimits.max_leads_per_month} genutzt
                      {planLimits.max_leads_per_month !== -1 && (
                        <span className="ml-1 text-blue-600">· {Math.max(0, planLimits.max_leads_per_month - (usageInfo?.leads_created ?? 0))} verfügbar</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-900 mb-2">Anzahl Firmenkontakte</p>
              <div className="grid grid-cols-3 gap-2">
                {[25, 50, 100].map(count => (
                  <button
                    key={count}
                    onClick={() => setTargetCount(count)}
                    className={`px-3 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${
                      targetCount === count
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-300 text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Entspricht ca. {targetCount + Math.ceil(targetCount * 0.5)} Google API Requests (geschätzt)
              </p>
            </div>

            {targetCustomers.length === 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 font-medium">
                ⚠️ Keine Zielkunden definiert. Bitte zuerst in den Einstellungen konfigurieren.
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} disabled={researching} className="flex-1">Abbrechen</Button>
              <Button
                onClick={handleStartResearch}
                disabled={researching || targetCustomers.length === 0}
                className="flex-1 gap-2"
              >
                {researching ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Läuft...</>
                ) : (
                  <><TrendingUp className="w-4 h-4" />Recherche starten</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}