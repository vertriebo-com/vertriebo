import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Phone, PhoneOff, PhoneCall, X } from "lucide-react";
import { toast } from "sonner";

const QUICK_ACTIONS = [
  { label: "Erreicht", ergebnis: "Erreicht", icon: Phone, color: "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
  { label: "Nicht erreicht", ergebnis: "Nicht erreicht", icon: PhoneOff, color: "text-red-700 bg-red-50 border-red-200 hover:bg-red-100" },
  { label: "Rückruf vereinbart", ergebnis: "Rückruf vereinbart", icon: PhoneCall, color: "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100" },
];

export default function QuickLogButton({ companyId, companyName, onLogged }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleQuickLog = async (e, action) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    const me = await base44.auth.me();
    await base44.entities.ContactLog.create({
      company_id: companyId,
      typ: "Anruf",
      ergebnis: action.ergebnis,
      notiz: "",
      naechster_schritt: action.ergebnis === "Rückruf vereinbart" ? "Rückruf" : "",
      user_email: me.email,
    });
    if (action.ergebnis === "Rückruf vereinbart") {
      await base44.entities.Company.update(companyId, { status: "Rückruf" });
    } else if (action.ergebnis === "Erreicht") {
      await base44.entities.Company.update(companyId, { status: "Kontakt" });
    }
    toast.success(`✓ ${action.label} für ${companyName}`);
    setLoading(false);
    setOpen(false);
    onLogged?.();
  };

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(v => !v);
  };

  return (
    <div className="relative" onClick={e => e.preventDefault()}>
      <button
        onClick={handleToggle}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-border bg-white hover:bg-muted/60 transition-colors text-muted-foreground"
      >
        <Phone className="w-3 h-3" />
        Schnell-Log
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-lg shadow-lg p-1.5 flex flex-col gap-1 min-w-[160px]">
          <div className="flex items-center justify-between px-1 pb-1 border-b border-border mb-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Anruf-Ergebnis</span>
            <button onClick={handleToggle} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.ergebnis}
              onClick={(e) => handleQuickLog(e, action)}
              disabled={loading}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${action.color}`}
            >
              <action.icon className="w-3 h-3" />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}