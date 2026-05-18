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

  // Nur Stats mit echten Werten anzeigen
  const stats = [
    { label: "Gesamt", value: total, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Vielversprechend", value: hot, icon: Flame, color: "text-orange-600", bg: "bg-orange-50", show: hot > 0 },
    { label: "Neu", value: neu, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", show: neu > 0 },
    { label: "In Bearbeitung", value: kontaktOffen, icon: Phone, color: "text-purple-600", bg: "bg-purple-50", show: kontaktOffen > 0 },
  ].filter(s => s.show !== false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="group flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 hover:border-slate-300 transition-all">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow`}>
                <Icon className={`w-4.5 h-4.5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-slate-900 leading-none">{stat.value}</p>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mt-0.5">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}