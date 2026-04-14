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
    const [me, allTasks] = await Promise.all([
      base44.auth.me(),
      base44.entities.Task.list("-created_date", 200),
    ]);
    setUser(me);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Aufgaben</h1>
          <p className="text-sm text-muted-foreground">
            {openCount} offen{overdueCount > 0 && `, ${overdueCount} überfällig`}
          </p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44">
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
              className={`bg-card border rounded-xl p-4 flex items-start gap-3 transition-all ${
                isOverdue ? "border-red-200 bg-red-50/50" : "border-border"
              }`}
            >
              <input
                type="checkbox"
                checked={task.erledigt}
                onChange={() => toggleTask(task)}
                className="w-4 h-4 rounded border-border mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-medium ${task.erledigt ? "line-through text-muted-foreground" : ""}`}>
                    {task.titel}
                  </p>
                  <PriorityBadge priority={task.prioritaet} />
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{task.typ}</span>
                </div>
                {task.company_name && (
                  <Link to={`/leads/${task.company_id}`} className="text-xs text-primary hover:underline">
                    {task.company_name}
                  </Link>
                )}
                {task.faellig_am && (
                  <div className="flex items-center gap-1 mt-1">
                    {isOverdue ? (
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                    ) : (
                      <Clock className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                      {moment(task.faellig_am).format("DD.MM.YYYY HH:mm")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Keine Aufgaben</p>
          </div>
        )}
      </div>
    </div>
  );
}