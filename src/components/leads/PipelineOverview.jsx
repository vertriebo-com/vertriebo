import { Building2, Flame, Phone, Mail, MapPin, TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const STATUS_CONFIG = {
  "Neu": { color: "bg-blue-50 text-blue-700 border-blue-200", icon: AlertCircle },
  "Kontakt": { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  "Rückruf": { color: "bg-amber-50 text-amber-700 border-amber-200", icon: Phone },
  "Termin": { color: "bg-purple-50 text-purple-700 border-purple-200", icon: Clock },
  "Angebot": { color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: TrendingUp },
  "Gewonnen": { color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  "Verloren": { color: "bg-gray-50 text-gray-600 border-gray-200", icon: AlertCircle },
};

export default function PipelineOverview({ companies, onStatusClick, activeStatus }) {
  const stats = {
    "Neu": 0, "Kontakt": 0, "Rückruf": 0, "Termin": 0, "Angebot": 0, "Gewonnen": 0, "Verloren": 0,
  };
  companies.forEach(c => { if (stats[c.status] !== undefined) stats[c.status]++; });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {Object.entries(stats).map(([status, count]) => {
        const config = STATUS_CONFIG[status];
        const Icon = config.icon;
        const isActive = activeStatus === status;
        return (
          <button
            key={status}
            onClick={() => onStatusClick(isActive ? null : status)}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
              isActive
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${config.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-foreground">{count}</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{status}</span>
          </button>
        );
      })}
    </div>
  );
}