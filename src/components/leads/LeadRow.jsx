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

function OutcomeBadge({ outcome }) {
  if (!outcome) return null;
  const styles = {
    won: "bg-emerald-50 text-emerald-700 border-emerald-200",
    relevant: "bg-blue-50 text-blue-700 border-blue-200",
    not_relevant: "bg-slate-100 text-slate-500 border-slate-200",
  };
  const labels = { won: "Gewonnen", relevant: "Relevant", not_relevant: "Nicht relevant" };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[outcome] || styles.relevant}`}>
      {labels[outcome] || outcome}
    </span>
  );
}

function statusColor(status) {
  if (status === "Rückruf") return "bg-amber-50 text-amber-700 border-amber-200 font-bold";
  if (status === "Termin") return "bg-purple-50 text-purple-700 border-purple-200 font-bold";
  if (status === "Angebot") return "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold";
  if (status === "Gewonnen") return "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
  if (status === "Verloren") return "bg-slate-50 text-slate-600 border-slate-200";
  return "bg-blue-50 text-blue-700 border-blue-200 font-bold";
}

export default function LeadRow({ company, isAdmin, onLogged, outcome }) {
  const [showActions, setShowActions] = useState(false);

  const priorityLabel = (company.priority_score || 0) >= 60 ? "Heiß" : (company.priority_score || 0) >= 30 ? "Warm" : "Kalt";
  const priorityColor = (company.priority_score || 0) >= 60 ? "text-orange-700 bg-orange-50 border-orange-200 font-bold" : (company.priority_score || 0) >= 30 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-slate-600 bg-slate-50 border-slate-200";

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
    <div className="group bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:border-blue-300 hover:shadow-blue-100/50 transition-all duration-200">
      {/* Mobile Layout - Stacked */}
      <div className="lg:hidden space-y-4">
        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${
            company.is_hot ? "bg-gradient-to-br from-orange-100 to-red-100 border-2 border-orange-300" : "bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-blue-300"
          }`}>
            {company.is_hot ? <Flame className="w-8 h-8 text-orange-600" /> : <Building2 className="w-8 h-8 text-blue-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              to={`/leads/${company.id}`}
              className="text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors block mb-1.5"
              title={company.name}
            >
              {company.name}
            </Link>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-sm font-medium text-slate-700">{company.branche || "Branche nicht angegeben"}</span>
              {company.ort && (
                <span className="flex items-center gap-1 text-sm text-slate-600">
                  <MapPin className="w-3.5 h-3.5" /> {company.ort}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`px-3 py-1.5 rounded-lg border text-xs ${statusColor(company.status)}`}>
                {company.status}
              </div>
              <div className={`px-3 py-1.5 rounded-lg border text-xs ${priorityColor}`}>
                {priorityLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Aktionen */}
        <div className="flex items-center gap-2 pt-2">
          {company.telefon && (
            <a href={`tel:${company.telefon}`} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all text-sm font-bold shadow-sm">
              <Phone className="w-4 h-4" /> Anrufen
            </a>
          )}
          <Link
            to={`/leads/${company.id}`}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-bold shadow-sm"
          >
            Details
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Desktop Layout - Horizontal */}
      <div className="hidden lg:flex items-center gap-6">
        {/* Company Info - Left */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${
            company.is_hot ? "bg-gradient-to-br from-orange-100 to-red-100 border-2 border-orange-300" : "bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-blue-300"
          }`}>
            {company.is_hot ? <Flame className="w-8 h-8 text-orange-600" /> : <Building2 className="w-8 h-8 text-blue-600" />}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              to={`/leads/${company.id}`}
              className="text-xl font-bold text-slate-900 hover:text-blue-600 transition-colors block mb-1"
              title={company.name}
            >
              {company.name}
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-700">{company.branche || "Branche nicht angegeben"}</span>
              {company.ort && (
                <span className="flex items-center gap-1 text-sm text-slate-600">
                  <MapPin className="w-3.5 h-3.5" /> {company.ort}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status & Priority - Besser sichtbar */}
        <div className="hidden md:flex items-center gap-2 min-w-[200px]">
          <div className={`px-3.5 py-2 rounded-xl border text-xs ${statusColor(company.status)} shadow-sm`}>
            {company.status}
          </div>
          <div className={`px-3.5 py-2 rounded-xl border text-xs ${priorityColor} shadow-sm`}>
            {priorityLabel}
          </div>
        </div>

        {/* Vertriebler - Freundlicher */}
        <div className="hidden lg:flex items-center min-w-[150px]">
          {company.assigned_to ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border border-blue-300">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{company.assigned_to.split("@")[0]}</p>
                <p className="text-[10px] text-slate-500 truncate">{company.assigned_to}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-xs">Nicht zugewiesen</span>
            </div>
          )}
        </div>

        {/* Actions - Klare Hierarchie */}
        <div className="flex items-center gap-2">
          <Link
            to={`/leads/${company.id}`}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-bold shadow-sm hover:shadow-md"
            title="Details"
          >
            Details
          </Link>
          {company.telefon && (
            <a
              href={`tel:${company.telefon}`}
              className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-sm hover:shadow-md"
              title="Anrufen"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
          {company.email && (
            <a
              href={`mailto:${company.email}`}
              className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-all"
              title="E-Mail"
            >
              <Mail className="w-4 h-4" />
            </a>
          )}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
              title="Mehr"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showActions && (
              <div className="absolute right-0 top-full mt-2 z-50 w-60 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Schnell-Log</span>
                </div>
                <div className="p-1.5">
                  {QUICK_LOG_ACTIONS.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickLog(action)}
                      className={`w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${action.color}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 p-1.5">
                  <button
                    onClick={() => {
                      setShowActions(false);
                      window.dispatchEvent(new CustomEvent("open-task-dialog", { detail: { companyId: company.id, companyName: company.name } }));
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
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
                      className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
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