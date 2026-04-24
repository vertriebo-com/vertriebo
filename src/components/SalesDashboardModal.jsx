import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { Phone, AlertCircle, CheckCircle2, Clock, Building2, BarChart2 } from "lucide-react";
import StatusBadge from "./StatusBadge";
import moment from "moment";

export default function SalesDashboardModal({ user, open, onClose }) {
  const [companies, setCompanies] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    Promise.all([
      base44.entities.Company.filter({ assigned_to: user.email }),
      base44.entities.Task.filter({ assigned_to: user.email }),
      base44.entities.ContactLog.filter({ user_email: user.email }),
    ]).then(([c, t, l]) => {
      setCompanies(c.filter(x => !x.is_blacklisted));
      setTasks(t.sort((a, b) => new Date(a.faellig_am || 0) - new Date(b.faellig_am || 0)));
      setLogs(l.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setLoading(false);
    });
  }, [open, user]);

  if (!user) return null;

  const openTasks = tasks.filter(t => !t.erledigt);
  const overdueTasks = openTasks.filter(t => t.faellig_am && moment(t.faellig_am).isBefore(moment()));
  const todayLogs = logs.filter(l => moment(l.created_date).isSame(moment(), "day"));
  const weekLogs = logs.filter(l => moment(l.created_date).isSame(moment(), "week"));

  const statusCounts = companies.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const callbacks = companies.filter(c => c.status === "Rückruf");
  const hotLeads = companies.filter(c => c.is_hot);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p className="text-base font-bold">{user.full_name || user.email}</p>
              <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-5 mt-1">

            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Leads gesamt", value: companies.length, color: "text-primary" },
                { label: "Anrufe heute", value: todayLogs.length, color: "text-emerald-600" },
                { label: "Anrufe diese Woche", value: weekLogs.length, color: "text-blue-600" },
                { label: "Offene Aufgaben", value: openTasks.length, color: overdueTasks.length > 0 ? "text-red-500" : "text-amber-600" },
              ].map(kpi => (
                <div key={kpi.label} className="bg-card border border-border rounded-xl p-3 text-center">
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Pipeline Status */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" /> Pipeline
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <StatusBadge status={status} />
                    <span className="text-xs font-semibold">{count}</span>
                  </div>
                ))}
                {Object.keys(statusCounts).length === 0 && (
                  <p className="text-xs text-muted-foreground">Keine Leads zugewiesen</p>
                )}
              </div>
            </div>

            {/* Überfällige Aufgaben */}
            {overdueTasks.length > 0 && (
              <div className="bg-card border border-red-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-red-200 bg-red-50 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-red-700">Überfällige Aufgaben ({overdueTasks.length})</h3>
                </div>
                <div className="divide-y divide-border">
                  {overdueTasks.slice(0, 5).map(task => (
                    <div key={task.id} className="px-4 py-3 flex items-center gap-3">
                      <Clock className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.titel}</p>
                        <p className="text-xs text-red-500">{task.company_name} · fällig {moment(task.faellig_am).fromNow()}</p>
                      </div>
                      <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">{task.typ}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rückrufe */}
            {callbacks.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold">Offene Rückrufe ({callbacks.length})</h3>
                </div>
                <div className="divide-y divide-border">
                  {callbacks.slice(0, 6).map(c => (
                    <Link key={c.id} to={`/leads/${c.id}`} onClick={onClose} className="px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors block">
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.telefon || "–"}</p>
                      </div>
                      {c.last_contact_date && (
                        <span className="text-xs text-muted-foreground">{moment(c.last_contact_date).fromNow()}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Letzte Aktivität */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">Letzte Aktivitäten</h3>
              </div>
              <div className="divide-y divide-border">
                {logs.slice(0, 8).map(log => (
                  <div key={log.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.typ} – {log.ergebnis}</p>
                      {log.notiz && <p className="text-xs text-muted-foreground truncate">{log.notiz}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{moment(log.created_date).format("DD.MM. HH:mm")}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">Noch keine Aktivitäten</div>
                )}
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}