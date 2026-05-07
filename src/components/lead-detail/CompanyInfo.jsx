import { Building2, User, MapPin, Phone, Mail, Globe, Ban, Flame } from "lucide-react";
import StatusBadge from "../StatusBadge";
import PriorityBadge from "../PriorityBadge";

export default function LeadDetailCompanyInfo({ company }) {
  if (!company) return null;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 flex items-center gap-2 mb-4">
        <Building2 className="w-3.5 h-3.5" /> Firmendaten
      </h3>
      
      <div className="space-y-3">
        {company.ansprechpartner && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{company.ansprechpartner}</p>
              <p className="text-xs text-slate-500">Ansprechpartner</p>
            </div>
          </div>
        )}
        
        {company.adresse && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-900">{company.adresse}</p>
              <p className="text-xs text-slate-500">{company.plz} {company.ort}</p>
              {company.entfernung_km && <p className="text-xs text-slate-500">{company.entfernung_km} km entfernt</p>}
            </div>
          </div>
        )}
        
        {company.telefon && (
          <a href={`tel:${company.telefon}`} className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-700 group-hover:underline">{company.telefon}</p>
              <p className="text-xs text-slate-500">Telefon</p>
            </div>
          </a>
        )}
        
        {company.email && (
          <a href={`mailto:${company.email}`} className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-700 group-hover:underline truncate">{company.email}</p>
              <p className="text-xs text-slate-500">E-Mail</p>
            </div>
          </a>
        )}
        
        {company.website && (
          <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Globe className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-600 group-hover:underline truncate">{company.website}</p>
              <p className="text-xs text-slate-500">Website</p>
            </div>
          </a>
        )}
        
        {company.assigned_to && (
          <div className="flex items-center gap-3 pt-3 border-t border-[#E2E8F0]">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{company.assigned_to}</p>
              <p className="text-xs text-slate-500">Zuständiger Vertriebler</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Status & Priority Badges */}
      <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex items-center gap-2">
        <StatusBadge status={company.status} />
        <PriorityBadge priority={company.priority_score >= 60 ? "Hoch" : company.priority_score >= 30 ? "Mittel" : "Niedrig"} />
        {company.is_blacklisted && (
          <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-md flex items-center gap-1">
            <Ban className="w-3 h-3" /> Blacklist
          </span>
        )}
      </div>
      
      {company.aktueller_dienstleister && (
        <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Aktueller Dienstleister</p>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <span className="text-sm font-semibold text-amber-800">🏢 {company.aktueller_dienstleister}</span>
          </div>
        </div>
      )}
    </div>
  );
}