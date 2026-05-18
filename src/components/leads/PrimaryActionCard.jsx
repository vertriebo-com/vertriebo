import { Link } from "react-router-dom";
import { Flame, Building2, Phone, Mail, PhoneCall, Target, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isHotLead, getTemperatureScore } from "@/utils/leadTemperature";

/**
 * PrimaryActionCard - Kompakter Top-Lead mit Action-First
 */
export default function PrimaryActionCard({ company, onAnalyze }) {
  if (!company) return null;

  const isHot = isHotLead(company);
  const score = getTemperatureScore(company);
  const showScore = score > 0;

  const formatRelevance = (text) => {
    if (!text) return '';
    return text.replace(/^Cat:/, '').replace(/^Industry:/, '').replace(/^cat:/i, '').trim();
  };

  const hasRelevance = company.matched_target_customer_type || company.matched_service_context;

  return (
    <div className={`border rounded-xl shadow-sm ${
      isHot
        ? 'bg-gradient-to-r from-orange-50 to-red-50/30 border-orange-200/60'
        : 'bg-gradient-to-r from-blue-50 to-indigo-50/30 border-blue-200/60'
    }`}>
      <div className="p-3 sm:p-4">
        {/* Top row: badge + name + score */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isHot ? 'bg-orange-100 border border-orange-300' : 'bg-blue-100 border border-blue-300'
            }`}>
              {isHot ? <Flame className="w-5 h-5 text-orange-600" /> : <Building2 className="w-5 h-5 text-blue-600" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  isHot ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}>
                  {isHot ? '🔥 Priorisiert' : '⚡ Als nächstes'}
                </span>
              </div>
              <Link to={`/leads/${company.id}`} className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors block leading-tight truncate">
                {company.name}
              </Link>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-600 flex-wrap">
                {company.branche && <span className="font-medium text-slate-700">{company.branche}</span>}
                {company.ort && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {company.ort}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {showScore && (
            <div className={`text-xs font-bold px-2 py-1 rounded-md border flex-shrink-0 ${
              isHot ? 'bg-white border-orange-200 text-orange-700' : 'bg-white border-blue-200 text-blue-700'
            }`}>
              {score}
            </div>
          )}
        </div>

        {/* Relevanz – kurz, menschlich */}
        {hasRelevance && (
          <div className="bg-white/80 rounded-md px-3 py-2 mb-2 border border-slate-200/50 text-xs text-slate-700">
            {company.matched_target_customer_type && (
              <span>Zielgruppe: <strong>{formatRelevance(company.matched_target_customer_type)}</strong></span>
            )}
            {company.matched_target_customer_type && company.matched_service_context && <span className="mx-1.5 text-slate-300">·</span>}
            {company.matched_service_context && (
              <span>Service: <strong>{formatRelevance(company.matched_service_context)}</strong></span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50">
          <Link to={`/leads/${company.id}`}>
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8 text-xs">
              Lead öffnen <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
          <div className="flex items-center gap-1 ml-auto">
            {company.telefon && (
              <a href={`tel:${company.telefon}`} title={`Anrufen: ${company.telefon}`}>
                <Button size="icon" variant="outline" className="w-8 h-8 bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300">
                  <Phone className="w-3.5 h-3.5" />
                </Button>
              </a>
            )}
            {company.email && (
              <a href={`mailto:${company.email}`} title={`E-Mail: ${company.email}`}>
                <Button size="icon" variant="outline" className="w-8 h-8 bg-white border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300">
                  <Mail className="w-3.5 h-3.5" />
                </Button>
              </a>
            )}
            <Link to={`/leads/${company.id}`} title="Gesprächsleitfaden öffnen">
              <Button size="icon" variant="outline" className="w-8 h-8 bg-white border-slate-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300">
                <PhoneCall className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}