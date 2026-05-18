import { Link } from "react-router-dom";
import { Building2, Flame, Phone, Mail, MapPin, User, Calendar, MoreHorizontal } from "lucide-react";
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
  if (status === "Rückruf") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "Termin") return "bg-purple-50 text-purple-700 border-purple-200";
  if (status === "Angebot") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (status === "Gewonnen") return "bg-green-50 text-green-700 border-green-200";
  if (status === "Verloren") return "bg-slate-50 text-slate-700 border-slate-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

export default function LeadRow({ company, isAdmin, onLogged, outcome }) {
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
    <div className="group bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer">
      {/* Mobile Layout - Stacked */}
      <div className="lg:hidden space-y-4">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
            company.is_hot ? "bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200" : "bg-gradient-to-br from-blue-50 to-blue-50 border-2 border-blue-200"
          }`}>
            {company.is_hot ? <Flame className="w-7 h-7 text-orange-600" /> : <Building2 className="w-7 h-7 text-blue-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              to={`/leads/${company.id}`}
              className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors block mb-1.5 line-clamp-2"
              title={company.name}
            >
              {company.name}
            </Link>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-sm font-medium text-slate-700">{company.branche || "Keine Branche"}</span>
              {company.ort && (
                <span className="flex items-center gap-1 text-sm font-medium text-slate-600">
                  <MapPin className="w-3.5 h-3.5" /> {company.ort}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${statusColor(company.status)}`}>
                {company.status}
              </div>
              <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${priorityColor}`}>
                {priorityLabel}
              </div>
              <OutcomeBadge outcome={outcome} />
            </div>
          </div>
        </div>

        {/* Kontakt + Aktionen */}
        <div className="flex items-center justify-between pt-2">
          {company.telefon && (
            <a href={`tel:${company.telefon}`} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Phone className="w-4 h-4 text-emerald-600" />
              {company.telefon}
            </a>
          )}
          <div className="flex items-center gap-2">
            <Link
              to={`/leads/${company.id}`}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm"
            >
              Details
            </Link>
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-slate-700 hover:bg-slate-50"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Horizontal */}
      <div className="hidden lg:flex items-center gap-5">
        {/* Company Info - Left */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
            company.is_hot ? "bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200" : "bg-gradient-to-br from-blue-50 to-blue-50 border-2 border-blue-200"
          }`}>
            {company.is_hot ? <Flame className="w-7 h-7 text-orange-600" /> : <Building2 className="w-7 h-7 text-blue-600" />}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              to={`/leads/${company.id}`}
              className="text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors block mb-1.5 line-clamp-2"
              title={company.name}
            >
              {company.name}
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-slate-700">{company.branche || "Keine Branche"}</span>
              {company.ort && (
                <span className="flex items-center gap-1 text-sm font-medium text-slate-600">
                  <MapPin className="w-3.5 h-3.5" /> {company.ort}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="hidden lg:flex items-center gap-6 min-w-[200px]">
          {company.telefon ? (
            <a href={`tel:${company.telefon}`} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors group/contact">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center group-hover/contact:bg-emerald-100 transition-colors">
                <Phone className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="truncate">{company.telefon}</span>
            </a>
          ) : (
            <span className="text-sm font-medium text-slate-400">–</span>
          )}
        </div>

        {/* Status & Priority & Outcome */}
        <div className="hidden md:flex items-center gap-2 flex-wrap min-w-[200px]">
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${statusColor(company.status)}`}>
            {company.status}
          </div>
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${priorityColor}`}>
            {priorityLabel}
          </div>
          <OutcomeBadge outcome={outcome} />
        </div>

        {/* Vertriebler */}
        <div className="hidden lg:flex items-center min-w-[140px]">
          {company.assigned_to ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{company.assigned_to.split("@")[0]}</p>
                <p className="text-[9px] text-slate-500 truncate">{company.assigned_to}</p>
              </div>
            </div>
          ) : (
            <span className="text-xs font-medium text-slate-400 italic">Nicht zugewiesen</span>
          )}
        </div>

        {/* Actions */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <Link
              to={`/leads/${company.id}`}
              className="px-4 py-2 rounded-lg bg-blue-600 border border-blue-700 text-white hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm"
              title="Details"
            >
              Details
            </Link>
            {company.telefon && (
              <a
                href={`tel:${company.telefon}`}
                className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:shadow-sm transition-all"
                title="Anrufen"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            {company.email && (
              <a
                href={`mailto:${company.email}`}
                className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 hover:shadow-sm transition-all"
                title="E-Mail"
              >
                <Mail className="w-4 h-4" />
              </a>
            )}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                title="Mehr"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showActions && (
                <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#E2E8F0] bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Schnell-Log</span>
                  </div>
                  <div className="p-1.5">
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
                  <div className="border-t border-[#E2E8F0] p-1.5">
                    <button
                      onClick={() => {
                        setShowActions(false);
                        window.dispatchEvent(new CustomEvent("open-task-dialog", { detail: { companyId: company.id, companyName: company.name } }));
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
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
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
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