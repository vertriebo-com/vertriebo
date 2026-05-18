import { Link } from "react-router-dom";
import { Flame, Building2, Phone, Mail, PhoneCall, Target, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * PrimaryActionCard - "Heute zuerst" Karte
 * Zeigt den besten Lead mit konkreten nächsten Aktionen
 */
export default function PrimaryActionCard({ company, onAnalyze }) {
  if (!company) return null;

  const isHot = (company.priority_score || 0) >= 60 || (company.lead_temperature === 'hot');
  const score = company.priority_score || company.relevance_score || company.lead_temperature_score || 0;
  const showScore = score > 0;

  // Menschliche Formulierung für Relevanz
  const formatRelevance = (text) => {
    if (!text) return '';
    // Entferne technische Präfixe
    return text.replace(/^Cat:/, '').replace(/^Industry:/, '');
  };

  const hasRelevance = company.matched_target_customer_type || company.matched_service_context || company.relevance_reason;

  return (
    <div className={`bg-gradient-to-br ${isHot ? 'from-orange-50 via-orange-50/30 to-red-50/20' : 'from-blue-50 via-blue-50/30 to-indigo-50/20'} border ${isHot ? 'border-orange-200/60' : 'border-blue-200/60'} rounded-xl p-4 sm:p-5 shadow-sm mb-4`}>
      {/* Header mit Badge */}
      <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4">
        <div className="flex items-start gap-3 sm:gap-4 flex-1">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${isHot ? 'bg-gradient-to-br from-orange-100 to-red-100 border-2 border-orange-300' : 'bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-blue-300'}`}>
            {isHot ? <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600" /> : <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${isHot ? 'bg-orange-100 text-orange-800 border border-orange-300' : 'bg-blue-100 text-blue-800 border border-blue-300'}`}>
                {isHot ? <Flame className="w-2.5 h-2.5" /> : <Target className="w-2.5 h-2.5" />}
                {isHot ? 'Heute priorisieren' : 'Als nächstes kontaktieren'}
              </span>
            </div>
            <Link to={`/leads/${company.id}`} className="text-lg sm:text-xl font-bold text-slate-900 hover:text-blue-600 transition-colors block mb-1.5">
              {company.name}
            </Link>
            <div className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm">
              <span className="font-medium text-slate-700">{company.branche || 'Branche nicht angegeben'}</span>
              {company.ort && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Building2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {company.ort}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Score Badge - nur wenn > 0 */}
        {showScore && (
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold shadow-sm ${isHot ? 'bg-white border-orange-200 text-orange-700' : 'bg-white border-blue-200 text-blue-700'}`}>
            <span className="text-[10px] font-medium opacity-70 mr-1">Priorität</span>
            {score}
          </div>
        )}
      </div>

      {/* Relevanz-Grund - Menschlich formuliert (nur Desktop voll, Mobile kompakt) */}
      {hasRelevance && (
        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 mb-4 border border-slate-200/50">
          <div className="flex items-start gap-2.5">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${isHot ? 'bg-orange-100' : 'bg-blue-100'}`}>
              <Target className={`w-3.5 h-3.5 ${isHot ? 'text-orange-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">Warum vielversprechend</p>
              <div className="space-y-1 text-xs">
                {company.matched_target_customer_type && (
                  <p className="text-slate-700 truncate"><span className="font-semibold">Zielgruppe:</span> {formatRelevance(company.matched_target_customer_type)}</p>
                )}
                {company.matched_service_context && (
                  <p className="text-slate-700 truncate"><span className="font-semibold">Service:</span> {formatRelevance(company.matched_service_context)}</p>
                )}
                {company.relevance_reason && !company.matched_target_customer_type && !company.matched_service_context && (
                  <p className="text-slate-700 truncate">{formatRelevance(company.relevance_reason)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aktionen - Primär: Lead öffnen, Sekundär: Icons */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200/50">
        <Link to={`/leads/${company.id}`}>
          <Button size="sm" className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm">
            <Building2 className="w-3.5 h-3.5" /> Lead öffnen
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </Link>
        <div className="flex items-center gap-1.5 ml-auto">
          {company.telefon && (
            <a href={`tel:${company.telefon}`} title="Anrufen">
              <Button size="icon" variant="outline" className="w-8 h-8 bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700">
                <Phone className="w-3.5 h-3.5" />
              </Button>
            </a>
          )}
          {company.email && (
            <a href={`mailto:${company.email}`} title="E-Mail">
              <Button size="icon" variant="outline" className="w-8 h-8 bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700">
                <Mail className="w-3.5 h-3.5" />
              </Button>
            </a>
          )}
          <Link to={`/leads/${company.id}`} title="Skript">
            <Button size="icon" variant="outline" className="w-8 h-8 bg-white border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700">
              <PhoneCall className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}