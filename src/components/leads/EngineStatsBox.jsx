/**
 * EngineStatsBox – Vertriebo Engine Leads-Übersicht (OPTIMIERT für Performance)
 * 
 * ⚠️  KRITISCH: Dieser Komponente arbeitet NUR mit persistierten Engine-Feldern!
 * 
 * - Keine lokale analyzeLeadTemperature-Berechnung für alle Leads
 * - Lead als "Unanalysiert" markiert wenn lead_temperature === "unknown" oder null
 * - Top 3 nur aus den bereits analysierten Leads
 * - useMemo für Analyses um Re-Renders zu vermeiden
 * - Fallback zu priority_score nur für Unanalysiert-Zählung
 * 
 * Button "Neueste Leads analysieren" ruft Backend auf:
 * - Backend analysiert max. 10-25 neueste Leads
 * - Speichert persistierte Ergebnisse
 * - Frontend refetcht danach
 */

import { useMemo } from "react";
import { Zap } from "lucide-react";

// Safe temperature getter
function getSafeTemperature(temp) {
  if (!temp || temp === "unknown" || typeof temp !== 'string') return null;
  const normalized = temp.charAt(0).toUpperCase() + temp.slice(1).toLowerCase();
  return ["Hot", "Warm", "Cold"].includes(normalized) ? normalized : null;
}

function EngineStatsBox({ companies, onAnalyzeLatest, analyzingLatest = false, lastEngineResult = null }) {
  // Analyses: NUR persistierte Felder nutzen, KEINE lokale Berechnung für alle Leads
  const analyses = useMemo(() => {
    if (!companies || companies.length === 0) return [];
    
    return companies.map(company => {
      const temp = getSafeTemperature(company?.lead_temperature);
      const isAnalyzed = !!temp; // Hat persistierte Analyse
      
      if (isAnalyzed) {
        return {
          temperature: temp,
          score: Number(company?.lead_temperature_score || 0),
          reason: company?.lead_temperature_reason || "Engine-Analyse vorhanden",
          isAnalyzed: true,
        };
      }
      
      // Nicht analysiert: minimaler Fallback zu priority_score
      return {
        temperature: "Unanalysiert",
        score: Number(company?.priority_score || 0),
        reason: "Noch nicht durch die Vertriebo Engine analysiert.",
        isAnalyzed: false,
      };
    });
  }, [companies]);

  const hot = useMemo(() => analyses.filter(a => a.temperature === "Hot").length, [analyses]);
  const warm = useMemo(() => analyses.filter(a => a.temperature === "Warm").length, [analyses]);
  const cold = useMemo(() => analyses.filter(a => a.temperature === "Cold").length, [analyses]);
  const unanalyzed = useMemo(() => analyses.filter(a => !a.isAnalyzed).length, [analyses]);

  // Top 3 NUR aus analysierten Leads
  const topLeads = useMemo(() => {
    const analyzed = companies
      .map((company, i) => ({ ...company, analysis: analyses[i] }))
      .filter(c => c.analysis.isAnalyzed)
      .sort((a, b) => b.analysis.score - a.analysis.score)
      .slice(0, 3);
    
    return analyzed;
  }, [companies, analyses]);

  if (!companies || companies.length === 0) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Vertriebo Engine Übersicht</h3>
        </div>
        <p className="text-sm text-slate-600">Keine Leads vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Vertriebo Engine Übersicht</h3>
        </div>
        <p className="text-xs text-slate-600 mb-3">KI-Analyse Ihrer {companies.length} Leads</p>

        {/* Temperatur-Stats */}
        <div className="grid grid-cols-4 gap-2">
          {/* Hot */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-2.5 text-center">
            <p className="text-xl font-black text-red-600">{hot}</p>
            <p className="text-[9px] font-bold uppercase text-red-700 mt-0.5">Hot</p>
            <p className="text-[8px] text-red-600 mt-0.5">🔥</p>
          </div>

          {/* Warm */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-2.5 text-center">
            <p className="text-xl font-black text-amber-600">{warm}</p>
            <p className="text-[9px] font-bold uppercase text-amber-700 mt-0.5">Warm</p>
            <p className="text-[8px] text-amber-600 mt-0.5">⏱️</p>
          </div>

          {/* Cold */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 rounded-lg p-2.5 text-center">
            <p className="text-xl font-black text-slate-600">{cold}</p>
            <p className="text-[9px] font-bold uppercase text-slate-700 mt-0.5">Cold</p>
            <p className="text-[8px] text-slate-600 mt-0.5">❄️</p>
          </div>

          {/* Unanalysiert */}
          <div className="bg-gradient-to-br from-gray-100 to-gray-50 border-2 border-gray-300 rounded-lg p-2.5 text-center">
            <p className="text-xl font-black text-gray-600">{unanalyzed}</p>
            <p className="text-[9px] font-bold uppercase text-gray-700 mt-0.5">Offen</p>
            <p className="text-[8px] text-gray-600 mt-0.5">⏳</p>
          </div>
        </div>
      </div>

      {/* Top Leads oder "Noch keine Analysen" */}
      <div className="border-t border-[#E2E8F0]">
        {topLeads.length > 0 ? (
          <>
            <div className="px-5 py-3 bg-slate-50 border-b border-[#E2E8F0]">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Top 3 analysierte Leads</p>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
             {topLeads.map((company) => {
                const tempColor = company.analysis?.temperature === "Hot" ? "#fca5a5" : "#fcd34d";
                const tempBg = company.analysis?.temperature === "Hot" ? "#fef2f2" : "#fffbeb";
                const tempText = company.analysis?.temperature === "Hot" ? "#991b1b" : "#92400e";
                const reason = company.analysis?.reason || "Engine-Analyse vorhanden";

                return (
                  <div key={company.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{company.name}</p>
                        <p className="text-xs text-slate-600 truncate">{company.branche}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold"
                          style={{
                            borderColor: tempColor,
                            backgroundColor: tempBg,
                            color: tempText
                          }}>
                          {company.analysis?.temperature}
                        </div>
                        <p className="text-xs font-bold text-slate-900 mt-1">{company.analysis?.score}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 leading-snug">
                      {reason.length > 60 ? `${reason.substring(0, 60)}...` : reason}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-slate-600 font-medium mb-3">Noch keine Engine-Analysen vorhanden</p>
            <p className="text-xs text-slate-500">Klicken Sie auf „Neueste Leads analysieren", um die Vertriebo Engine zu starten.</p>
          </div>
        )}
      </div>
      
      {onAnalyzeLatest && (
        <div className="border-t border-[#E2E8F0] px-5 py-3 space-y-2">
          <button
            onClick={onAnalyzeLatest}
            disabled={analyzingLatest}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {analyzingLatest ? "Vertriebo Engine analysiert…" : "Neueste Leads analysieren"}
          </button>
          {lastEngineResult && (
            <p className="text-[10px] text-slate-600 font-medium">
              Zuletzt analysiert: {lastEngineResult.analyzed} Leads · gerade eben
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default EngineStatsBox;