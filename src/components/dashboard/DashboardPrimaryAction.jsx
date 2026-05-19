/**
 * DashboardPrimaryAction – "Heute zuerst" Karte
 * Zeigt den wichtigsten nächsten Schritt für den Tag.
 */
import { Link } from "react-router-dom";
import { Flame, Phone, Mail, ArrowRight, Search, CheckCircle2, AlertCircle, Zap } from "lucide-react";
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

  const isOverdue = primary.type === 'task_overdue';
  const isHot = primary.type === 'hot_lead';
  const isTask = primary.type === 'task_today' || primary.type === 'task_overdue';

  const gradients = {
    task_overdue: "from-red-600 to-rose-600",
    task_today: "from-blue-600 to-blue-700",
    hot_lead: "from-orange-500 to-red-500",
    warm_lead_action: "from-amber-500 to-orange-500",
    callback_pending: "from-violet-600 to-purple-600",
    new_contactable: "from-emerald-500 to-teal-600",
  };

  const icons = {
    task_overdue: AlertCircle,
    task_today: Zap,
    hot_lead: Flame,
    warm_lead_action: Flame,
    callback_pending: Phone,
    new_contactable: ArrowRight,
  };

  const gradient = gradients[primary.type] || "from-blue-600 to-violet-600";
  const Icon = icons[primary.type] || Zap;

  const href = primary.company_id ? `/leads/${primary.company_id}` : `/tasks`;

  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-6 text-white shadow-lg`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">Heute zuerst</p>
          <h2 className="text-lg font-bold mb-1 truncate">{primary.company_name}</h2>
          <p className="text-sm opacity-90 mb-4">
            <span className="font-semibold">{primary.action}</span>
            {primary.reason ? ` · ${primary.reason}` : ""}
          </p>
          <div className="flex gap-2 flex-wrap">
            <Link to={href}>
              <Button size="sm" className="bg-white text-slate-800 hover:bg-slate-100 font-semibold gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" />
                {isTask ? "Aufgabe öffnen" : "Lead öffnen"}
              </Button>
            </Link>
          </div>
        </div>
        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  );
}