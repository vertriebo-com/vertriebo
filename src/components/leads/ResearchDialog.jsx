import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function withTimeout(promise, ms = 45000, msg = "Recherche hat zu lange gedauert. Bitte erneut versuchen.") {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

export default function ResearchDialog({ open, orgId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({});
  const [targetCount, setTargetCount] = useState(25);
  const [usageInfo, setUsageInfo] = useState(null);
  const [planLimits, setPlanLimits] = useState(null);
  const [slowWarning, setSlowWarning] = useState(false);
  const researchingRef = useRef(false); // guard against double-invoke
  const slowTimerRef = useRef(null);

  useEffect(() => {
    if (open && orgId) {
      setResult(null);
      setError(null);
      setResearching(false);
      researchingRef.current = false;
      loadSettings();
    }
  }, [open, orgId]);

  // Cleanup slow-warning timer on unmount
  useEffect(() => () => clearTimeout(slowTimerRef.current), []);

  const loadSettings = async () => {
    setLoading(true);
    try {
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
        if (plans[0]) {
          setPlanLimits({
            max_lead_generations_per_month: plans[0].max_lead_generations_per_month ?? 100,
            max_leads_per_month: plans[0].max_leads_per_month ?? 300,
          });
        }
        if (usageLogs[0]) {
          setUsageInfo({
            lead_generations_used: usageLogs[0].lead_generations_used ?? 0,
            leads_created: usageLogs[0].leads_created ?? 0,
          });
        }
      }
    } catch (e) {
      console.error("[ResearchDialog] loadSettings error:", e);
    } finally {
      setLoading(false);
    }
  };

  const refreshUsageSafe = async () => {
    try {
      const periodMonth = new Date().toISOString().slice(0, 7);
      const usageLogs = await base44.entities.UsageLog.filter({ organization_id: orgId, period_month: periodMonth });
      if (usageLogs[0]) {
        setUsageInfo({
          lead_generations_used: usageLogs[0].lead_generations_used ?? 0,
          leads_created: usageLogs[0].leads_created ?? 0,
        });
      }
    } catch (err) {
      console.warn("[ResearchDialog] UsageLog refresh skipped (non-critical):", err.message);
    }
  };

  const targetCustomers = (settings.zielkunden || "").split(", ").filter(x => x.trim());

  const handleStartResearch = async () => {
    // Hard guard: keine Doppelausführung
    if (researchingRef.current) {
      console.warn("[ResearchDialog] Research already running, ignoring click.");
      return;
    }
    if (targetCustomers.length === 0) {
      toast.error("Bitte definieren Sie zuerst Zielkunden in den Einstellungen.");
      return;
    }

    researchingRef.current = true;
    setResearching(true);
    setError(null);
    setSlowWarning(false);

    // Slow-warning nach 20s
    slowTimerRef.current = setTimeout(() => setSlowWarning(true), 20000);

    console.log("[ResearchDialog] START research", { orgId, target_count: targetCount });

    try {
      const res = await withTimeout(
        base44.functions.invoke("generateLeads", {
          organization_id: orgId,
          target_count: targetCount,
        }),
        45000
      );

      console.log("[ResearchDialog] RESULT", res.data);

      if (res.data?.success) {
        // Ergebnis SOFORT setzen – nichts darf das blockieren
        setResult({ success: true, data: res.data });
        console.log("[ResearchDialog] SET RESULT DONE");
        onSuccess?.();

        // UsageLog async im Hintergrund – darf den Report nie blockieren
        setTimeout(() => refreshUsageSafe(), 0);
      } else {
        setError(res.data?.error || "Recherche fehlgeschlagen.");
        if (res.data?.limitReached) {
          setError((res.data?.error || "Recherche fehlgeschlagen.") + " (Plan-Limit erreicht)");
        }
      }
    } catch (e) {
      console.error("[ResearchDialog] generateLeads error:", e);
      setError(e?.response?.data?.error || e?.message || "Recherche fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      clearTimeout(slowTimerRef.current);
      setResearching(false);
      researchingRef.current = false;
      setSlowWarning(false);
      console.log("[ResearchDialog] FINALLY research false");
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
          <div>
            <h2 className="text-lg font-bold text-slate-900">Neue Firmenkontakte recherchieren</h2>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Vertriebo nutzt Ihre Zielgruppe und Suchgebiet, um passende Firmenkontakte zu finden.
            </p>
          </div>
        </div>

        {/* Settings loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        )}

        {/* Research running overlay */}
        {!loading && researching && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-800">Recherche läuft…</p>
            <p className="text-xs text-slate-500 text-center">
              Google Places wird nach passenden Firmenkontakten durchsucht.
            </p>
            {slowWarning && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 text-center font-medium">
                Die Recherche dauert ungewöhnlich lange. Bitte warten oder danach erneut versuchen.
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {!loading && !researching && error && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-4 rounded-xl border-2 bg-red-50 border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-red-900">{error}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Schließen</Button>
              <Button onClick={() => { setError(null); }} className="flex-1 gap-2">
                <RefreshCw className="w-4 h-4" /> Erneut versuchen
              </Button>
            </div>
          </div>
        )}

        {/* Result */}
        {!loading && !researching && !error && result && (
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

                {/* Radius-Transparenz */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="font-semibold text-blue-900 mb-1">Suchgebiet & Radius</div>
                  <div className="flex justify-between text-blue-800">
                    <span>Angefragter Radius:</span>
                    <span className="font-semibold">{result.data.summary?.radiusKm ?? "–"} km um {result.data.summary?.searchCenterCity ?? "–"}</span>
                  </div>
                  <div className="text-blue-800">
                    <span>Suchstädte: </span>
                    <span className="font-semibold">{(result.data.summary?.searchCities ?? []).join(", ")}</span>
                  </div>
                  {(result.data.summary?.searchCities?.length ?? 0) > 1 && (
                    <p className="text-[10px] text-blue-700 italic">
                      Zur besseren Trefferquote wurden nahegelegene Orte im Umkreis automatisch berücksichtigt. Gespeichert werden nur Kontakte innerhalb von {result.data.summary?.radiusKm} km.
                    </p>
                  )}
                  {result.data.summary?.maxSavedDistanceKm > 0 && (
                    <div className="flex justify-between text-blue-800 pt-1 border-t border-blue-200">
                      <span>Max. Entfernung gespeicherter Lead:</span>
                      <span className="font-semibold">{result.data.summary.maxSavedDistanceKm} km</span>
                    </div>
                  )}
                </div>

                {/* Statistik */}
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
                      <span>Außerhalb Radius verworfen:</span>
                      <span className="font-semibold text-slate-900">{result.data.summary?.outsideRadius ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nicht passend (Zielgruppe):</span>
                      <span className="font-semibold text-slate-900">{result.data.summary?.noMatch ?? 0}</span>
                    </div>
                  </div>
                  {result.data.summary?.outsideRadiusExamples?.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-orange-600 uppercase block mb-1">
                        Radius-Verwürfe ({result.data.summary.outsideRadiusExamples.length})
                      </span>
                      <div className="space-y-0.5">
                        {result.data.summary.outsideRadiusExamples.map((ex, i) => (
                          <div key={i} className="text-[10px]">
                            <span className="font-semibold text-slate-700">{ex.name}</span>
                            <span className="ml-1 text-orange-600">– {ex.distance_km} km (außerhalb {result.data.summary.radiusKm} km)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.data.summary?.savedExamples?.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-green-700 uppercase block mb-1">
                        Gespeicherte Beispiele
                      </span>
                      <div className="space-y-0.5">
                        {result.data.summary.savedExamples.map((ex, i) => (
                          <div key={i} className="text-[10px]">
                            <span className="font-semibold text-slate-700">{ex.name}</span>
                            <span className="ml-1 text-slate-500">{ex.city}{ex.distance_km !== null ? ` · ${ex.distance_km} km` : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.data.summary?.noMatchExamples?.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Zielgruppe-Verwürfe ({result.data.summary.noMatchExamples.length})
                      </span>
                      <div className="text-slate-500 space-y-0.5">
                        {result.data.summary.noMatchExamples.map((ex, i) => (
                          <div key={i} className="text-[10px]">
                            <span className="font-semibold text-slate-700">{ex.name}</span>
                            <span className="ml-1 text-slate-400">– {ex.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Credits aus DB (nach Refresh) */}
                {planLimits && usageInfo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="font-semibold text-blue-900 mb-1">Verbrauch diesen Monat</div>
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
                <div className="text-sm font-semibold text-red-900">{result.message}</div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={onClose} className="flex-1">Schließen</Button>
              <Button variant="outline" onClick={() => { setResult(null); setError(null); }} className="flex-1 gap-2">
                <RefreshCw className="w-4 h-4" /> Neue Recherche
              </Button>
            </div>
          </div>
        )}

        {/* Form – only shown when not loading, not researching, no result, no error */}
        {!loading && !researching && !result && !error && (
          <div className="space-y-4 py-2">
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
              {(settings?.lead_plz_city || settings?.lead_plz) && (
                <div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Suchgebiet:</span>
                    <span className="font-semibold text-slate-900">
                      {settings.lead_radius_km ? `${settings.lead_radius_km} km` : "25 km"} um {settings.lead_plz_city || settings.lead_plz}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Zur besseren Trefferquote werden nahegelegene Orte im Umkreis automatisch berücksichtigt. Gespeichert werden nur Kontakte innerhalb des Radius.
                  </p>
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
              <Button variant="outline" onClick={onClose} className="flex-1">Abbrechen</Button>
              <Button
                onClick={handleStartResearch}
                disabled={targetCustomers.length === 0}
                className="flex-1 gap-2"
              >
                <TrendingUp className="w-4 h-4" />Recherche starten
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}