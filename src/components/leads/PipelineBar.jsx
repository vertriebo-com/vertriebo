import { TrendingUp, CheckCircle, Phone, Calendar, FileText, Award, XCircle } from "lucide-react";

const PIPELINE_STAGES = [
  { status: "Neu", icon: TrendingUp, color: "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { status: "Kontakt", icon: CheckCircle, color: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { status: "Rückruf", icon: Phone, color: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { status: "Termin", icon: Calendar, color: "bg-purple-500", text: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { status: "Angebot", icon: FileText, color: "bg-indigo-500", text: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  { status: "Gewonnen", icon: Award, color: "bg-green-500", text: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  { status: "Verloren", icon: XCircle, color: "bg-gray-500", text: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" },
];

export default function PipelineBar({ companies, activeStatus, onStatusClick }) {
  const total = companies.length;
  const counts = {};
  PIPELINE_STAGES.forEach(stage => {
    counts[stage.status] = companies.filter(c => c.status === stage.status).length;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Vertriebs-Pipeline</h3>
        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">{total} Leads</span>
      </div>
      
      {/* Status-Chips - Größer und besser lesbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PIPELINE_STAGES.map(stage => {
          const count = counts[stage.status] || 0;
          const isActive = activeStatus === stage.status;
          const Icon = stage.icon;
          
          return (
            <button
              key={stage.status}
              onClick={() => onStatusClick(isActive ? null : stage.status)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                isActive 
                  ? `${stage.bg} ${stage.border} ${stage.text} shadow-md scale-105` 
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? stage.text : "text-slate-400"}`} />
              <span className={`text-sm font-bold ${isActive ? stage.text : "text-slate-900"}`}>{count}</span>
              <span className={`text-xs font-medium ${isActive ? stage.text : "text-slate-600"}`}>{stage.status}</span>
            </button>
          );
        })}
      </div>
      
      {/* Progress Bar - Visueller */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
        {PIPELINE_STAGES.map(stage => {
          const count = counts[stage.status] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div 
              key={stage.status} 
              className={`${stage.color} transition-all duration-300`} 
              style={{ width: `${percentage}%` }}
              title={`${stage.status}: ${count}`}
            />
          );
        })}
      </div>
      
      {/* Legende */}
      <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500">
        <span>Pipeline-Verteilung</span>
        <span className="font-medium">{total > 0 ? '100%' : 'Keine Daten'}</span>
      </div>
    </div>
  );
}