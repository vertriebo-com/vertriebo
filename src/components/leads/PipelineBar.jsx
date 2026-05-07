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
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900">Pipeline</h3>
        <span className="text-xs font-medium text-slate-500">{total} Leads</span>
      </div>
      
      <div className="grid grid-cols-7 gap-1.5">
        {PIPELINE_STAGES.map(stage => {
          const Icon = stage.icon;
          const count = counts[stage.status] || 0;
          const isActive = activeStatus === stage.status;
          
          return (
            <button
              key={stage.status}
              onClick={() => onStatusClick(isActive ? null : stage.status)}
              className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                isActive ? `${stage.bg} ${stage.text} ring-2 ring-current` : "hover:bg-slate-50"
              }`}
            >
              <div className={`w-6 h-6 rounded-md ${stage.color} flex items-center justify-center mb-1`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className={`text-sm font-bold ${isActive ? stage.text : "text-slate-900"}`}>{count}</span>
              <span className="text-[9px] font-medium text-slate-500 mt-0.5">{stage.status}</span>
            </button>
          );
        })}
      </div>
      
      {/* Progress Line */}
      <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
        {PIPELINE_STAGES.map(stage => {
          const count = counts[stage.status] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={stage.status} className={`${stage.color}`} style={{ width: `${percentage}%` }} />
          );
        })}
      </div>
    </div>
  );
}