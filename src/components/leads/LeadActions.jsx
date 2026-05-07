import { Phone, Mail, MessageSquare, Calendar, ChevronRight, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import StatusBadge from "../StatusBadge";
import PriorityBadge from "../PriorityBadge";
import { Link } from "react-router-dom";

const QUICK_LOG_OPTIONS = [
  { label: "Nicht erreicht", ergebnis: "Nicht erreicht", status: "Rückruf", icon: "📞", color: "text-red-700 bg-red-50 hover:bg-red-100" },
  { label: "Erreicht", ergebnis: "Erreicht", status: "Kontakt", icon: "✓", color: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" },
  { label: "Rückruf vereinbart", ergebnis: "Rückruf vereinbart", status: "Rückruf", icon: "🔄", color: "text-amber-700 bg-amber-50 hover:bg-amber-100" },
  { label: "Termin vereinbart", ergebnis: "Termin vereinbart", status: "Termin", icon: "📅", color: "text-purple-700 bg-purple-50 hover:bg-purple-100" },
  { label: "Angebot senden", ergebnis: "Angebot gesendet", status: "Angebot", icon: "📄", color: "text-blue-700 bg-blue-50 hover:bg-blue-100" },
  { label: "Kein Interesse", ergebnis: "Kein Interesse", status: "Verloren", icon: "✗", color: "text-gray-700 bg-gray-50 hover:bg-gray-100" },
];

export default function LeadActions({ company, onLogged, isAdmin }) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleQuickLog = async (option) => {
    const me = await base44.auth.me();
    await base44.entities.ContactLog.create({
      company_id: company.id,
      typ: "Anruf",
      ergebnis: option.ergebnis,
      notiz: "",
      naechster_schritt: option.ergebnis,
      user_email: me.email,
    });
    await base44.entities.Company.update(company.id, {
      status: option.status,
      last_contact_date: new Date().toISOString(),
    });
    toast.success(`${company.name}: ${option.label}`);
    setShowDropdown(false);
    onLogged?.();
  };

  return (
    <div className="flex items-center gap-1.5">
      <Link
        to={`/leads/${company.id}`}
        className="p-2 rounded-lg bg-muted/50 border border-border/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
        title="Details"
      >
        <ChevronRight className="w-4 h-4" />
      </Link>
      {company.telefon && (
        <a
          href={`tel:${company.telefon}`}
          className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-colors"
          title="Anrufen"
        >
          <Phone className="w-4 h-4" />
        </a>
      )}
      {company.email && (
        <a
          href={`mailto:${company.email}`}
          className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
          title="E-Mail"
        >
          <Mail className="w-4 h-4" />
        </a>
      )}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 rounded-lg bg-muted/50 border border-border/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          title="Schnell-Log"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-border rounded-xl shadow-lg p-1.5 min-w-[180px]">
            <div className="px-2 py-1.5 border-b border-border mb-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Kontakt-Ergebnis</span>
            </div>
            {QUICK_LOG_OPTIONS.map(option => (
              <button
                key={option.ergebnis}
                onClick={() => handleQuickLog(option)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${option.color}`}
              >
                <span className="text-base">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
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
          className="p-2 rounded-lg bg-muted/50 border border-border/50 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Löschen"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}