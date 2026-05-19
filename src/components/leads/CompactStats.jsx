import { Building2, Flame, Phone, Clock } from "lucide-react";
import moment from "moment";
import { isHotLead } from "@/utils/leadTemperature";

/**
 * CompactStats - echte KPIs, keine fake Werte
 * Zeigt nur was verlässlich berechnet werden kann
 */
export default function CompactStats({ companies, tasks = [] }) {
  const total = companies.length;
  
  // Vielversprechend: KANONISCHE LOGIK - isHotLead
  const vielversprechend = companies.filter(c => isHotLead(c)).length;
  
  // In Bearbeitung: aktiver Kontakt laut Status
  const inBearbeitung = companies.filter(c =>
    ["Kontakt", "Rückruf", "Termin", "Angebot"].includes(c.status)
  ).length;

  // Heute fällig: nur wenn tasks vorhanden
  const heuteFaellig = tasks.filter(t =>
    !t.erledigt && t.faellig_am && moment(t.faellig_am).isSame(moment(), 'day')
  ).length;

  const stats = [
    { label: "Leads gesamt", value: total, icon: Building2, color: "text-blue-600", bg: "bg-blue-50", show: true },
    { label: "Vielversprechend", value: vielversprechend, icon: Flame, color: "text-orange-600", bg: "bg-orange-50", show: vielversprechend > 0 },
    { label: "In Bearbeitung", value: inBearbeitung, icon: Phone, color: "text-purple-600", bg: "bg-purple-50", show: inBearbeitung > 0 },
    { label: "Heute fällig", value: heuteFaellig, icon: Clock, color: "text-red-600", bg: "bg-red-50", show: heuteFaellig > 0 },
  ].filter(s => s.show);

  // Wenn nur "Leads gesamt" sichtbar wäre → keinen eigenen Block rendern
  const meaningfulStats = stats.filter(s => s.label !== "Leads gesamt");
  if (meaningfulStats.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
      <div className={`grid gap-2 ${meaningfulStats.length === 1 ? 'grid-cols-1' : meaningfulStats.length === 2 ? 'grid-cols-2' : meaningfulStats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {meaningfulStats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <div className={`w-8 h-8 rounded-md ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900 leading-none">{stat.value}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}