import { TrendingUp, CheckCircle, Phone, Calendar, FileText, Award, XCircle } from "lucide-react";

const PIPELINE_STAGES = [
  { status: "Neu", icon: TrendingUp, color: "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50" },
  { status: "Kontakt", icon: CheckCircle, color: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" },
  { status: "Rückruf", icon: Phone, color: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50" },
  { status: "Termin", icon: Calendar, color: "bg-purple-500", text: "text-purple-600", bg: "bg-purple-50" },
  { status: "Angebot", icon: FileText, color: "bg-indigo-500", text: "text-indigo-600", bg: "bg-indigo-50" },
  { status: "Gewonnen", icon: Award, color: "bg-green-500", text: "text-green-600", bg: "bg-green-50" },
  { status: "Verloren", icon: XCircle, color: "bg-gray-500", text: "text-gray-600", bg: "bg-gray-50" },
];

export default function PipelineBar({ companies, activeStatus, onStatusClick }) {
  const total = companies.length;
  const counts = {};
  PIPELINE_STAGES.forEach(stage => {
    counts[stage.status] = companies.filter(c => c.status === stage.status).length;
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Pipeline-Übersicht</h3>
        <span className="text-xs text-muted-foreground">{total} Leads gesamt</span>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {PIPELINE_STAGES.map(stage => {
          const Icon = stage.icon;
          const count = counts[stage.status] || 0;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          const isActive = activeStatus === stage.status;
          
          return (
            <button
              key={stage.status}
              onClick={() => onStatusClick(isActive ? null : stage.status)}
              className={`flex flex-col items-center p-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? `${stage.bg} ring-2 ring-current ${stage.text} shadow-md scale-105` 
                  : "hover:bg-muted/50"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg ${stage.color} flex items-center justify-center mb-2 shadow-sm`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className={`text-lg font-bold ${isActive ? stage.text : "text-foreground"}`}>
                {count}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-0.5">
                {stage.status}
              </span>
              {percentage > 0 && (
                <span className="text-[9px] text-muted-foreground mt-0.5">
                  {percentage}%
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden flex">
        {PIPELINE_STAGES.map(stage => {
          const count = counts[stage.status] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div
              key={stage.status}
              className={`${stage.color} transition-all duration-500`}
              style={{ width: `${percentage}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}