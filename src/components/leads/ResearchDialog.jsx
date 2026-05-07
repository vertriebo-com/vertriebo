import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ResearchDialog({ open, orgId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [result, setResult] = useState(null);
  const [settings, setSettings] = useState({});
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
      const settingsData = await base44.entities.OrganizationSettings.filter({ organization_id: orgId });
      const settingsMap = {};
      settingsData.forEach(s => { settingsMap[s.key] = s.value; });
      setSettings(settingsMap);
    } catch (err) {
      toast.error("Fehler beim Laden der Einstellungen");
    } finally {
      setLoading(false);
    }
  };

  const targetCustomers = [
    ...((settings.target_customer_types || "").split(", ").filter(x => x.trim())),
    ...((settings.custom_target_customer_types || "").split(", ").filter(x => x.trim())),
  ];

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
        setResult({
          success: true,
          count: res.data.count,
          summary: res.data.summary,
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
            <h2 className="text-lg font-bold text-slate-900">Neue Firmenkontakte recherchieren</h2>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Vertriebo nutzt Ihre Zielgruppe, Leistungen und Ihr Gebiet, um passende Firmenkontakte vorzuschlagen.
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        )}

        {/* Result State */}
        {!loading && result && (
          <div className="space-y-4 py-4">
            {result.success ? (
              <>
                <div className={`flex items-start gap-3 p-4 rounded-xl border-2 ${
                  result.count >= 20 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
                }`}>
                  <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${result.count >= 20 ? "text-green-600" : "text-amber-600"}`} />
                  <div className={`text-sm font-medium ${result.count >= 20 ? "text-green-900" : "text-amber-900"}`}>
                    {result.count} Firmenkontakte gespeichert
                  </div>
                </div>

                {result.summary && (
                  <>
                    <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-lg">
                      <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-slate-200">
                        <div>
                          <span className="text-slate-600 block text-[10px] font-semibold uppercase">Gefunden (Roh)</span>
                          <span className="text-lg font-bold text-slate-900">{result.summary.raw_hits}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 block text-[10px] font-semibold uppercase">Gespeichert</span>
                          <span className="text-lg font-bold text-green-600">{result.summary.created}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
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
                    </div>

                    {result.search_queries && result.search_queries.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-900 uppercase mb-2">Suchbegriffe ({result.search_queries.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {result.search_queries.map((q, i) => (
                            <span key={i} className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded">
                              {q}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.count < 10 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-900 mb-2">💡 Weniger Kontakte als erwartet?</p>
                        <ul className="text-xs text-amber-800 space-y-0.5">
                          <li>• Vergrößern Sie den Suchradius</li>
                          <li>• Wählen Sie mehr Zielkundengruppen aus</li>
                          <li>• Führen Sie eine neue Recherche durch</li>
                        </ul>
                      </div>
                    )}
                  </>
                )}

                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 text-center font-semibold">
                  {result.count} Credits verbraucht
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3 p-4 rounded-xl border-2 bg-red-50 border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm font-medium text-red-900">{result.message}</div>
              </div>
            )}
            <Button onClick={onClose} className="w-full">Schließen</Button>
          </div>
        )}

        {/* Form State */}
        {!loading && !result && (
          <div className="space-y-4 py-4">
            {/* Settings Info */}
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
              {settings?.own_industry && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Ihre Branche:</span>
                  <span className="font-semibold text-slate-900">{settings.own_industry}</span>
                </div>
              )}
              {settings?.service_area_city && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Suchgebiet:</span>
                  <span className="font-semibold text-slate-900">{settings.service_area_city} ({settings.service_area_radius_km} km)</span>
                </div>
              )}
              {targetCustomers.length > 0 && (
                <div>
                  <span className="text-slate-600 block mb-1">Zielkunden:</span>
                  <span className="font-semibold text-slate-900 line-clamp-2">{targetCustomers.slice(0, 3).join(", ")}{targetCustomers.length > 3 ? ", ..." : ""}</span>
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
            </div>

            {targetCustomers.length === 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 font-medium">
                ⚠️ Keine Zielkunden definiert. Definieren Sie diese zuerst in Ihren Einstellungen.
              </div>
            )}

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
                disabled={researching || targetCustomers.length === 0}
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