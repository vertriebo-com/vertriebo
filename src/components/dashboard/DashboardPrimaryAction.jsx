/**
 * DashboardPrimaryAction – "Heute zuerst" Karte
 * Zeigt den wichtigsten nächsten Schritt für den Tag.
 */
import { Link } from "react-router-dom";
import { Flame, Phone, ArrowRight, Search, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPrimaryAction({ actionableLeads = [], totalLeads = 0 }) {
  const primary = actionableLeads[0] || null;

  if (totalLeads === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">Heute zuerst</p>
            <h2 className="text-lg font-bold mb-2">Starten Sie Ihre erste Recherche</h2>
            <p className="text-sm opacity-90 mb-4">Finden Sie passende Firmenkontakte in Ihrem Suchgebiet automatisch.</p>
            <Link to="/leads">
              <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold gap-2">
                <Search className="w-4 h-4" />
                Firmen recherchieren
              </Button>
            </Link>
          </div>
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Search className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>
    );
  }

  if (!primary) {
    return (
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">Heute zuerst</p>
            <h2 className="text-lg font-bold mb-2">Alles erledigt 🎉</h2>
            <p className="text-sm opacity-90">Keine dringenden Aktionen. Nutzen Sie die Zeit für neue Recherchen.</p>
          </div>
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>
    );
  }

  const isTask = primary.type === 'task_today' || primary.type === 'task_overdue';

  const configs = {
    task_overdue: { border: "border-red-200", bg: "bg-red-50", iconBg: "bg-red-100", iconColor: "text-red-600", badgeColor: "bg-red-100 text-red-700 border-red-200", titleColor: "text-red-900", textColor: "text-red-700" },
    task_today:   { border: "border-blue-200", bg: "bg-blue-50", iconBg: "bg-blue-100", iconColor: "text-blue-600", badgeColor: "bg-blue-100 text-blue-700 border-blue-200", titleColor: "text-slate-900", textColor: "text-slate-600" },
    hot_lead:     { border: "border-orange-200", bg: "bg-orange-50", iconBg: "bg-orange-100", iconColor: "text-orange-600", badgeColor: "bg-orange-100 text-orange-700 border-orange-200", titleColor: "text-slate-900", textColor: "text-slate-600" },
    warm_lead_action: { border: "border-amber-200", bg: "bg-amber-50", iconBg: "bg-amber-100", iconColor: "text-amber-600", badgeColor: "bg-amber-100 text-amber-700 border-amber-200", titleColor: "text-slate-900", textColor: "text-slate-600" },
    callback_pending: { border: "border-violet-200", bg: "bg-violet-50", iconBg: "bg-violet-100", iconColor: "text-violet-600", badgeColor: "bg-violet-100 text-violet-700 border-violet-200", titleColor: "text-slate-900", textColor: "text-slate-600" },
    new_contactable:  { border: "border-emerald-200", bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200", titleColor: "text-slate-900", textColor: "text-slate-600" },
  };

  const labels = {
    task_overdue: "⚠ Überfällig",
    task_today: "Heute fällig",
    hot_lead: "🔥 Heißer Lead",
    warm_lead_action: "Warmer Lead",
    callback_pending: "Rückruf offen",
    new_contactable: "Jetzt kontaktieren",
  };

  const icons = { task_overdue: AlertCircle, task_today: Zap, hot_lead: Flame, warm_lead_action: Flame, callback_pending: Phone, new_contactable: ArrowRight };

  const cfg = configs[primary.type] || configs.task_today;
  const Icon = icons[primary.type] || Zap;
  const href = primary.company_id ? `/leads/${primary.company_id}` : `/tasks`;

  return (
    <div className={`border ${cfg.border} ${cfg.bg} rounded-xl p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-lg ${cfg.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
            <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Heute zuerst</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeColor}`}>
                {labels[primary.type] || primary.type}
              </span>
            </div>
            <p className={`text-base font-bold ${cfg.titleColor} truncate`}>{primary.company_name}</p>
            <p className={`text-xs mt-0.5 ${cfg.textColor}`}>
              <span className="font-semibold">{primary.action}</span>
              {primary.reason ? ` · ${primary.reason}` : ""}
            </p>
          </div>
        </div>
        <Link to={href} className="shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs border-slate-300 bg-white hover:bg-slate-50">
            <ArrowRight className="w-3.5 h-3.5" />
            {isTask ? "Aufgabe" : "Lead öffnen"}
          </Button>
        </Link>
      </div>
    </div>
  );
}