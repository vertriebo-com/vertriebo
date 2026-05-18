import { Link } from "react-router-dom";
import { Flame, Building2, Phone, Mail, PhoneCall, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * PrimaryActionCard - "Heute zuerst" Karte
 * Zeigt den besten Lead mit konkreten nächsten Aktionen
 */
export default function PrimaryActionCard({ company, onAnalyze }) {
  if (!company) return null;

  const isHot = company.priority_score >= 60;
  const score = company.priority_score || 0;

  return (
    <div className={`bg-gradient-to-br ${isHot ? 'from-orange-50 to-red-50' : 'from-blue-50 to-indigo-50'} border-2 ${isHot ? 'border-orange-200' : 'border-blue-200'} rounded-2xl p-6 shadow-sm mb-6`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-4 flex-1">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${isHot ? 'bg-white border-2 border-orange-200' : 'bg-white border-2 border-blue-200'}`}>
            {isHot ? <Flame className="w-7 h-7 text-orange-600" /> : <Building2 className="w-7 h-7 text-blue-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold uppercase tracking-wide ${isHot ? 'text-orange-700' : 'text-blue-700'}`}>
                {isHot ? '🔥 Bester Lead' : '⭐ Priorisierter Lead'}
              </span>
            </div>
            <Link to={`/leads/${company.id}`} className="text-xl font-bold text-slate-900 hover:text-blue-600 transition-colors block mb-1">
              {company.name}
            </Link>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="font-medium text-slate-700">{company.branche || 'Keine Branche'}</span>
              {company.ort && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">{company.ort}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${isHot ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
            Score: {score}
          </div>
        </div>
      </div>

      {/* Relevanz-Grund */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/50">
        <div className="flex items-start gap-2 mb-2">
          <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Warum dieser Lead?</p>
            <div className="space-y-1 text-sm">
              {company.matched_target_customer_type && (
                <p className="text-slate-700">
                  <span className="font-semibold">Passt zu:</span> {company.matched_target_customer_type}
                </p>
              )}
              {company.matched_service_context && (
                <p className="text-slate-700">
                  <span className="font-semibold">Service-Kontext:</span> {company.matched_service_context}
                </p>
              )}
              {company.relevance_reason && (
                <p className="text-slate-700">
                  <span className="font-semibold">Relevanz:</span> {company.relevance_reason}
                </p>
              )}
              {!company.matched_target_customer_type && !company.matched_service_context && !company.relevance_reason && (
                <p className="text-slate-600">Hoher Prioritäts-Score basierend auf aktuellen Vertriebsdaten</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-black/5">
        <Link to={`/leads/${company.id}`}>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Building2 className="w-4 h-4" /> Lead öffnen
          </Button>
        </Link>
        {company.telefon && (
          <a href={`tel:${company.telefon}`}>
            <Button variant="outline" className="gap-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
              <Phone className="w-4 h-4" /> Anrufen
            </Button>
          </a>
        )}
        {company.email && (
          <a href={`mailto:${company.email}`}>
            <Button variant="outline" className="gap-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
              <Mail className="w-4 h-4" /> E-Mail
            </Button>
          </a>
        )}
        <Link to={`/leads/${company.id}`}>
          <Button variant="outline" className="gap-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
            <PhoneCall className="w-4 h-4" /> Anrufskript
          </Button>
        </Link>
        <Link to={`/leads/${company.id}`}>
          <Button variant="outline" className="gap-2 bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
            <Mail className="w-4 h-4" /> E-Mail vorbereiten
          </Button>
        </Link>
      </div>
    </div>
  );
}