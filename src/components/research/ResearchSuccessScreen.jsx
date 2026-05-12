import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, TrendingUp, ArrowRight, Phone, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";

export default function ResearchSuccessScreen({ researchRun, orgId, onClose, onViewAllLeads }) {
  const [topLeads, setTopLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [researchRunData, setResearchRunData] = useState(researchRun);

  useEffect(() => {
    (async () => {
      try {
        // Wenn researchRun ein String (ID) ist, lade die volle Entity
        if (typeof researchRun === "string") {
          const runs = await base44.entities.ResearchRun.filter({ id: researchRun });
          if (runs?.[0]) {
            setResearchRunData(runs[0]);
            const leads = await base44.entities.Company.filter(
              { organization_id: orgId, research_run_id: runs[0].id },
              "-priority_score",
              5
            );
            setTopLeads(leads || []);
          }
        } else if (researchRun?.id) {
          // Bereits volle Entity
          setResearchRunData(researchRun);
          const leads = await base44.entities.Company.filter(
            { organization_id: orgId, research_run_id: researchRun.id },
            "-priority_score",
            5
          );
          setTopLeads(leads || []);
        }
      } catch (e) {
        console.warn("[ResearchSuccess] Fehler beim Laden der Top-Leads:", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [researchRun, orgId]);

  if (!researchRunData) return null;

  const runType = researchRunData.run_type || "new_leads";

  // Ermittle trial_stage aus summary JSON (vom Backend eingebettet)
  const summaryData = (() => {
    try { return researchRunData.summary ? JSON.parse(researchRunData.summary) : {}; } catch { return {}; }
  })();
  const isFreePreview = summaryData.runType === 'new_leads' && (summaryData.query_budget?.maxSearchQueries === 6 || researchRunData.requested_target <= 3);

  // ── Case: Neue Leads gefunden ──
  if (runType === "new_leads" && researchRunData.leads_saved > 0) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-xl">
          {/* Header */}
          <div className={`bg-gradient-to-r ${isFreePreview ? 'from-blue-50 to-blue-100/50 border-blue-200' : 'from-emerald-50 to-emerald-100/50 border-emerald-200'} border-b px-6 py-6`}>
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-lg ${isFreePreview ? 'bg-blue-600' : 'bg-emerald-600'} flex items-center justify-center shrink-0`}>
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isFreePreview ? 'text-blue-900' : 'text-emerald-900'}`}>
                  {isFreePreview ? 'Kostenlose Vorschau abgeschlossen' : 'Recherche abgeschlossen'}
                </h2>
                <p className={`text-sm mt-0.5 font-medium ${isFreePreview ? 'text-blue-800' : 'text-emerald-800'}`}>
                  {isFreePreview
                    ? 'Die Recherche wurde bewusst auf die kostenlose Vorschau begrenzt.'
                    : 'Vertriebo hat passende Firmenkontakte gefunden und vorbereitet.'}
                </p>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="px-6 py-6 space-y-4">
            <div className={`${isFreePreview ? 'bg-blue-50 border-l-4 border-blue-600' : 'bg-emerald-50 border-l-4 border-emerald-600'} rounded-lg p-4`}>
              <p className={`text-2xl font-bold ${isFreePreview ? 'text-blue-900' : 'text-emerald-900'}`}>{researchRunData.leads_saved} von {isFreePreview ? '3 verfügbaren Vorschaukontakten' : `${researchRunData.requested_target} angeforderten`} gespeichert</p>
              {isFreePreview && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-blue-800 font-medium">Für vollständige Recherchen aktivieren Sie den verifizierten Testzugang.</p>
                  <a href="/settings?tab=billing" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 underline hover:text-blue-900">
                    Testzugang aktivieren →
                  </a>
                </div>
              )}
            </div>

            {/* Breakdown – nur für paid/trial, NICHT für Free Preview als Hauptbotschaft */}
            {!isFreePreview && <div className="grid sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-2xl font-bold text-slate-900">{researchRunData.raw_hits || researchRunData.requested_target}</p>
                <p className="text-xs text-slate-600 font-medium mt-1">Geprüfte Firmenprofile</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-2xl font-bold text-slate-900">{researchRunData.duplicates_skipped || 0}</p>
                <p className="text-xs text-slate-600 font-medium mt-1">Bestehende Firmen übersprungen</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-2xl font-bold text-slate-900">{researchRunData.no_match_count || 0}</p>
                <p className="text-xs text-slate-600 font-medium mt-1">Unpassende Treffer ausgeschlossen</p>
              </div>
            </div>}

            {/* Suchgebiet */}
            {(researchRunData.search_center_city || researchRunData.target_customer_types) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-2">Suchgebiet & Zielgruppe</p>
                <div className="space-y-1.5 text-sm text-blue-900">
                  {researchRunData.search_center_city && (
                    <div className="flex justify-between">
                      <span className="font-medium">Gebiet:</span>
                      <span>{researchRunData.search_radius_km || 25} km um {researchRunData.search_center_city}</span>
                    </div>
                  )}
                  {researchRunData.target_customer_types && (
                    <div className="flex justify-between">
                      <span className="font-medium">Zielkunden:</span>
                      <span className="text-right max-w-[50%]">{researchRunData.target_customer_types}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Top Leads */}
          {!loading && topLeads.length > 0 && (
            <div className="px-6 py-6 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                Ihre besten neuen Kontakte
              </h3>
              <div className="space-y-3">
                {topLeads.slice(0, 3).map((lead, idx) => (
                  <div key={lead.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:bg-slate-100 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 font-bold text-blue-700 text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900">{lead.name}</p>
                        {lead.matched_target_customer_type && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            <span className="font-medium">Grund:</span> {lead.matched_target_customer_type}
                          </p>
                        )}
                        {lead.distance_km !== null && (
                          <p className="text-xs text-slate-600">
                            📍 {lead.distance_km.toFixed(1)} km
                          </p>
                        )}
                        {/* Contact Options */}
                        <div className="flex gap-1.5 mt-2">
                          {lead.telefon && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                              <Phone className="w-3 h-3" />
                              Telefon
                            </span>
                          )}
                          {lead.email && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                              <Mail className="w-3 h-3" />
                              E-Mail
                            </span>
                          )}
                        </div>
                      </div>
                      <Link to={`/leads/${lead.id}`} className="shrink-0 mt-1">
                        <ArrowRight className="w-4 h-4 text-slate-400 hover:text-blue-600 transition-colors" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex flex-col sm:flex-row gap-2 justify-between">
            <Button variant="outline" onClick={onClose} className="text-sm">
              Schließen
            </Button>
            {topLeads.length > 0 && (
              <Link to={`/leads?new_run=${researchRunData.id}`} className="flex-1">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-sm gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Alle {researchRunData.leads_saved} neuen Leads anzeigen
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Case: Nur Dubletten ──
  if (runType === "duplicate_only" && researchRunData.duplicates_skipped > 0) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-blue-900">Keine neuen Kontakte</h2>
                <p className="text-sm text-blue-800 mt-0.5 font-medium">
                  Vertriebo hat passende Firmen gefunden, diese waren aber bereits in Ihrer Liste.
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 space-y-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-900 font-medium">
                {researchRunData.duplicates_skipped} bereits gespeicherte Firmen gefunden
              </p>
              <p className="text-xs text-blue-700 mt-1">Kein Recherche-Credit verbraucht</p>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 text-sm">
              Schließen
            </Button>
            <Button onClick={() => onViewAllLeads?.()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm gap-2">
              <Search className="w-4 h-4" />
              Neue Recherche
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Case: Keine passenden Treffer ──
  if (runType === "no_match" || runType === "zero_result") {
    const isZero = runType === "zero_result";
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-amber-900">
                  {isZero ? "Keine Treffer im Suchgebiet" : "Keine passenden Firmenkontakte gefunden"}
                </h2>
                <p className="text-sm text-amber-800 mt-0.5 font-medium">
                  {isZero
                    ? "Vertriebo hat im Suchgebiet keine Treffer gefunden."
                    : "Die gefundenen Firmen passen nicht zu Ihrer Zielgruppe."}
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 space-y-3">
            <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-900">
              <p className="font-semibold mb-2">Bitte prüfen Sie:</p>
              <ul className="text-xs space-y-1 text-amber-800">
                <li>✓ Suchgebiet und Radius</li>
                <li>✓ Zielkunden-Definition</li>
                <li>✓ Ausschlüsse (zu streng?)</li>
                <li>✓ Zusätzliche Zielorte hinzufügen</li>
              </ul>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 text-sm">
              Schließen
            </Button>
            <Button onClick={() => onViewAllLeads?.()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm">
              Einstellungen prüfen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}