import { Link } from "react-router-dom";
import { Building2, Flame, Phone, Mail, MapPin, Clock, User, Calendar, ChevronRight, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import moment from "moment";

const QUICK_LOG_ACTIONS = [
  { label: "📞 Nicht erreicht", ergebnis: "Nicht erreicht", status: "Rückruf", color: "hover:bg-red-50 text-red-700" },
  { label: "✓ Erreicht", ergebnis: "Erreicht", status: "Kontakt", color: "hover:bg-emerald-50 text-emerald-700" },
  { label: "🔄 Rückruf vereinbart", ergebnis: "Rückruf vereinbart", status: "Rückruf", color: "hover:bg-amber-50 text-amber-700" },
  { label: "📅 Termin vereinbart", ergebnis: "Termin vereinbart", status: "Termin", color: "hover:bg-purple-50 text-purple-700" },
  { label: "📄 Angebot senden", ergebnis: "Angebot gesendet", status: "Angebot", color: "hover:bg-blue-50 text-blue-700" },
  { label: "✗ Kein Interesse", ergebnis: "Kein Interesse", status: "Verloren", color: "hover:bg-gray-50 text-gray-700" },
];

export default function LeadRow({ company, isAdmin, onLogged }) {
  const [showActions, setShowActions] = useState(false);
  
  const priorityLabel = (company.priority_score || 0) >= 60 ? "Heiß" : (company.priority_score || 0) >= 30 ? "Warm" : "Kalt";
  const priorityColor = (company.priority_score || 0) >= 60 ? "text-orange-600 bg-orange-50 border-orange-200" : (company.priority_score || 0) >= 30 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-gray-600 bg-gray-50 border-gray-200";

  const handleQuickLog = async (action) => {
    const me = await base44.auth.me();
    await base44.entities.ContactLog.create({
      company_id: company.id,
      typ: "Anruf",
      ergebnis: action.ergebnis,
      notiz: "",
      naechster_schritt: action.ergebnis,
      user_email: me.email,
    });
    await base44.entities.Company.update(company.id, {
      status: action.status,
      last_contact_date: new Date().toISOString(),
    });
    toast.success(`${company.name}: ${action.label.split(" ")[1]}`);
    setShowActions(false);
    onLogged?.();
  };

  return (
    <div className="group bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:shadow-md hover:border-blue-300 transition-all duration-200">
      <div className="flex items-center gap-5">
        {/* Company Info - Left */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
            company.is_hot 
              ? "bg-orange-50 border-2 border-orange-200" 
              : "bg-blue-50 border-2 border-blue-200"
          }`}>
            {company.is_hot ? <Flame className="w-7 h-7 text-orange-600" /> : <Building2 className="w-7 h-7 text-blue-600" />}
          </div>
          
          <div className="min-w-0 flex-1">
            <Link 
              to={`/leads/${company.id}`} 
              className="text-[15px] font-semibold text-slate-900 hover:text-blue-600 transition-colors truncate block mb-1"
            >
              {company.name}
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-slate-600">{company.branche || "Keine Branche"}</span>
              {company.ort && (
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  <MapPin className="w-3.5 h-3.5" /> {company.ort}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact Info - Center Left */}
        <div className="hidden lg:flex items-center gap-6 min-w-[200px]">
          {company.telefon ? (
            <a href={`tel:${company.telefon}`} className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors group/contact">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center group-hover/contact:bg-emerald-100 transition-colors">
                <Phone className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="truncate">{company.telefon}</span>
            </a>
          ) : (
            <span className="text-sm text-slate-400">–</span>
          )}
        </div>

        {/* Status & Priority - Center */}
        <div className="hidden md:flex items-center gap-3 min-w-[180px]">
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
            company.status === "Rückruf" ? "bg-amber-50 text-amber-700 border-amber-200" :
            company.status === "Termin" ? "bg-purple-50 text-purple-700 border-purple-200" :
            company.status === "Angebot" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
            company.status === "Gewonnen" ? "bg-green-50 text-green-700 border-green-200" :
            company.status === "Verloren" ? "bg-slate-50 text-slate-600 border-slate-200" :
            "bg-blue-50 text-blue-700 border-blue-200"
          }`}>
            {company.status}
          </div>
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${priorityColor}`}>
            {priorityLabel}
          </div>
        </div>

        {/* Next Step / Last Contact - Center Right */}
        <div className="hidden xl:flex items-center gap-4 min-w-[200px]">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Nächster Schritt</span>
            </div>
            <p className="text-sm font-semibold text-slate-900">Anrufen</p>
            <p className="text-xs text-slate-500">Heute fällig</p>
          </div>
        </div>

        {/* Vertriebler - Right */}
        <div className="hidden lg:flex items-center min-w-[150px]">
          {company.assigned_to ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {company.assigned_to.split("@")[0]}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{company.assigned_to}</p>
              </div>
            </div>
          ) : (
            <span className="text-sm text-slate-400 italic">Nicht zugewiesen</span>
          )}
        </div>

        {/* Actions - Far Right */}
        <div className="relative">
          <div className="flex items-center gap-1.5">
            <Link
              to={`/leads/${company.id}`}
              className="px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium"
              title="Details"
            >
              Details
            </Link>
            {company.telefon && (
              <a
                href={`tel:${company.telefon}`}
                className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-colors"
                title="Anrufen"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            {company.email && (
              <a
                href={`mailto:${company.email}`}
                className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
                title="E-Mail"
              >
                <Mail className="w-4 h-4" />
              </a>
            )}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2.5 rounded-lg bg-white border border-border text-slate-600 hover:bg-slate-50 transition-colors"
                title="Mehr"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              
              {showActions && (
                <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-white border border-border rounded-xl shadow-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-border bg-slate-50">
                    <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Schnell-Log</span>
                  </div>
                  <div className="p-1.5">
                    {QUICK_LOG_ACTIONS.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickLog(action)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${action.color}`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-border p-1.5">
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                      <Calendar className="w-3.5 h-3.5" />
                      Aufgabe erstellen
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (window.confirm("Lead wirklich löschen?")) {
                            base44.entities.Company.delete(company.id).then(() => {
                              toast.success("Lead gelöscht");
                              onLogged?.();
                            });
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}