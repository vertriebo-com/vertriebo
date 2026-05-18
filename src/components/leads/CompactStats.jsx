import { TrendingUp, Flame, Phone, Calendar } from "lucide-react";

/**
 * CompactStats - 3-4 relevante KPIs in flacher Zeile
 * Zeigt nur wirklich wichtige Kennzahlen
 */
export default function CompactStats({ companies }) {
  const total = companies.length;
  
  // Hot Leads (Score >= 60)
  const hot = companies.filter(c => (c.priority_score || 0) >= 60).length;
  
  // Heute fällig (letzter Kontakt heute ODER Status Rückruf)
  const today = new Date().toISOString().split("T")[0];
  const todayCount = companies.filter(c => 
    (c.last_contact_date && c.last_contact_date.startsWith(today)) || 
    c.status === "Rückruf"
  ).length;
  
  // Termine
  const terminCount = companies.filter(c => c.status === "Termin").length;

  const stats = [
    { label: "Gesamt", value: total, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Heute fällig", value: todayCount, icon: Phone, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Priorisiert", value: hot, icon: Flame, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Termine", value: terminCount, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs font-semibold text-slate-600">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}