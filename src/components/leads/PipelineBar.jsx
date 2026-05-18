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
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Pipeline</h3>
        </div>
        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">{total} Leads</span>
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
              className={`flex flex-col items-center p-2 rounded-xl transition-all cursor-pointer ${
                isActive ? `${stage.bg} ${stage.text} ring-2 ring-current shadow-sm` : "hover:bg-slate-50"
              }`}
            >
              <div className={`w-6 h-6 rounded-lg ${stage.color} flex items-center justify-center mb-1 shadow-sm`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className={`text-base font-bold ${isActive ? stage.text : "text-slate-900"}`}>{count}</span>
              <span className={`text-[9px] font-semibold ${isActive ? stage.text : "text-slate-600"} leading-none mt-0.5 text-center`}>{stage.status}</span>
            </button>
          );
        })}
      </div>
      
      {/* Progress Line */}
      <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden flex">
        {PIPELINE_STAGES.map(stage => {
          const count = counts[stage.status] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={stage.status} className={`${stage.color} transition-all`} style={{ width: `${percentage}%` }} />
          );
        })}
      </div>
    </div>
  );
}