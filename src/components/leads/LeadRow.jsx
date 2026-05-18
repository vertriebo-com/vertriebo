import { Link } from "react-router-dom";
import { Building2, Flame, Phone, Mail, MapPin, User, Calendar, MoreHorizontal, ArrowRight } from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const QUICK_LOG_ACTIONS = [
  { label: "📞 Nicht erreicht", ergebnis: "Nicht erreicht", status: "Rückruf", color: "hover:bg-red-50 text-red-700" },
  { label: "✓ Erreicht", ergebnis: "Erreicht", status: "Kontakt", color: "hover:bg-emerald-50 text-emerald-700" },
  { label: "🔄 Rückruf vereinbart", ergebnis: "Rückruf vereinbart", status: "Rückruf", color: "hover:bg-amber-50 text-amber-700" },
  { label: "📅 Termin vereinbart", ergebnis: "Termin vereinbart", status: "Termin", color: "hover:bg-purple-50 text-purple-700" },
  { label: "📄 Angebot senden", ergebnis: "Angebot gesendet", status: "Angebot", color: "hover:bg-blue-50 text-blue-700" },
  { label: "✗ Kein Interesse", ergebnis: "Kein Interesse", status: "Verloren", color: "hover:bg-gray-50 text-gray-700" },
];

function statusColor(status) {
  if (status === "Rückruf") return "bg-amber-50 text-amber-700 border-amber-200 font-bold";
  if (status === "Termin") return "bg-purple-50 text-purple-700 border-purple-200 font-bold";
  if (status === "Angebot") return "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold";
  if (status === "Gewonnen") return "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
  if (status === "Verloren") return "bg-slate-50 text-slate-500 border-slate-200";
  if (status === "Kontakt") return "bg-teal-50 text-teal-700 border-teal-200 font-bold";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function temperatureLabel(score, temperature) {
  if (temperature === 'hot' || score >= 60) return { label: "Heiß", cls: "text-orange-700 bg-orange-50 border-orange-200 font-bold" };
  if (temperature === 'warm' || score >= 30) return { label: "Warm", cls: "text-amber-700 bg-amber-50 border-amber-200" };
  return null; // Kalt nicht anzeigen – wenig Mehrwert
}

export default function LeadRow({ company, isAdmin, onLogged }) {
  const [showActions, setShowActions] = useState(false);

  const score = company.priority_score || 0;
  const temp = temperatureLabel(score, company.lead_temperature);

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
    <div className="group bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-blue-200 transition-all duration-150">
      {/* Mobile */}
      <div className="lg:hidden p-3.5">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            company.is_hot ? "bg-orange-100 border border-orange-300" : "bg-blue-100 border border-blue-200"
          }`}>
            {company.is_hot ? <Flame className="w-5 h-5 text-orange-600" /> : <Building2 className="w-5 h-5 text-blue-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <Link to={`/leads/${company.id}`} className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors block truncate">
              {company.name}
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-600 flex-wrap">
              {company.branche && <span className="font-medium text-slate-700">{company.branche}</span>}
              {company.ort && (
                <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {company.ort}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${statusColor(company.status)}`}>
                {company.status}
              </span>
              {temp && (
                <span className={`px-2 py-0.5 rounded-md border text-[10px] ${temp.cls}`}>
                  {temp.label}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Link
            to={`/leads/${company.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all"
          >
            Details <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          {company.telefon && (
            <a
              href={`tel:${company.telefon}`}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-sm transition-all"
            >
              <Phone className="w-3.5 h-3.5" /> Anrufen
            </a>
          )}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex items-center gap-4 px-4 py-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          company.is_hot ? "bg-orange-100 border border-orange-300" : "bg-blue-100 border border-blue-200"
        }`}>
          {company.is_hot ? <Flame className="w-5 h-5 text-orange-600" /> : <Building2 className="w-5 h-5 text-blue-600" />}
        </div>

        {/* Company Info */}
        <div className="flex-1 min-w-0">
          <Link
            to={`/leads/${company.id}`}
            className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors block truncate"
            title={company.name}
          >
            {company.name}
          </Link>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-600">
            {company.branche && <span className="font-medium text-slate-700 truncate">{company.branche}</span>}
            {company.ort && (
              <>
                <span className="text-slate-300">·</span>
                <span className="flex items-center gap-0.5 flex-shrink-0"><MapPin className="w-2.5 h-2.5" /> {company.ort}</span>
              </>
            )}
          </div>
        </div>

        {/* Status + Temperatur */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`px-2.5 py-1 rounded-lg border text-xs ${statusColor(company.status)}`}>
            {company.status}
          </span>
          {temp && (
            <span className={`px-2.5 py-1 rounded-lg border text-xs ${temp.cls}`}>
              {temp.label}
            </span>
          )}
        </div>

        {/* Vertriebler */}
        {company.assigned_to && (
          <div className="hidden xl:flex items-center gap-1.5 flex-shrink-0 min-w-[120px]">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-3 h-3 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-slate-700 truncate">{company.assigned_to.split("@")[0]}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link
            to={`/leads/${company.id}`}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all"
          >
            Details
          </Link>
          {company.telefon && (
            <a
              href={`tel:${company.telefon}`}
              className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all"
              title="Anrufen"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}
          {company.email && (
            <a
              href={`mailto:${company.email}`}
              className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-all"
              title="E-Mail"
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          )}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {showActions && (
              <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Schnell-Log</span>
                </div>
                <div className="p-1">
                  {QUICK_LOG_ACTIONS.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickLog(action)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${action.color}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 p-1">
                  <button
                    onClick={() => {
                      setShowActions(false);
                      window.dispatchEvent(new CustomEvent("open-task-dialog", { detail: { companyId: company.id, companyName: company.name } }));
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Aufgabe erstellen
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
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50"
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
  );
}