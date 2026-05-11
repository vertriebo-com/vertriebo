import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, RefreshCw, Loader2, AlertTriangle, PhoneCall, Mail, Clock, Search, TrendingDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PRIORITY_CONFIG = {
  hoch:     { label: "Hoch",     color: "bg-red-100 text-red-700 border-red-200" },
  mittel:   { label: "Mittel",   color: "bg-amber-100 text-amber-700 border-amber-200" },
  niedrig:  { label: "Niedrig",  color: "bg-slate-100 text-slate-600 border-slate-200" },
};

const ACTION_CONFIG = {
  anrufen:            { icon: PhoneCall,    label: "Anrufen",             color: "text-emerald-600" },
  email_senden:       { icon: Mail,         label: "E-Mail senden",       color: "text-blue-600" },
  wiedervorlage:      { icon: Clock,        label: "Wiedervorlage",       color: "text-amber-600" },
  daten_pruefen:      { icon: Search,       label: "Daten prüfen",        color: "text-purple-600" },
  nicht_priorisieren: { icon: TrendingDown, label: "Nicht priorisieren",  color: "text-slate-500" },
};

export default function KiRecommendationCard({ company, orgId, onCompanyUpdated }) {
  const [recommendation, setRecommendation] = useState(() => {
    if (company.ki_recommendation) {
      try { return JSON.parse(company.ki_recommendation); } catch (_) { return null; }
    }
    return null;
  });
  const [source, setSource] = useState(company.ki_recommendation ? 'cache' : null);
  const [generatedAt, setGeneratedAt] = useState(company.ki_recommendation_generated_at || null);
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const generatingRef = useRef(false);

  const generate = async (forceRegenerate = false) => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setLoading(true);
    setLimitReached(false);

    try {
      const res = await base44.functions.invoke("getKiRecommendation", {
        company_id: company.id,
        organization_id: orgId,
        force_regenerate: forceRegenerate,
      });

      const data = res.data;

      if (data?.limit_reached && !data?.recommendation) {
        setLimitReached(true);
        toast.error("Empfehlungslimit erreicht. Bitte warten oder Plan upgraden.");
        return;
      }

      if (data?.limit_reached && data?.recommendation) {
        setLimitReached(true);
        setRecommendation(data.recommendation);
        setSource('cache');
        toast.warning("Limit erreicht – gespeicherte Empfehlung wird angezeigt.");
        return;
      }

      if (data?.error) {
        toast.error("Fehler: " + data.error);
        return;
      }

      setRecommendation(data.recommendation);
      setSource(data.source);
      setGeneratedAt(new Date().toISOString());

      if (data.source === 'llm') {
        toast.success("Vertriebo-Empfehlung erstellt ✓");
      } else if (data.source === 'fallback') {
        toast.info("Vertriebo-Empfehlung verwendet.");
      }
      // Notify parent to refresh company data
      if (onCompanyUpdated) onCompanyUpdated();
    } catch (e) {
      toast.error("Fehler beim Generieren: " + (e?.message || "Unbekannt"));
    } finally {
      setLoading(false);
      generatingRef.current = false;
    }
  };

  const priorityCfg = PRIORITY_CONFIG[recommendation?.priority] || PRIORITY_CONFIG.mittel;
  const actionCfg = ACTION_CONFIG[recommendation?.next_action] || ACTION_CONFIG.wiedervorlage;
  const ActionIcon = actionCfg.icon;

  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
         <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 flex items-center gap-2">
           <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Vertriebo-Empfehlung
         </h3>
         {recommendation && !loading && (
           <button
             onClick={() => generate(true)}
             disabled={loading || limitReached}
             className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-700 disabled:opacity-40 transition-colors"
             title="Neu generieren"
           >
             <RefreshCw className="w-3 h-3" /> Neu
           </button>
         )}
       </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center gap-2 py-6">
           <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
           <p className="text-xs font-medium text-slate-600">Vertriebo analysiert Lead-Daten…</p>
         </div>
      ) : limitReached && !recommendation ? (
         <div className="flex flex-col items-center gap-2 py-5 text-center">
           <AlertTriangle className="w-6 h-6 text-amber-500" />
           <p className="text-xs font-bold text-slate-900">Empfehlungslimit erreicht</p>
           <p className="text-[11px] text-slate-500">Bitte warten oder Plan upgraden.</p>
         </div>
      ) : recommendation ? (
        <div className="space-y-3">
          {/* Priority + Action */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${priorityCfg.color}`}>
              Priorität: {priorityCfg.label}
            </span>
            <span className={`text-[11px] font-semibold flex items-center gap-1 ${actionCfg.color}`}>
              <ActionIcon className="w-3.5 h-3.5" /> {actionCfg.label}
            </span>
            {source === 'fallback' && (
              <span className="text-[10px] text-slate-400 italic">Standard</span>
            )}
            {source === 'cache' && (
              <span className="text-[10px] text-slate-400 italic">Gespeichert</span>
            )}
          </div>

          {/* Title */}
          <div className={`rounded-lg px-3 py-2.5 border ${
            recommendation.priority === 'hoch'
              ? 'bg-red-50 border-red-200'
              : recommendation.priority === 'mittel'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <p className="text-sm font-bold text-slate-900">{recommendation.title}</p>
          </div>

          {/* Reason */}
          {recommendation.reason && (
            <p className="text-xs text-slate-700 leading-relaxed">{recommendation.reason}</p>
          )}

          {/* Suggested message */}
          {recommendation.suggested_message && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-[10px] font-bold text-slate-500 mb-1">💬 Einstiegssatz</p>
              <p className="text-xs text-slate-700 italic leading-relaxed">„{recommendation.suggested_message}"</p>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Follow-up in {recommendation.follow_up_days} Tag{recommendation.follow_up_days !== 1 ? 'en' : ''}</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {recommendation.confidence}% Konfidenz
            </span>
          </div>

          {formattedDate && (
            <p className="text-[10px] text-slate-300">{source === 'llm' ? 'Generiert' : 'Gespeichert'}: {formattedDate}</p>
          )}
          {limitReached && (
            <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Limit erreicht – gespeicherte Empfehlung
            </p>
          )}
        </div>
      ) : (
        /* No recommendation yet */
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
             <p className="text-xs font-semibold text-slate-700">Noch keine Empfehlung</p>
             <p className="text-[11px] text-slate-500 mt-0.5">Vertriebo analysiert Kontakthistorie, Aufgaben und Lead-Daten.</p>
           </div>
           <Button
             size="sm"
             onClick={() => generate(false)}
             disabled={loading}
             className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
           >
             <Sparkles className="w-3 h-3" /> Empfehlung erstellen
           </Button>
           <p className="text-[10px] text-slate-400">Aktualisiert Ihren Kontakt-Status</p>
        </div>
      )}
    </div>
  );
}