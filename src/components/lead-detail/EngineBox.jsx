/**
 * EngineBox – Vertriebo Engine Frontend MVP Preview
 * 
 * STATUS: Frontend Preview nur – nicht final
 * 
 * Diese Komponente zeigt das UI für die Vertriebo Engine mit:
 * - Hot/Warm/Cold Temperatur-Klassifizierung (Score 0-100)
 * - Kaufsignale, Risiken, fehlende Daten
 * - Nächster Schritt-Empfehlung
 * 
 * ⚠️  WICHTIG:
 * - analyzeLeadTemperature ist derzeit eine reine Frontend-Utils-Funktion
 * - Diese Funktion berechnet lokal + deterministisch (kein Backend-Call)
 * - KEINE KI wird auf jedem Render aufgerufen
 * - Ergebnisse werden NICHT auf Company persistiert
 * 
 * Backend-Persistenz geplant:
 * - Backend-Funktion analyzeLeadEngine wird entwickelt
 * - Company-Entity wird erweitert um: lead_temperature, lead_temperature_score,
 *   lead_temperature_reason, next_best_action, buying_signals, risk_signals,
 *   missing_data, last_ai_analyzed_at, engine_version
 * - Analyse nur bei: manueller Button-Click oder nach ContactLog-Create
 * 
 * Existierende KI-Logik (getKiRecommendation):
 * - Wird in analyzeLeadEngine integriert
 * - Keine doppelte oder konkurrierende KI-Analyse
 */

import { useState } from "react";
import { Zap, Flame, Thermometer, AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeLeadTemperature } from "@/utils/analyzeLeadTemperature";
import { toast } from "sonner";

export default function EngineBox({ company, contactLogs = [], tasks = [], orgId, onAddTask }) {
  const [analyzing, setAnalyzing] = useState(false);
  
  const analysis = analyzeLeadTemperature(company, contactLogs, tasks);
  
  const tempColor = {
    Hot: "from-red-500 to-orange-500",
    Warm: "from-amber-500 to-orange-400",
    Cold: "from-slate-500 to-slate-400",
  }[analysis.temperature];

  const tempBg = {
    Hot: "bg-red-50 border-red-200",
    Warm: "bg-amber-50 border-amber-200",
    Cold: "bg-slate-50 border-slate-200",
  }[analysis.temperature];

  const tempText = {
    Hot: "text-red-900",
    Warm: "text-amber-900",
    Cold: "text-slate-900",
  }[analysis.temperature];

  const handleAddTask = () => {
    if (onAddTask) {
      onAddTask();
      toast.success("Neue Aufgabe erstellen");
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Vertriebo Engine</h3>
        </div>
        <span className="text-[10px] font-semibold text-slate-500">KI-Analyse</span>
      </div>

      {/* Temperatur Score */}
      <div className={`rounded-lg border-2 p-4 mb-4 ${tempBg}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${tempColor}`} />
            <span className={`text-lg font-bold ${tempText}`}>{analysis.temperature}</span>
          </div>
          <span className={`text-2xl font-black ${tempText}`}>{analysis.score}</span>
        </div>
        <p className="text-xs font-semibold text-slate-700">Engagement-Score</p>
      </div>

      {/* Begründung */}
      <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm font-medium text-slate-900 leading-relaxed">{analysis.reason}</p>
      </div>

      {/* Nächster Schritt */}
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">Nächster Schritt</p>
        <div className="flex flex-wrap gap-2">
          {analysis.nextBestAction === "anrufen" && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg">
              📞 Anrufen
            </span>
          )}
          {analysis.nextBestAction === "email_senden" && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg">
              ✉️ E-Mail senden
            </span>
          )}
          {analysis.nextBestAction === "daten_anreichern" && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg">
              ✨ Daten anreichern
            </span>
          )}
          {analysis.nextBestAction === "heute_aufgaben_erledigen" && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg">
              ⏰ Heute Aufgaben
            </span>
          )}
          {analysis.nextBestAction === "ueberfaellige_aufgaben" && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg">
              🔴 Überfällig
            </span>
          )}
        </div>
      </div>

      {/* Kaufsignale */}
      {analysis.signals.buying.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Positive Signale
          </p>
          <div className="space-y-1">
            {analysis.signals.buying.map((signal, i) => (
              <p key={i} className="text-xs text-emerald-800 font-medium">✓ {signal}</p>
            ))}
          </div>
        </div>
      )}

      {/* Risiken */}
      {analysis.signals.risks.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700 mb-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Risiken
          </p>
          <div className="space-y-1">
            {analysis.signals.risks.map((risk, i) => (
              <p key={i} className="text-xs text-red-800 font-medium">⚠ {risk}</p>
            ))}
          </div>
        </div>
      )}

      {/* Fehlende Daten */}
      {analysis.signals.missing.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Fehlende Daten
          </p>
          <div className="space-y-1">
            {analysis.signals.missing.map((missing, i) => (
              <p key={i} className="text-xs text-slate-700 font-medium">• {missing}</p>
            ))}
          </div>
        </div>
      )}

      {/* Erstkontakt */}
      {analysis.firstContact ? (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700 mb-2">Erstkontakt</p>
          <p className="text-xs text-blue-900 font-medium">
            {analysis.firstContact.typ} · {analysis.firstContact.ergebnis}
          </p>
          {analysis.firstContact.notiz && (
            <p className="text-xs text-blue-800 mt-1">"{analysis.firstContact.notiz}"</p>
          )}
        </div>
      ) : (
        <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-xs text-slate-700 font-medium">Noch kein qualifizierter Erstkontakt dokumentiert</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleAddTask}
          className="flex-1 gap-1.5 bg-white border-[#E2E8F0] text-slate-700 hover:bg-slate-50"
        >
          <Clock className="w-3.5 h-3.5" /> Aufgabe
        </Button>
      </div>
    </div>
  );
}