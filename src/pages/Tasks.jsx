import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PriorityBadge from "../components/PriorityBadge";
import moment from "moment";
import { toast } from "sonner";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("offen");
  const [pendingDone, setPendingDone] = useState(new Set());

  const loadData = async () => {
    const me = await base44.auth.me();
    setUser(me);

    // Organisation ermitteln
    let orgId = null;
    const orgs = await base44.entities.Organization.filter({ owner_email: me.email });
    let org = orgs?.[0] || null;
    if (!org) {
      const memberships = await base44.entities.OrganizationMember.filter({ user_email: me.email, status: "active" });
      if (memberships?.[0]?.organization_id) {
        const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
        org = memberOrgs?.[0] || null;
      }
    }
    orgId = org?.id || null;

    const allTasks = orgId
      ? await base44.entities.Task.filter({ organization_id: orgId }, "-created_date", 200)
      : [];
    setTasks(allTasks);
    setLoading(false);
  };

  const { containerRef, isRefreshing } = usePullToRefresh(loadData);

  useEffect(() => {
    loadData();
  }, []);

  const toggleTask = async (task) => {
    const nowDone = !task.erledigt;
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, erledigt: nowDone } : t));
    if (nowDone) {
      // Keep visible briefly so user sees the strikethrough before it disappears
      setPendingDone(prev => new Set([...prev, task.id]));
      setTimeout(() => {
        setPendingDone(prev => { const n = new Set(prev); n.delete(task.id); return n; });
      }, 1500);
      toast.success("Aufgabe erledigt ✓");
    }
    await base44.entities.Task.update(task.id, { erledigt: nowDone });
  };

  const isAdmin = user?.role === "admin";
  const myTasks = isAdmin ? tasks : tasks.filter(t => t.assigned_to === user?.email);

  const filtered = myTasks.filter(t => {
    if (filter === "offen") return !t.erledigt || pendingDone.has(t.id);
    if (filter === "erledigt") return t.erledigt;
    if (filter === "ueberfaellig") return !t.erledigt && t.faellig_am && moment(t.faellig_am).isBefore(moment());
    if (filter === "heute") return !t.erledigt && t.faellig_am && moment(t.faellig_am).isSame(moment(), "day");
    return true;
  }).sort((a, b) => {
    // Priorität Hoch > Mittel > Niedrig, dann nach Fälligkeit
    const prio = { Hoch: 0, Mittel: 1, Niedrig: 2 };
    if (prio[a.prioritaet] !== prio[b.prioritaet]) return prio[a.prioritaet] - prio[b.prioritaet];
    return new Date(a.faellig_am || "9999") - new Date(b.faellig_am || "9999");
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const openCount = myTasks.filter(t => !t.erledigt).length;
  const overdueCount = myTasks.filter(t => !t.erledigt && t.faellig_am && moment(t.faellig_am).isBefore(moment())).length;

  return (
    <div className="space-y-5" ref={containerRef}>
      {isRefreshing && (
        <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-2">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Aktualisieren...
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Aufgaben</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-700 mt-1">
            {openCount} offen{overdueCount > 0 && ` · ${overdueCount} überfällig`}
          </p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="offen">Offen</SelectItem>
            <SelectItem value="heute">Heute</SelectItem>
            <SelectItem value="ueberfaellig">Überfällig</SelectItem>
            <SelectItem value="erledigt">Erledigt</SelectItem>
            <SelectItem value="alle">Alle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map(task => {
          const isOverdue = !task.erledigt && task.faellig_am && moment(task.faellig_am).isBefore(moment());
          return (
            <div
              key={task.id}
              className={`bg-white border rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3 transition-all ${
                isOverdue ? "border-red-200 bg-red-50/50" : "border-[#E2E8F0]"
              }`}
            >
              <input
                type="checkbox"
                checked={task.erledigt}
                onChange={() => toggleTask(task)}
                className="w-4 h-4 rounded border-border mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  <p className={`text-sm font-medium ${task.erledigt ? "line-through text-slate-400" : "text-slate-900"}`}>
                    {task.titel}
                  </p>
                  <PriorityBadge priority={task.prioritaet} />
                  <span className="text-[9px] sm:text-[10px] font-bold bg-slate-100 text-slate-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">{task.typ}</span>
                </div>
                {task.company_name && (
                  <Link to={`/leads/${task.company_id}`} className="text-xs font-medium text-blue-600 hover:underline mt-1 block truncate">
                    {task.company_name}
                  </Link>
                )}
                {task.faellig_am && (
                  <div className="flex items-center gap-1 mt-1.5 sm:mt-2 flex-wrap">
                    {isOverdue ? (
                      <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                    ) : (
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    )}
                    <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-slate-600"}`}>
                      {moment(task.faellig_am).format("DD.MM. HH:mm")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl text-center py-16">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900">Alle Aufgaben erledigt!</p>
            <p className="text-xs font-medium text-slate-700 mt-1">Keine ausstehenden Aufgaben</p>
          </div>
        )}
      </div>
    </div>
  );
}