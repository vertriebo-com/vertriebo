import { TrendingUp, CheckCircle, Phone, Calendar, FileText, Award, XCircle } from "lucide-react";

const PIPELINE_STAGES = [
  { status: "Neu", icon: TrendingUp, color: "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { status: "Kontakt", icon: CheckCircle, color: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { status: "Rückruf", icon: Phone, color: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { status: "Termin", icon: Calendar, color: "bg-purple-500", text: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { status: "Angebot", icon: FileText, color: "bg-indigo-500", text: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  { status: "Gewonnen", icon: Award, color: "bg-green-500", text: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  { status: "Verloren", icon: XCircle, color: "bg-gray-400", text: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
];

export default function PipelineBar({ companies, activeStatus, onStatusClick }) {
  const total = companies.length;
  const counts = {};
  PIPELINE_STAGES.forEach(stage => {
    counts[stage.status] = companies.filter(c => c.status === stage.status).length;
  });

  // Nur Stages mit Einträgen oder aktiv gefilterte zeigen
  const visibleStages = PIPELINE_STAGES.filter(s => counts[s.status] > 0 || activeStatus === s.status);

  // Wenn nur "Neu" vorhanden und kein aktiver Filter → kompakte Inline-Darstellung
  const onlyNew = visibleStages.length === 1 && visibleStages[0].status === "Neu" && !activeStatus;
  if (onlyNew) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 flex items-center gap-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pipeline</span>
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-xs font-semibold text-slate-700">{counts["Neu"]} Neu</span>
        <span className="text-xs text-slate-400 ml-auto">Noch kein Kontakt gestartet</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Pipeline</h3>
        {activeStatus && (
          <button
            onClick={() => onStatusClick(null)}
            className="text-[10px] font-semibold text-blue-600 hover:underline"
          >
            Filter aufheben
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {visibleStages.map(stage => {
          const count = counts[stage.status] || 0;
          const isActive = activeStatus === stage.status;
          const Icon = stage.icon;
          
          return (
            <button
              key={stage.status}
              onClick={() => onStatusClick(isActive ? null : stage.status)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                isActive
                  ? `${stage.bg} ${stage.border} ${stage.text} shadow-sm font-bold`
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className={`w-3 h-3 ${isActive ? stage.text : "text-slate-400"}`} />
              <span className="font-bold">{count}</span>
              <span className={isActive ? "" : "text-slate-500"}>{stage.status}</span>
            </button>
          );
        })}
        {visibleStages.length === 0 && (
          <p className="text-xs text-slate-400">Keine Leads vorhanden</p>
        )}
      </div>

      {total > 0 && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex mt-3">
          {PIPELINE_STAGES.map(stage => {
            const count = counts[stage.status] || 0;
            const pct = (count / total) * 100;
            return pct > 0 ? (
              <div
                key={stage.status}
                className={`${stage.color} transition-all duration-300`}
                style={{ width: `${pct}%` }}
                title={`${stage.status}: ${count}`}
              />
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}