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
import { Zap, AlertCircle, CheckCircle2, Clock, RefreshCw, Target, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// Normalize temperature to consistent format
function normalizeTemperature(value) {
  const raw = String(value || 'open').toLowerCase();
  if (raw.includes('hot')) return 'Hot';
  if (raw.includes('warm')) return 'Warm';
  if (raw.includes('cold') || raw.includes('kalt')) return 'Cold';
  return 'Open';
}

// Extract signals from various possible shapes
function extractSignals(engineAnalysisJson) {
  const signals = engineAnalysisJson?.signals || engineAnalysisJson?.signal_groups || {};
  return {
    fit: signals.fit || signals.fit_signals || engineAnalysisJson?.fit_signals || [],
    contactability: signals.contactability || signals.contactability_signals || engineAnalysisJson?.contactability_signals || [],
    engagement: signals.engagement || signals.engagement_signals || engineAnalysisJson?.engagement_signals || [],
    timing: signals.timing || signals.timing_signals || engineAnalysisJson?.timing_signals || [],
    risk: signals.risk || signals.risk_signals || engineAnalysisJson?.risk_signals || [],
    missing_data: signals.missing_data || signals.missingData || engineAnalysisJson?.missing_data || []
  };
}

// Human-readable signal labels
const SIGNAL_LABELS = {
  phone_available: "Telefonnummer vorhanden",
  email_available: "E-Mail-Adresse vorhanden",
  website_available: "Website vorhanden",
  contact_person_available: "Ansprechpartner vorhanden",
  contact_log_exists: "Kontaktversuch dokumentiert",
  industry_match: "Passt zum Zielkundenprofil",
  recent_contact: "Kürzlich kontaktiert",
  new_lead: "Neuer Lead",
  task_due_today: "Aufgabe heute fällig",
  task_overdue: "Aufgabe überfällig",
  offer_requested: "Angebot angefordert",
  offer_sent: "Angebot versendet",
  appointment_scheduled: "Termin vereinbart",
  callback_scheduled: "Rückruf vereinbart",
};

const RISK_LABELS = {
  lost_status: "Status: Verloren",
  no_contact_data: "Keine Kontaktdaten vorhanden",
  unknown_decision_maker: "Entscheider noch nicht bekannt",
  no_response: "Bisher keine positive Reaktion",
  poor_fit: "Zielgruppenpassung unklar",
  poor_data_quality: "Datenqualität unvollständig",
  long_time_no_contact: "Lange kein Kontakt",
};

function labelSignal(raw) {
  return SIGNAL_LABELS[raw] || raw;
}

function labelRisk(raw) {
  return RISK_LABELS[raw] || raw;
}

// Clean placeholder text from AI-generated content
function cleanPlaceholderText(text) {
  if (!text) return '';
  return text
    .replace(/\[Ihr Name\]/g, 'ich')
    .replace(/\[Ihr Unternehmen\]/g, 'unserem Unternehmen')
    .replace(/\[Dein Name\]/g, 'ich')
    .replace(/\[Dein Unternehmen\]/g, 'unserem Unternehmen')
    .replace(/\[Thema\]/g, 'Ihrem aktuellen Bedarf')
    .replace(/\[Service\]/g, 'externe Dienstleistungen')
    .replace(/\[your_name\]/gi, 'ich')
    .replace(/\[your_company\]/gi, 'unserem Unternehmen')
    .replace(/\$\{.*?\}/g, '[...]');
}

const DUE_LABELS = {
  today: "Heute",
  tomorrow: "Morgen",
  this_week: "Diese Woche",
  next_week: "Nächste Woche",
};

export default function EngineBox({ company, contactLogs = [], tasks = [], orgId, onAddTask, onReanalyze }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Parse persisted engine_analysis_json or fallback to legacy fields
  const engineAnalysisJson = safeParseJSON(company?.engine_analysis_json);
  
  const hasPersisted = !!engineAnalysisJson || (company?.lead_temperature && company.lead_temperature !== "unknown");
  
  // Extract from new engine bundle (priority) or legacy fields (fallback)
  const extractedSignals = engineAnalysisJson ? extractSignals(engineAnalysisJson) : {};
  
  const analysis = engineAnalysisJson ? {
    temperature: normalizeTemperature(engineAnalysisJson.temperature),
    score: engineAnalysisJson.vertriebo_score || 0,
    confidence: engineAnalysisJson.confidence_score || 0,
    summary: cleanPlaceholderText(engineAnalysisJson.summary || ""),
    reason: cleanPlaceholderText(engineAnalysisJson.reason || ""),
    nextBestAction: engineAnalysisJson.next_best_action || {},
    outreachAngle: cleanPlaceholderText(engineAnalysisJson.outreach_angle || ""),
    suggestedOpening: cleanPlaceholderText(engineAnalysisJson.suggested_opening || ""),
    qualificationQuestions: (engineAnalysisJson.qualification_questions || []).map(q => cleanPlaceholderText(q)),
    objectionsToExpect: engineAnalysisJson.objections_to_expect || [],
    topSignals: [
      ...extractedSignals.fit,
      ...extractedSignals.contactability,
      ...extractedSignals.engagement,
      ...extractedSignals.timing
    ].filter(s => s.present !== false).slice(0, 5),
    riskSignals: extractedSignals.risk || [],
    missingData: extractedSignals.missing_data || []
  } : {
    temperature: normalizeTemperature(company?.lead_temperature),
    score: company?.lead_temperature_score || 0,
    confidence: 0,
    summary: "",
    reason: cleanPlaceholderText(company?.lead_temperature_reason || ""),
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
      onAddTask(analysis.nextBestAction);
      toast.success("Aufgabe vorbereitet");
    }
  };

  const handleReanalyze = async () => {
    setAnalyzing(true);
    try {
      await base44.functions.invoke("analyzeLeadEngine", {
        mode: "single",
        company_id: company.id,
        organization_id: orgId
      });
      // Reload company from backend so engine_analysis_json is fresh
      if (onReanalyze) await onReanalyze();
      toast.success("Lead neu analysiert");
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

        {/* Nächster bester Schritt – kompakt */}
        {analysis.nextBestAction && Object.keys(analysis.nextBestAction).length > 0 && (
          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">Nächster Schritt</p>
            <p className="text-sm font-semibold text-slate-900">{analysis.nextBestAction.title}</p>
            {analysis.nextBestAction.reason && <p className="text-xs text-slate-700 mt-1">{analysis.nextBestAction.reason}</p>}
            {analysis.nextBestAction.due && <p className="text-[10px] text-slate-600 mt-1 font-semibold">Fällig: {DUE_LABELS[analysis.nextBestAction.due] || analysis.nextBestAction.due}</p>}
          </div>
        )}
      </div>

      {/* ═══ SIGNALE/RISIKEN/FEHLENDE DATEN ALS CHIPS ═══ */}
      {(analysis.topSignals.length > 0 || analysis.riskSignals.length > 0 || analysis.missingData.length > 0) && (
        <div className="space-y-2">
          {/* Top-Signale als Chips */}
          {analysis.topSignals.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-2">Signale</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.topSignals.map((signal, i) => (
                  <Badge key={i} variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">
                    ✓ {labelSignal(signal.signal)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Risiken als Chips */}
          {analysis.riskSignals.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-red-700 mb-2">Risiken</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.riskSignals.map((risk, i) => (
                  <Badge key={i} variant="secondary" className="bg-red-50 text-red-700 border-red-200 font-normal">
                    ⚠ {labelRisk(risk.signal)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Fehlende Daten als Chips */}
          {analysis.missingData.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-2">Fehlt</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missingData.map((item, i) => {
                  const MISSING_LABELS = {
                    contact_person: "Ansprechpartner",
                    email: "E-Mail-Adresse",
                    phone: "Telefonnummer",
                    website: "Website",
                    target_customer_confirmation: "Zielgruppen-Match",
                    concrete_need: "konkreter Bedarf"
                  };
                  const raw = item.field || item;
                  const label = MISSING_LABELS[raw] || raw;
                  return (
                    <Badge key={i} variant="outline" className="font-normal">
                      {label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
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
        {(analysis.outreachAngle || analysis.suggestedOpening || analysis.qualificationQuestions.length > 0 || analysis.objectionsToExpect.length > 0) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="flex-1 gap-1.5 bg-white border-[#E2E8F0] text-slate-700 hover:bg-slate-50"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} /> Leitfaden
          </Button>
        )}
        <Button 
          variant="default" 
          size="sm" 
          onClick={handleReanalyze}
          disabled={analyzing}
          className="flex-1 gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} /> {analyzing ? "Läuft..." : "Neu analysieren"}
        </Button>
      </div>

      {/* ═══ DETAILS/LEITFADEN (ACCORDION) ═══ */}
      {showDetails && (
        <div className="border-t border-[#E2E8F0] pt-3 mt-3 space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {/* Warum diese Bewertung */}
          {analysis.reason && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">Warum diese Bewertung?</p>
              <p className="text-xs text-slate-900 leading-relaxed">{analysis.reason}</p>
            </div>
          )}

          {/* Gesprächsansatz */}
          {analysis.outreachAngle && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">Gesprächsansatz</p>
              <p className="text-xs text-slate-900 leading-relaxed italic">{analysis.outreachAngle}</p>
            </div>
          )}

          {/* Eröffnungssatz */}
          {analysis.suggestedOpening && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">Eröffnungssatz</p>
              <p className="text-xs text-slate-900 leading-relaxed font-medium border-l-2 border-slate-400 pl-2">
                "{analysis.suggestedOpening}"
              </p>
            </div>
          )}

          {/* Qualifizierungsfragen */}
          {analysis.qualificationQuestions.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">Fragen</p>
              <ul className="space-y-1">
                {analysis.qualificationQuestions.map((q, i) => (
                  <li key={i} className="text-[11px] text-slate-900 font-medium flex gap-1.5">
                    <span className="text-slate-400 flex-shrink-0">•</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Einwände */}
          {analysis.objectionsToExpect.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">Einwände</p>
              <ul className="space-y-1">
                {analysis.objectionsToExpect.map((obj, i) => (
                  <li key={i} className="text-[11px] text-slate-900 flex gap-1.5">
                    <span className="text-slate-400 flex-shrink-0">◦</span>
                    <span>"{obj}"</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ═══ METADATA ═══ */}
      {hasPersisted && (
        <div className="text-[10px] text-slate-500 text-center p-3 bg-slate-50 rounded-lg">
          Zuletzt analysiert: {company?.engine_last_analyzed_at ? new Date(company.engine_last_analyzed_at).toLocaleString('de-DE') : "—"}
        </div>
      )}
    </div>
  );
}