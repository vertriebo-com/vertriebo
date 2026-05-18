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
import { Zap, Flame } from "lucide-react";

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
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E2E8F0] bg-gradient-to-r from-purple-50/50 to-blue-50/50">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Vertriebo Engine Status</h3>
            <p className="text-xs text-slate-600">{companies.length} Leads geladen · {hot + warm} priorisiert</p>
          </div>
        </div>

        {/* Temperatur-Stats - Modernized */}
        <div className="grid grid-cols-4 gap-2">
          {/* Hot */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{hot}</p>
            <p className="text-[10px] font-bold text-red-700 mt-0.5">Heiß</p>
          </div>

          {/* Warm */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{warm}</p>
            <p className="text-[10px] font-bold text-amber-700 mt-0.5">Warm</p>
          </div>

          {/* Cold */}
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-slate-600">{cold}</p>
            <p className="text-[10px] font-bold text-slate-700 mt-0.5">Kalt</p>
          </div>

          {/* Unanalysiert */}
          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-500">{unanalyzed}</p>
            <p className="text-[10px] font-bold text-gray-600 mt-0.5">Offen</p>
          </div>
        </div>
      </div>

      {/* Top Leads */}
      <div className="border-t border-[#E2E8F0]">
        {topLeads.length > 0 ? (
          <div className="px-5 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-orange-500" />
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Top {topLeads.length} Leads</p>
            </div>
            <div className="space-y-2">
              {topLeads.map((company, idx) => {
                const isHot = company.analysis?.temperature === "Hot";
                return (
                  <div key={company.id} className="flex items-center justify-between p-3 rounded-xl border bg-white hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${isHot ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{company.name}</p>
                        <p className="text-xs text-slate-600 truncate">{company.branche}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${isHot ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {company.analysis?.temperature}
                      </div>
                      <p className="text-sm font-bold text-slate-900 w-8 text-right">{company.analysis?.score}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Zap className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Noch keine analysierten Leads</p>
            <p className="text-xs text-slate-500">Starten Sie die Analyse um priorisierte Empfehlungen zu erhalten</p>
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