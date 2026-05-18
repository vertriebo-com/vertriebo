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
    <div className={`bg-gradient-to-br ${isHot ? 'from-orange-50 via-orange-50/30 to-red-50/20' : 'from-blue-50 via-blue-50/30 to-indigo-50/20'} border ${isHot ? 'border-orange-200/60' : 'border-blue-200/60'} rounded-2xl p-6 shadow-lg shadow-slate-200/50 mb-6`}>
      {/* Header mit Badge */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-4 flex-1">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${isHot ? 'bg-gradient-to-br from-orange-100 to-red-100 border-2 border-orange-300' : 'bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-blue-300'}`}>
            {isHot ? <Flame className="w-8 h-8 text-orange-600" /> : <Building2 className="w-8 h-8 text-blue-600" />}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${isHot ? 'bg-orange-100 text-orange-800 border border-orange-300' : 'bg-blue-100 text-blue-800 border border-blue-300'}`}>
                {isHot ? <Flame className="w-3 h-3" /> : <Target className="w-3 h-3" />}
                {isHot ? 'Heute priorisieren' : 'Als nächstes kontaktieren'}
              </span>
            </div>
            <Link to={`/leads/${company.id}`} className="text-2xl font-bold text-slate-900 hover:text-blue-600 transition-colors block mb-2">
              {company.name}
            </Link>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="font-medium text-slate-700">{company.branche || 'Branche nicht angegeben'}</span>
              {company.ort && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Building2 className="w-3 h-3" /> {company.ort}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Score Badge - nur wenn > 0 */}
        {showScore && (
          <div className={`px-4 py-2 rounded-xl border text-sm font-bold shadow-sm ${isHot ? 'bg-white border-orange-200 text-orange-700' : 'bg-white border-blue-200 text-blue-700'}`}>
            <span className="text-xs font-medium opacity-70 mr-1">Priorität</span>
            {score}
          </div>
        )}
      </div>

      {/* Relevanz-Grund - Menschlich formuliert */}
      {hasRelevance && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-5 border border-slate-200/60 shadow-sm">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isHot ? 'bg-orange-100' : 'bg-blue-100'}`}>
              <Target className={`w-4 h-4 ${isHot ? 'text-orange-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Warum dieser Lead vielversprechend ist</p>
              <div className="space-y-1.5 text-sm">
                {company.matched_target_customer_type && (
                  <p className="text-slate-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <span><span className="font-semibold">Ihre Zielgruppe:</span> {formatRelevance(company.matched_target_customer_type)}</span>
                  </p>
                )}
                {company.matched_service_context && (
                  <p className="text-slate-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <span><span className="font-semibold">Passende Leistungen:</span> {formatRelevance(company.matched_service_context)}</span>
                  </p>
                )}
                {company.relevance_reason && !company.matched_target_customer_type && !company.matched_service_context && (
                  <p className="text-slate-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                    <span>{formatRelevance(company.relevance_reason)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aktionen - Klare Hierarchie */}
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-200/60">
        <Link to={`/leads/${company.id}`}>
          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md">
            <Building2 className="w-4 h-4" /> Lead öffnen
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
        {company.telefon && (
          <a href={`tel:${company.telefon}`}>
            <Button variant="outline" className="gap-2 bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700">
              <Phone className="w-4 h-4" /> Anrufen
            </Button>
          </a>
        )}
        {company.email && (
          <a href={`mailto:${company.email}`}>
            <Button variant="outline" className="gap-2 bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700">
              <Mail className="w-4 h-4" /> E-Mail
            </Button>
          </a>
        )}
        <Link to={`/leads/${company.id}`}>
          <Button variant="outline" className="gap-2 bg-white border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700">
            <PhoneCall className="w-4 h-4" /> Skript
          </Button>
        </Link>
      </div>
    </div>
  );
}