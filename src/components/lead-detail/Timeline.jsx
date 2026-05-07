import { useState } from "react";
import moment from "moment";
import { Target, Lightbulb, Plus, PhoneCall, Phone, Mail, Sparkles, CheckCircle2, Circle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LeadDetailTimeline({ company, tasks, contactLogs, onToggleTask, onAddTask, onAddLog, onShowKiDialog }) {
  const openTasks = tasks.filter(t => !t.erledigt);
  const doneTasks = tasks.filter(t => t.erledigt);

  const ERGEBNIS_STYLES = {
    "Erreicht": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Nicht erreicht": "bg-red-50 text-red-600 border-red-200",
    "Rückruf vereinbart": "bg-amber-50 text-amber-700 border-amber-200",
    "Termin vereinbart": "bg-purple-50 text-purple-700 border-purple-200",
    "Angebot gesendet": "bg-blue-50 text-blue-700 border-blue-200",
    "Abgeschlossen": "bg-gray-50 text-gray-600 border-gray-200",
    "Kein Interesse": "bg-red-50 text-red-500 border-red-200",
  };

  const TYP_ICONS = {
    "Anruf": "📞",
    "E-Mail": "✉️",
    "Besuch": "🚶",
    "Termin": "📅",
    "Angebot": "📄",
    "Sonstiges": "💬",
  };

  return (
    <div className="space-y-5">
      
      {/* Nächste Aktionen + KI-Vorschlag */}
      <div className="grid sm:grid-cols-2 gap-5">
        {/* Nächste Aktionen */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 flex items-center gap-2 mb-4">
            <Target className="w-3.5 h-3.5" /> Nächste Aktionen
          </h3>
          <div className="space-y-3">
            {openTasks.length > 0 ? (
              openTasks.slice(0, 3).map(task => {
                const isOverdue = task.faellig_am && moment(task.faellig_am).isBefore(moment());
                return (
                  <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isOverdue ? "bg-red-50 border-red-200" : "bg-slate-50 border-[#E2E8F0]"}`}>
                    <button onClick={() => onToggleTask(task)} className="flex-shrink-0">
                      {task.erledigt
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <Circle className={`w-5 h-5 ${isOverdue ? "text-red-500" : "text-slate-400"}`} />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isOverdue ? "text-red-900" : "text-slate-900"}`}>{task.titel}</p>
                      {task.faellig_am && (
                        <p className={`text-xs ${isOverdue ? "text-red-600 font-bold" : "text-slate-500"}`}>
                          {isOverdue ? "Überfällig: " : ""}{moment(task.faellig_am).format("DD.MM.")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-900">Alle Aufgaben erledigt!</p>
                <p className="text-xs text-slate-500 mt-0.5">Keine offenen Aufgaben</p>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onAddTask(true)} className="w-full mt-3 gap-1.5 bg-white border border-[#E2E8F0] text-slate-700">
            <Plus className="w-3.5 h-3.5" /> Neue Aufgabe
          </Button>
        </div>

        {/* KI-Vorschlag */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 flex items-center gap-2 mb-4">
            <Lightbulb className="w-3.5 h-3.5" /> KI-Empfehlung
          </h3>
          <div className={`flex flex-col gap-3 p-4 rounded-lg border ${company.status === "Neu" ? "text-blue-600 bg-blue-50 border-blue-200" : "text-slate-600 bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center gap-2">
              {company.status === "Neu" ? <PhoneCall className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />}
              <span className="text-sm font-bold">
                {company.status === "Neu" ? "Erstkontakt herstellen" : "Weiterhin beobachten"}
              </span>
            </div>
            <p className="text-xs leading-relaxed">
              {company.status === "Neu" 
                ? "Rufen Sie heute an und stellen Sie Ihr Unternehmen vor. Nutzen Sie den Branchen-Einstieg."
                : "Kein dringender Handlungsbedarf. Lead im Auge behalten."}
            </p>
            {company.status === "Neu" && company.telefon && (
              <a href={`tel:${company.telefon}`} className="text-center text-xs font-bold bg-white border border-current px-3 py-1.5 rounded hover:bg-slate-50 transition-colors">
                📞 Anrufen
              </a>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onShowKiDialog()} className="w-full mt-3 gap-1.5 bg-white border border-[#E2E8F0] text-slate-700">
            <Sparkles className="w-3.5 h-3.5" /> Alle KI-Tipps
          </Button>
        </div>
      </div>

      {/* Kontakthistorie */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Kontakthistorie</h3>
            {contactLogs.length > 0 && (
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{contactLogs.length}</span>
            )}
          </div>
          <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8 bg-white border border-[#E2E8F0]" onClick={() => onAddLog(true)}>
            <Plus className="w-3 h-3" /> Kontakt
          </Button>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {contactLogs.map((log) => (
            <div key={log.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-base">
                  {TYP_ICONS[log.typ] || "💬"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{log.typ}</span>
                      {log.ergebnis && (
                        <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${ERGEBNIS_STYLES[log.ergebnis] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {log.ergebnis}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">{moment(log.created_date).format("DD.MM.YY HH:mm")}</span>
                  </div>
                  {log.notiz && <p className="text-sm text-slate-900 mt-1.5 leading-relaxed">{log.notiz}</p>}
                  {log.naechster_schritt && (
                    <p className="text-xs font-medium text-slate-600 mt-1 flex items-center gap-1">
                      → {log.naechster_schritt}
                    </p>
                  )}
                  {log.user_email && <p className="text-[10px] text-slate-500 mt-1.5">{log.user_email}</p>}
                </div>
              </div>
            </div>
          ))}
          {contactLogs.length === 0 && (
            <div className="px-5 py-10 text-center">
              <PhoneCall className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-600">Noch kein Kontakt dokumentiert</p>
              <button onClick={() => onAddLog(true)} className="mt-2 text-xs font-semibold text-blue-600 hover:underline">Kontakt hinzufügen</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}