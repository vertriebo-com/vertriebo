import { Building2, Flame, Phone, CheckCircle } from "lucide-react";

/**
 * CompactStats - 3-4 relevante KPIs in flacher Zeile
 * Zeigt nur wirklich wichtige Kennzahlen
 */
export default function CompactStats({ companies }) {
  const total = companies.length;
  
  // Hot Leads (Score >= 60)
  const hot = companies.filter(c => (c.priority_score || 0) >= 60).length;
  
  // Neu (Status = Neu)
  const neu = companies.filter(c => c.status === "Neu").length;
  
  // Kontakt offen (Status = Kontakt oder Rückruf)
  const kontaktOffen = companies.filter(c => ["Kontakt", "Rückruf"].includes(c.status)).length;

  const stats = [
    { label: "Firmenkontakte", value: total, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Vielversprechend", value: hot, icon: Flame, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Neu diese Woche", value: neu, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "In Bearbeitung", value: kontaktOffen, icon: Phone, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="group flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 hover:border-slate-300 transition-all">
              <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900 leading-none">{stat.value}</p>
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mt-0.5">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}