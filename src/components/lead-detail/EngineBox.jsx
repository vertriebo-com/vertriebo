/**
 * EngineBox – Vertriebo Engine Phase 1 UI
 * 
 * Zeigt persistierte engine_analysis_json Daten von analyzeLeadEngine Backend.
 * Kein Render-based Analysis, keine Performance-Probleme.
 * 
 * Displays:
 * - Vertriebo Score + Temperatur
 * - Kurzfazit (summary)
 * - Warum-Begründung (reason)
 * - Top-Signale (fit, contactability, engagement, timing)
 * - Risiken & Fehlende Daten
 * - Nächster bester Schritt (actionable)
 * - Gesprächsansatz (outreach_angle)
 * - Eröffnungssatz (suggested_opening)
 * - Qualifizierungsfragen
 * - Einwände (objections)
 */

import { useState } from "react";
import { Zap, AlertCircle, CheckCircle2, Clock, RefreshCw, Target, MessageCircle, HelpCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// Safe parse helpers
function safeParseJSON(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function safeParseArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function EngineBox({ company, contactLogs = [], tasks = [], orgId, onAddTask, onReanalyze }) {
  const [analyzing, setAnalyzing] = useState(false);
  
  // Parse persisted engine_analysis_json or fallback to legacy fields
  const engineAnalysisJson = safeParseJSON(company?.engine_analysis_json);
  
  const hasPersisted = !!engineAnalysisJson || (company?.lead_temperature && company.lead_temperature !== "unknown");
  
  // Extract from new engine bundle (priority) or legacy fields (fallback)
  const analysis = engineAnalysisJson ? {
    temperature: engineAnalysisJson.temperature?.charAt(0).toUpperCase() + engineAnalysisJson.temperature?.slice(1) || "Open",
    score: engineAnalysisJson.vertriebo_score || 0,
    confidence: engineAnalysisJson.confidence_score || 0,
    summary: engineAnalysisJson.summary || "",
    reason: engineAnalysisJson.reason || "",
    nextBestAction: engineAnalysisJson.next_best_action || {},
    outreachAngle: engineAnalysisJson.outreach_angle || "",
    suggestedOpening: engineAnalysisJson.suggested_opening || "",
    qualificationQuestions: engineAnalysisJson.qualification_questions || [],
    objectionsToExpect: engineAnalysisJson.objections_to_expect || [],
    topSignals: [
      ...(engineAnalysisJson.signals?.fit || []),
      ...(engineAnalysisJson.signals?.contactability || []),
      ...(engineAnalysisJson.signals?.engagement || []),
      ...(engineAnalysisJson.signals?.timing || [])
    ].filter(s => s.present).slice(0, 5),
    riskSignals: engineAnalysisJson.signals?.risk || [],
    missingData: engineAnalysisJson.signals?.missing_data || []
  } : {
    temperature: (company?.lead_temperature || "open").charAt(0).toUpperCase() + (company?.lead_temperature || "open").slice(1),
    score: company?.lead_temperature_score || 0,
    confidence: 0,
    summary: "",
    reason: company?.lead_temperature_reason || "",
    nextBestAction: {},
    outreachAngle: "",
    suggestedOpening: "",
    qualificationQuestions: [],
    objectionsToExpect: [],
    topSignals: [],
    riskSignals: safeParseArray(company?.risk_signals),
    missingData: safeParseArray(company?.missing_data)
  };
  
  const tempColor = {
    Hot: "from-red-500 to-orange-500",
    Warm: "from-amber-500 to-orange-400",
    Cold: "from-slate-500 to-slate-400",
    Open: "from-slate-400 to-slate-300",
  }[analysis.temperature] || "from-slate-400 to-slate-300";

  const tempBg = {
    Hot: "bg-red-50 border-red-200",
    Warm: "bg-amber-50 border-amber-200",
    Cold: "bg-slate-50 border-slate-200",
    Open: "bg-slate-50 border-slate-200",
  }[analysis.temperature] || "bg-slate-50 border-slate-200";

  const tempText = {
    Hot: "text-red-900",
    Warm: "text-amber-900",
    Cold: "text-slate-900",
    Open: "text-slate-700",
  }[analysis.temperature] || "text-slate-700";

  const handleAddTask = () => {
    if (onAddTask) {
      onAddTask();
      toast.success("Neue Aufgabe erstellen");
    }
  };

  const handleReanalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await base44.functions.invoke("analyzeLeadEngine", {
        mode: "single",
        company_id: company.id,
        organization_id: orgId
      });
      toast.success("Lead neu analysiert");
      if (onReanalyze) onReanalyze(result);
    } catch (error) {
      toast.error("Analyse fehlgeschlagen: " + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ═══ HEADER ═══ */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Vertriebo Engine</h3>
          </div>
          <span className="text-[10px] font-semibold text-slate-500">Phase 1</span>
        </div>

        {/* Score + Temperatur (Prominent) */}
        <div className={`rounded-lg border-2 p-4 ${tempBg}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">Score</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black ${tempText}`}>{analysis.score}</span>
                <span className={`text-sm font-bold ${tempText}`}>{analysis.temperature}</span>
              </div>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p>Sicherheit</p>
              <p className="text-lg font-bold text-slate-800">{Math.round(analysis.confidence)}%</p>
            </div>
          </div>
        </div>

        {/* Kurzfazit */}
        {analysis.summary && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 leading-relaxed">{analysis.summary}</p>
          </div>
        )}
      </div>

      {/* ═══ WARUM? ═══ */}
      {analysis.reason && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-3">Warum diese Bewertung?</p>
          <p className="text-sm text-slate-900 leading-relaxed">{analysis.reason}</p>
        </div>
      )}

      {/* ═══ TOP-SIGNALE ═══ */}
      {analysis.topSignals.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-3 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Top-Signale
          </p>
          <div className="space-y-2">
            {analysis.topSignals.map((signal, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-emerald-600 font-bold">✓</span>
                <div>
                  <p className="font-semibold text-slate-900">{signal.signal}</p>
                  {signal.reason && <p className="text-slate-600 text-[11px]">{signal.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ RISIKEN ═══ */}
      {analysis.riskSignals.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700 mb-3 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> Risiken
          </p>
          <div className="space-y-2">
            {analysis.riskSignals.map((risk, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-red-600 font-bold">⚠</span>
                <div>
                  <p className="font-semibold text-slate-900">{risk.signal}</p>
                  {risk.reason && <p className="text-slate-600 text-[11px]">{risk.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ FEHLENDE DATEN ═══ */}
      {analysis.missingData.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-3 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> Fehlende Daten
          </p>
          <div className="space-y-1">
            {analysis.missingData.map((item, i) => (
              <p key={i} className="text-xs text-slate-700 font-medium">• {item.field || item}</p>
            ))}
          </div>
        </div>
      )}

      {/* ═══ NÄCHSTER BESTER SCHRITT ═══ */}
      {analysis.nextBestAction && Object.keys(analysis.nextBestAction).length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm border-l-4 border-l-primary">
          <p className="text-xs font-bold uppercase tracking-wide text-primary mb-2 flex items-center gap-1">
            <Target className="w-4 h-4" /> Nächster bester Schritt
          </p>
          <p className="text-sm font-semibold text-slate-900 mb-2">{analysis.nextBestAction.title || analysis.nextBestAction.type}</p>
          {analysis.nextBestAction.reason && <p className="text-xs text-slate-700 mb-2">{analysis.nextBestAction.reason}</p>}
          {analysis.nextBestAction.due && <p className="text-xs font-semibold text-primary">Fällig: {analysis.nextBestAction.due}</p>}
        </div>
      )}

      {/* ═══ GESPRÄCHSANSATZ ═══ */}
      {analysis.outreachAngle && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-3 flex items-center gap-1">
            <MessageCircle className="w-4 h-4" /> Gesprächsansatz
          </p>
          <p className="text-sm text-slate-900 leading-relaxed italic">{analysis.outreachAngle}</p>
        </div>
      )}

      {/* ═══ ERÖFFNUNGSSATZ ═══ */}
      {analysis.suggestedOpening && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-2">Eröffnungssatz</p>
          <p className="text-sm text-slate-900 leading-relaxed font-medium border-l-4 border-l-slate-400 pl-3">
            "{analysis.suggestedOpening}"
          </p>
        </div>
      )}

      {/* ═══ QUALIFIZIERUNGSFRAGEN ═══ */}
      {analysis.qualificationQuestions.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-3 flex items-center gap-1">
            <HelpCircle className="w-4 h-4" /> Qualifizierungsfragen
          </p>
          <ul className="space-y-2">
            {analysis.qualificationQuestions.map((q, i) => (
              <li key={i} className="text-xs text-slate-900 font-medium flex gap-2">
                <span className="text-slate-400 flex-shrink-0">•</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ═══ EINWÄNDE ═══ */}
      {analysis.objectionsToExpect.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-3 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> Einwände (zu erwarten)
          </p>
          <ul className="space-y-2">
            {analysis.objectionsToExpect.map((obj, i) => (
              <li key={i} className="text-xs text-slate-900 flex gap-2">
                <span className="text-slate-400 flex-shrink-0">◦</span>
                <span className="font-medium">"{obj}"</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ═══ ACTIONS ═══ */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleAddTask}
          className="flex-1 gap-1.5 bg-white border-[#E2E8F0] text-slate-700 hover:bg-slate-50"
        >
          <Clock className="w-4 h-4" /> Aufgabe erstellen
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={handleReanalyze}
          disabled={analyzing}
          className="flex-1 gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} /> {analyzing ? "Analysiere..." : "Neu analysieren"}
        </Button>
      </div>

      {/* ═══ METADATA ═══ */}
      {hasPersisted && (
        <div className="text-[10px] text-slate-500 text-center p-3 bg-slate-50 rounded-lg">
          Zuletzt analysiert: {company?.engine_last_analyzed_at ? new Date(company.engine_last_analyzed_at).toLocaleString('de-DE') : "—"}
        </div>
      )}
    </div>
  );
}