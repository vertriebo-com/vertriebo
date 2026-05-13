/**
 * EngineStatsBox – Vertriebo Engine Leads-Seite MVP Preview
 * 
 * STATUS: Frontend Preview nur – nicht final
 * 
 * Diese Komponente zeigt:
 * - Hot/Warm/Cold Verteilung über alle gefilterten Leads
 * - Top 3 Leads nach Engine-Score
 * 
 * ⚠️  WICHTIG:
 * - analyzeLeadTemperature wird lokal für ALLE Leads berechnet
 * - Nur auf gefilterte Companies (mit organization_id) angewendet
 * - KEINE KI auf Render
 * - Nur deterministische lokale Berechnung
 * 
 * Backend-Persistenz geplant:
 * - Lead-Ergebnisse werden auf Company gespeichert (analyzeLeadEngine)
 * - EngineStatsBox wird dann auf persistierte Felder auslesen
 */

import { Zap, Flame, Thermometer } from "lucide-react";
import { analyzeLeadTemperature } from "@/utils/analyzeLeadTemperature";

export default function EngineStatsBox({ companies, contactLogsMap = {}, tasksMap = {} }) {
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

  // Analysiere alle Leads
  const analyses = companies.map(company => {
    const logs = contactLogsMap[company.id] || [];
    const tasks = tasksMap[company.id] || [];
    return analyzeLeadTemperature(company, logs, tasks);
  });

  const hot = analyses.filter(a => a.temperature === "Hot").length;
  const warm = analyses.filter(a => a.temperature === "Warm").length;
  const cold = analyses.filter(a => a.temperature === "Cold").length;

  // Top 3 nach Score
  const topLeads = companies
    .map((company, i) => ({ ...company, analysis: analyses[i] }))
    .sort((a, b) => b.analysis.score - a.analysis.score)
    .slice(0, 3);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Vertriebo Engine Übersicht</h3>
        </div>
        <p className="text-xs text-slate-600 mb-3">KI-Analyse Ihrer {companies.length} Leads</p>

        {/* Temperatur-Stats */}
        <div className="grid grid-cols-3 gap-3">
          {/* Hot */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-black text-red-600">{hot}</p>
            <p className="text-[10px] font-bold uppercase text-red-700 mt-1">Hot</p>
            <p className="text-[9px] text-red-600 mt-0.5">{hot > 0 ? "Priorität 🔥" : "Keine"}</p>
          </div>

          {/* Warm */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-black text-amber-600">{warm}</p>
            <p className="text-[10px] font-bold uppercase text-amber-700 mt-1">Warm</p>
            <p className="text-[9px] text-amber-600 mt-0.5">{warm > 0 ? "Folge-up" : "Keine"}</p>
          </div>

          {/* Cold */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 rounded-lg p-3 text-center">
            <p className="text-2xl font-black text-slate-600">{cold}</p>
            <p className="text-[10px] font-bold uppercase text-slate-700 mt-1">Cold</p>
            <p className="text-[9px] text-slate-600 mt-0.5">{cold > 0 ? "Aktivieren" : "Keine"}</p>
          </div>
        </div>
      </div>

      {/* Top Leads */}
      {topLeads.length > 0 && (
        <div className="border-t border-[#E2E8F0]">
          <div className="px-5 py-3 bg-slate-50 border-b border-[#E2E8F0]">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Top 3 nach Score</p>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {topLeads.map((company) => (
              <div key={company.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{company.name}</p>
                    <p className="text-xs text-slate-600 truncate">{company.branche}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold"
                      style={{
                        borderColor: company.analysis.temperature === "Hot" ? "#fca5a5" :
                                    company.analysis.temperature === "Warm" ? "#fcd34d" : "#d1d5db",
                        backgroundColor: company.analysis.temperature === "Hot" ? "#fef2f2" :
                                        company.analysis.temperature === "Warm" ? "#fffbeb" : "#f9fafb",
                        color: company.analysis.temperature === "Hot" ? "#991b1b" :
                              company.analysis.temperature === "Warm" ? "#92400e" : "#374151"
                      }}>
                      {company.analysis.temperature}
                    </div>
                    <p className="text-xs font-bold text-slate-900 mt-1">{company.analysis.score}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-snug">{company.analysis.reason.substring(0, 60)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}