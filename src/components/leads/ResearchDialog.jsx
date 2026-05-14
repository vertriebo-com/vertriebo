import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Loader2, AlertCircle, AlertTriangle, CheckCircle2, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ResearchSuccessScreen from "../research/ResearchSuccessScreen";
import TrialInfoDialog from "@/components/TrialInfoDialog";

function withTimeout(promise, ms = 45000, msg = "Recherche hat zu lange gedauert. Bitte erneut versuchen.") {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

const DEFAULT_PLAN_LIMITS = {
  max_leads_per_month: 300,
};

export default function ResearchDialog({ open, orgId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({});
  const [targetCount, setTargetCount] = useState(25);
  const [usageInfo, setUsageInfo] = useState(null);
  const [currentPlanLimits, setCurrentPlanLimits] = useState(DEFAULT_PLAN_LIMITS);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [slowWarning, setSlowWarning] = useState(false);
  const [researchRun, setResearchRun] = useState(null);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [showTrialInfoDialog, setShowTrialInfoDialog] = useState(false);
  const [org, setOrg] = useState(null);
  const [trialStage, setTrialStage] = useState(null);
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

      const organization = orgs[0];
      setOrg(organization);
      const ts = organization?.trial_stage || 'free_preview';
      setTrialStage(ts);

      // Sofort TrialInfoDialog wenn Free Preview Limit bereits erreicht
      if (ts === 'free_preview' && (organization?.trial_leads_granted || 0) >= 10) {
        setShowTrialInfoDialog(true);
      }

      // Set correct target count basierend auf trial_stage
      if (ts === 'free_preview') {
        const remaining = Math.max(0, 10 - (organization?.trial_leads_granted || 0));
        setTargetCount(Math.max(1, remaining));
      } else if (ts === 'verified_trial') {
        setTargetCount(25); // verified_trial kann max. 25 pro Recherche
      }
      // paid: bleibt auf initial 25
      
      if (organization?.plan_id) {
        const [plans, usageLogs] = await Promise.all([
          base44.entities.Plan.filter({ id: organization.plan_id }),
          base44.entities.UsageLog.filter({ organization_id: orgId, period_month: new Date().toISOString().slice(0, 7) }),
        ]);
        if (plans[0]) {
          setCurrentPlan(plans[0]);
          setCurrentPlanLimits({
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

  const ownIndustry = settings.industry_name || settings.own_industry || "";
  const servicesUsed = (settings.services || settings.dienstleistungen || "").split(", ").filter(x => x.trim());
  const targetCustomers = (settings.target_customer_types || settings.zielkunden || "").split(", ").filter(x => x.trim());
  const excludedCustomersUsed = (settings.excluded_customer_types || "").split(", ").filter(x => x.trim());

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

      // Fehler-Mapping für freundliche Meldungen
      if (res.data?.parallelLockActive) {
        setError(res.data.error || "Es läuft bereits eine Recherche. Bitte warten Sie kurz.");
      } else if (res.data?.error === 'trial_preview_limit_reached') {
        setError("Vorschau-Limit erreicht");
        setShowTrialInfoDialog(true);
      } else if (res.data?.error === 'abuse_blocked') {
        setError("Ihr Zugang wurde zur Sicherheitsprüfung eingeschränkt. Bitte kontaktieren Sie den Support.");
      } else if (res.data?.error === 'organization_suspended') {
        setError("Diese Organisation ist vorübergehend gesperrt. Bitte kontaktieren Sie den Support.");
      } else if (res.data?.success) {
        // Ergebnis SOFORT setzen – nichts darf das blockieren
        setResult({ success: true, data: res.data });
        console.log("[ResearchDialog] SET RESULT DONE");

        // ResearchRun speichern + Success-Screen anzeigen (wenn neue Leads)
        if (res.data.research_run_id) {
          console.log("[ResearchDialog] Setting research_run_id:", res.data.research_run_id);
          setResearchRun(res.data.research_run_id);
          // Success-Screen zeigen, wenn neue Leads oder bestimmte Fälle
          if (res.data.count > 0 || res.data.runType === "duplicate_only" || res.data.runType === "no_match" || res.data.runType === "zero_result") {
            setShowSuccessScreen(true);
          }
        }

        onSuccess?.();

        // UsageLog async im Hintergrund – darf den Report nie blockieren
        setTimeout(() => refreshUsageSafe(), 0);

        // Org neu laden damit trial_leads_granted aktuell ist
        setTimeout(async () => {
          try {
            const orgs = await base44.entities.Organization.filter({ id: orgId });
            if (orgs[0]) setOrg(orgs[0]);
          } catch {}
        }, 500);
      } else {
        setError(res.data?.error || "Recherche fehlgeschlagen.");
        if (res.data?.limitReached) {
          setError((res.data?.error || "Recherche fehlgeschlagen.") + " (Plan-Limit erreicht)");
        }
      }
    } catch (e) {
       console.error("[ResearchDialog] generateLeads error:", e);
       const errorMsg = e?.response?.data?.error || e?.message || "Recherche fehlgeschlagen. Bitte erneut versuchen.";
       // Friendly error messages
       if (errorMsg && (errorMsg.includes('trial') || errorMsg.includes('preview'))) {
         setShowTrialInfoDialog(true);
         setError("Vorschau-Limit erreicht");
       } else {
         setError(errorMsg || "Recherche fehlgeschlagen. Bitte erneut versuchen.");
       }
    } finally {
      clearTimeout(slowTimerRef.current);
      setResearching(false);
      researchingRef.current = false;
      setSlowWarning(false);
      console.log("[ResearchDialog] FINALLY research false");
    }
  };

  if (!open) return null;

  // Success Screen wird in separater Modal angezeigt
  if (showSuccessScreen && researchRun) {
    return (
      <>
        <ResearchSuccessScreen
          researchRun={researchRun}
          orgId={orgId}
          onClose={() => {
            setShowSuccessScreen(false);
            onClose();
          }}
          onViewAllLeads={() => {
            setShowSuccessScreen(false);
            onClose();
          }}
        />
      </>
    );
  }

  // TrialInfoDialog rendern wenn showTrialInfoDialog
  if (showTrialInfoDialog) {
    return (
      <>
        <TrialInfoDialog
          isOpen={showTrialInfoDialog}
          onClose={() => {
            setShowTrialInfoDialog(false);
            onClose();
          }}
          trial_stage={trialStage}
          trial_leads_granted={org?.trial_leads_granted || 0}
          plan={currentPlan ? {
            name: currentPlan.name || 'Starter',
            max_leads_per_month: currentPlan.max_leads_per_month ?? 300,
            price_monthly: currentPlan.price_monthly ?? 9900
          } : {
            name: 'Starter',
            max_leads_per_month: 300,
            price_monthly: 9900
          }}
          trialEndsAt={org?.trial_ends_at}
          onUpgrade={() => {
            setShowTrialInfoDialog(false);
            window.location.href = "/settings?tab=billing";
          }}
        />
      </>
    );
  }

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
             Vertriebo durchsucht automatisch Google Maps und findet passende Firmenkontakte in Ihrem Suchgebiet.
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
            <div className="text-xs text-slate-500 text-center space-y-1.5">
              <p>🔍 Firmenprofile werden geprüft…</p>
              <p>✅ Passende Kontakte werden vorbereitet…</p>
              <p>🔄 Dubletten werden übersprungen…</p>
              {trialStage === 'free_preview' && (
                <p className="text-blue-600 font-medium mt-2">Vorschau-Modus: Suche läuft schnell mit max. 10 Kontakten.</p>
              )}
            </div>
            {slowWarning && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 text-center font-medium">
                Die Recherche dauert etwas länger als üblich. Bitte warten…
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
                {/* ── Haupt-Statusbox je runType ── */}
                {result.data.runType === "duplicate_only" ? (
                  <div className="flex items-start gap-3 p-4 rounded-xl border-2 bg-blue-50 border-blue-200">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
                    <div>
                      <div className="text-sm font-semibold text-blue-900">Keine neuen Firmenkontakte gefunden</div>
                      <div className="text-xs text-blue-800 mt-1 font-medium">
                        Alle {result.data.summary?.duplicates} gefundenen Treffer sind bereits in Ihrer Leadliste vorhanden.
                      </div>
                      <div className="text-xs text-blue-700 mt-1.5 bg-blue-100 rounded-lg px-2 py-1 inline-block font-semibold">
                        ✓ Kein Recherche-Credit verbraucht
                      </div>
                    </div>
                  </div>
                ) : result.data.runType === "no_match" || result.data.runType === "zero_result" ? (
                  <div className="flex items-start gap-3 p-4 rounded-xl border-2 bg-amber-50 border-amber-200">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                    <div>
                      <div className="text-sm font-semibold text-amber-900">
                        {result.data.runType === "zero_result"
                          ? "Keine Treffer in Google gefunden"
                          : "Keine passenden Firmenkontakte gefunden"}
                      </div>
                      <div className="text-xs text-amber-800 mt-1 font-medium">
                        {result.data.runType === "zero_result"
                          ? "Google hat für Ihr Suchgebiet keine Ergebnisse zurückgegeben. Bitte Radius oder Zielkunden überprüfen."
                          : `${result.data.summary?.raw_hits} Treffer gefunden, aber keiner passte zur Zielgruppe oder war bereits vorhanden.`}
                      </div>
                      <div className="text-xs text-amber-700 mt-1.5 bg-amber-100 rounded-lg px-2 py-1 inline-block font-semibold">
                        ✓ Kein Recherche-Credit verbraucht
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-start gap-3 p-4 rounded-xl border-2 ${
                    result.data.count >= 10 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
                  }`}>
                    <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${result.data.count >= 10 ? "text-green-600" : "text-amber-600"}`} />
                    <div>
                      <div className={`text-sm font-semibold ${result.data.count >= 10 ? "text-green-900" : "text-amber-900"}`}>
                        {trialStage === 'free_preview'
                          ? `Kostenlose Vorschau abgeschlossen – ${result.data.count} von 10 Vorschaukontakten gespeichert`
                          : `${result.data.count} Firmenkontakte gespeichert`}
                      </div>
                      {trialStage === 'free_preview' && (
                        <div className="text-xs mt-1.5 space-y-1">
                          <p className="text-slate-600">Die Recherche wurde auf die kostenlose Vorschau begrenzt.</p>
                          <button
                            onClick={() => { window.location.href = "/settings?tab=billing"; }}
                            className="text-blue-600 font-semibold underline hover:text-blue-700"
                          >
                            Verifizierten Testzugang aktivieren →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Radius-Transparenz */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="font-bold text-blue-900 mb-1">Suchgebiet & Radius</div>
                  <div className="flex justify-between text-blue-900 font-medium">
                    <span>Angefragter Radius:</span>
                    <span className="font-semibold">{result.data.summary?.radiusKm ?? "–"} km um {result.data.summary?.searchCenterCity ?? "–"}</span>
                  </div>
                  {(result.data.summary?.targetLocations?.length > 0) && (
                    <div className="flex justify-between text-blue-800">
                      <span>Manuelle Zielorte:</span>
                      <span className="font-semibold">{result.data.summary?.targetLocations?.join(", ")}</span>
                    </div>
                  )}
                  {(result.data.summary?.nearbyCitiesDynamic?.length > 0) && (
                    <div className="flex justify-between text-blue-800">
                      <span>Automatisch erkannte Orte:</span>
                      <span className="font-semibold">{result.data.summary?.nearbyCitiesDynamic?.join(", ")}</span>
                    </div>
                  )}
                  <div className="text-blue-800">
                    <span>Alle Suchstädte: </span>
                    <span className="font-semibold">{(result.data.summary?.searchCities ?? []).join(", ")}</span>
                  </div>
                  {(result.data.summary?.searchCities?.length ?? 0) > 1 && (
                    <p className="text-[10px] text-blue-700 italic">
                      Gespeichert werden nur Kontakte innerhalb von {result.data.summary?.radiusKm} km.
                    </p>
                  )}
                  {result.data.summary?.maxSavedDistanceKm > 0 && (
                    <div className="flex justify-between text-blue-800 pt-1 border-t border-blue-200">
                      <span>Max. Entfernung gespeicherter Lead:</span>
                      <span className="font-semibold">{result.data.summary.maxSavedDistanceKm} km</span>
                    </div>
                  )}
                </div>

                {/* Statistik – nur für paid/trial sichtbar, nicht für Free Preview */}
                {trialStage !== 'free_preview' && (<div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                  <div className="grid grid-cols-3 gap-2 pb-2 border-b border-slate-200 text-center">
                    <div>
                      <span className="text-slate-700 block text-[10px] font-bold uppercase">Angefragt</span>
                      <span className="text-lg font-bold text-slate-700">{result.data.requestedTarget}</span>
                    </div>
                    <div>
                      <span className="text-slate-700 block text-[10px] font-bold uppercase">Roh-Treffer</span>
                      <span className="text-lg font-bold text-slate-700">{result.data.summary?.raw_hits ?? "–"}</span>
                    </div>
                    <div>
                      <span className="text-slate-700 block text-[10px] font-bold uppercase">Gespeichert</span>
                      <span className="text-lg font-bold text-green-600">{result.data.summary?.saved ?? result.data.count}</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex justify-between font-medium">
                      <span>Dubletten (übersprungen):</span>
                      <span className="font-bold text-slate-900">{result.data.summary?.duplicates ?? 0}</span>
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
                  {result.data.summary?.ambiguous > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-amber-600 uppercase block mb-1">
                        Unklare Verwaltungstreffer – nicht gespeichert ({result.data.summary.ambiguous})
                      </span>
                      <p className="text-[10px] text-amber-700 mb-1">Firmenname enthält „Verwaltung", aber kein Immobilien-/WEG-/Mietkontext erkennbar.</p>
                      <div className="space-y-0.5">
                        {(result.data.summary?.ambiguousExamples || []).map((ex, i) => (
                          <div key={i} className="text-[10px]">
                            <span className="font-semibold text-slate-700">{ex.name}</span>
                            <span className="ml-1 text-amber-600">– {ex.reason}</span>
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
                  </div>)}

                  {/* Credits aus DB (nach Refresh) – nur anzeigen wenn Credits verbraucht wurden */}
                  {usageInfo && result.data.chargedLeadGeneration && (
                       <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-1.5">
                         <div className="font-semibold text-blue-900 mb-1">Verbrauch diesen Monat (aktualisiert)</div>
                         <div className="flex justify-between text-blue-800">
                           <span>Gespeicherte Kontakte:</span>
                           <span className="font-semibold">
                             {usageInfo.leads_created} / {(currentPlanLimits?.max_leads_per_month ?? 300) === -1 ? "∞" : currentPlanLimits?.max_leads_per_month ?? 300}
                             {(currentPlanLimits?.max_leads_per_month ?? 300) !== -1 && (
                               <span className="ml-1 text-blue-600">· {Math.max(0, (currentPlanLimits?.max_leads_per_month ?? 300) - usageInfo.leads_created)} verfügbar</span>
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
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
              {ownIndustry && (
                <div>
                  <span className="text-slate-600 block mb-1 font-medium">Branche:</span>
                  <span className="font-semibold text-slate-900">{ownIndustry}</span>
                </div>
              )}
              {servicesUsed.length > 0 && (
                <div>
                  <span className="text-slate-600 block mb-1 font-medium">Leistungen:</span>
                  <span className="font-semibold text-slate-900 line-clamp-2">
                    {servicesUsed.slice(0, 3).join(", ")}{servicesUsed.length > 3 ? ", ..." : ""}
                  </span>
                </div>
              )}
              {targetCustomers.length > 0 ? (
                <div>
                  <span className="text-slate-600 block mb-1 font-medium">Zielkunden:</span>
                  <span className="font-semibold text-slate-900 line-clamp-2">
                    {targetCustomers.slice(0, 3).join(", ")}{targetCustomers.length > 3 ? ", ..." : ""}
                  </span>
                </div>
              ) : (
                <div className="text-red-700 font-medium">⚠️ Keine Zielkunden definiert</div>
              )}
              {excludedCustomersUsed.length > 0 && (
                <div>
                  <span className="text-slate-600 block mb-1 font-medium">Ausschlüsse:</span>
                  <span className="font-semibold text-slate-900 line-clamp-2">
                    {excludedCustomersUsed.slice(0, 2).join(", ")}{excludedCustomersUsed.length > 2 ? ", ..." : ""}
                  </span>
                </div>
              )}
              {(settings?.lead_plz_city || settings?.service_area_city || settings?.lead_plz) && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Suchgebiet:</span>
                    <span className="font-semibold text-slate-900">
                      {settings.lead_radius_km || settings.service_area_radius_km || "25"} km um {settings.lead_plz_city || settings.service_area_city || settings.lead_plz}
                    </span>
                  </div>
                  {settings.target_locations && settings.target_locations.trim() && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Zusätzliche Zielorte:</span>
                      <span className="font-semibold text-slate-900 text-right max-w-[55%]">{settings.target_locations}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quota-Anzeige: Nur EINE Ebene je trial_stage */}
            {trialStage === 'free_preview' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-2">
                <div className="font-semibold text-blue-900 mb-1">Kostenlose Vorschau</div>
                <div className="flex justify-between text-blue-800">
                  <span>Vorschaukontakte:</span>
                  <span className="font-semibold">{org?.trial_leads_granted || 0} / 10 genutzt</span>
                </div>
                <p className="text-blue-700 text-[10px] mt-1">Aktivieren Sie den Testzugang für mehr Recherchen.</p>
              </div>
            )}

            {trialStage === 'verified_trial' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-2">
                <div className="font-semibold text-amber-900 mb-1">Testzugang aktiv</div>
                <div className="flex justify-between text-amber-800">
                  <span>Firmenkontakte:</span>
                  <span className="font-semibold">
                    {usageInfo?.leads_created ?? 0} / {currentPlanLimits?.max_leads_per_month === -1 ? "∞" : currentPlanLimits?.max_leads_per_month ?? 300}
                    {currentPlanLimits?.max_leads_per_month !== -1 && (
                      <span className="ml-1 text-amber-600">· {Math.max(0, (currentPlanLimits?.max_leads_per_month ?? 300) - (usageInfo?.leads_created ?? 0))} verfügbar</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {trialStage === 'paid' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-2">
                <div className="font-semibold text-blue-900 mb-1">Monatliches Kontingent</div>
                <div className="flex justify-between text-blue-800">
                  <span>Firmenkontakte:</span>
                  <span className="font-semibold">
                    {usageInfo?.leads_created ?? 0} / {currentPlanLimits?.max_leads_per_month === -1 ? "∞" : currentPlanLimits?.max_leads_per_month ?? 300}
                    {currentPlanLimits?.max_leads_per_month !== -1 && (
                      <span className="ml-1 text-blue-600">· {Math.max(0, (currentPlanLimits?.max_leads_per_month ?? 300) - (usageInfo?.leads_created ?? 0))} verfügbar</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Spezifische Warnung nur wenn Limit JETZT erreicht */}
            {trialStage === 'free_preview' && (org?.trial_leads_granted || 0) >= 10 && (
              <div className="rounded-xl p-3 border bg-red-50 border-red-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-red-900">Vorschau-Limit erreicht</p>
                    <p className="text-red-800">Aktivieren Sie den Testzugang, um weitere Firmenkontakte zu recherchieren.</p>
                  </div>
                </div>
              </div>
            )}

            {trialStage === 'verified_trial' && (currentPlanLimits?.max_leads_per_month ?? 300) !== -1 && (usageInfo?.leads_created ?? 0) >= (currentPlanLimits?.max_leads_per_month ?? 300) && (
              <div className="rounded-xl p-3 border bg-red-50 border-red-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-red-900">Testzugang-Kontingent erreicht</p>
                    <p className="text-red-800">Sie haben {currentPlanLimits?.max_leads_per_month ?? 300} Firmenkontakte in diesem Abrechnungszeitraum genutzt.</p>
                  </div>
                </div>
              </div>
            )}

            {trialStage === 'paid' && (currentPlanLimits?.max_leads_per_month ?? 300) !== -1 && (usageInfo?.leads_created ?? 0) >= (currentPlanLimits?.max_leads_per_month ?? 300) && (
              <div className="rounded-xl p-3 border bg-red-50 border-red-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-red-900">Monatliches Limit erreicht</p>
                    <p className="text-red-800">Upgraden Sie Ihren Tarif für mehr Firmenkontakte.</p>
                  </div>
                </div>
              </div>
            )}

            {targetCustomers.length === 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 font-medium">
                ⚠️ Keine Zielkunden definiert. Bitte zuerst in den Einstellungen konfigurieren.
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} className="flex-1 bg-white text-slate-700 border-slate-300 hover:bg-slate-50">Abbrechen</Button>
              
              {/* Quota Reached: Primary CTA ist Upgrade/Testzugang */}
              {trialStage === 'free_preview' && (org?.trial_leads_granted || 0) >= 10 ? (
                <Button
                  onClick={() => window.location.href = "/settings?tab=billing"}
                  className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Testzugang aktivieren
                </Button>
              ) : trialStage === 'verified_trial' && (currentPlanLimits?.max_leads_per_month ?? 300) !== -1 && (usageInfo?.leads_created ?? 0) >= (currentPlanLimits?.max_leads_per_month ?? 300) ? (
                <Button
                  onClick={() => window.location.href = "/settings?tab=billing"}
                  className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Zum Billing
                </Button>
              ) : trialStage === 'paid' && (currentPlanLimits?.max_leads_per_month ?? 300) !== -1 && (usageInfo?.leads_created ?? 0) >= (currentPlanLimits?.max_leads_per_month ?? 300) ? (
                <Button
                  onClick={() => window.location.href = "/settings?tab=billing"}
                  className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Tarif upgraden
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (targetCustomers.length === 0) return;
                    handleStartResearch();
                  }}
                  disabled={targetCustomers.length === 0}
                  className="flex-1 gap-2"
                >
                  <TrendingUp className="w-4 h-4" />Recherche starten
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}