import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useLeadsFilter } from "../hooks/useLeadsFilter";
import {
  ChevronLeft, ChevronRight, Calendar, ListTodo,
  Phone, Clock, Building2, CheckCircle2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment";
import "moment/locale/de";
moment.locale("de");

const DAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAYS_LONG  = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

const TASK_COLORS = {
  "Rückruf":         "bg-amber-100 text-amber-800 border-amber-300",
  "Termin":          "bg-purple-100 text-purple-800 border-purple-300",
  "Angebot erstellen":"bg-blue-100 text-blue-800 border-blue-300",
  "Nachfassen":      "bg-orange-100 text-orange-800 border-orange-300",
  "Sonstiges":       "bg-slate-100 text-slate-700 border-slate-300",
};
const TASK_DOT = {
  "Rückruf":          "bg-amber-400",
  "Termin":           "bg-purple-500",
  "Angebot erstellen":"bg-blue-500",
  "Nachfassen":       "bg-orange-400",
  "Sonstiges":        "bg-slate-400",
};

export default function CalendarView() {
  const { user, filterCompanies, loading: filterLoading } = useLeadsFilter();
  const [companies, setCompanies] = useState([]);
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);

  const [view, setView]           = useState("week"); // "week" | "month"
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null); // moment obj

  useEffect(() => {
    (async () => {
      if (!user) return;
      let org = null;
      const orgs = await base44.entities.Organization.filter({ owner_email: user.email });
      org = orgs?.[0] || null;
      if (!org) {
        const memberships = await base44.entities.OrganizationMember.filter({ user_email: user.email, status: "active" });
        if (memberships?.[0]?.organization_id) {
          const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
          org = memberOrgs?.[0] || null;
        }
      }
      if (!org) { setLoading(false); return; }
      const [comps, t] = await Promise.all([
        base44.entities.Company.filter({ organization_id: org.id }, "-created_date", 500),
        base44.entities.Task.filter({ organization_id: org.id }, "-faellig_am", 300),
      ]);
      setCompanies(comps);
      setTasks(t);
      setLoading(false);
    })();
  }, [user]);

  const myCompanies = filterCompanies(companies);
  const myTasks     = user?.role === "admin" ? tasks : tasks.filter(t => t.assigned_to === user?.email);
  const termins     = myCompanies.filter(c => c.status === "Termin");

  // --- Week helpers ---
  const startOfWeek = moment().startOf("isoWeek").add(weekOffset, "weeks");
  const weekDays    = Array.from({ length: 7 }, (_, i) => startOfWeek.clone().add(i, "days"));

  // --- Month helpers ---
  const currentMonth     = moment().startOf("month").add(monthOffset, "months");
  const startOfMonthGrid = currentMonth.clone().startOf("isoWeek");
  const endOfMonthGrid   = currentMonth.clone().endOf("month").endOf("isoWeek");
  const monthDays = [];
  let cursor = startOfMonthGrid.clone();
  while (cursor.isSameOrBefore(endOfMonthGrid, "day")) {
    monthDays.push(cursor.clone());
    cursor.add(1, "day");
  }

  const getTasksForDay = (day) => {
    const ds = day.format("YYYY-MM-DD");
    return myTasks.filter(t => t.faellig_am && moment(t.faellig_am).format("YYYY-MM-DD") === ds);
  };

  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : [];
  const selectedDayTermins = selectedDay
    ? termins.filter(c => {
        // check if any task for this company falls on selectedDay
        return myTasks.some(t =>
          t.company_id === c.id &&
          t.faellig_am &&
          moment(t.faellig_am).format("YYYY-MM-DD") === selectedDay.format("YYYY-MM-DD")
        );
      })
    : [];

  const handleGoToday = () => {
    setWeekOffset(0);
    setMonthOffset(0);
    setSelectedDay(null);
  };

  if (loading || filterLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Kalender
          </h1>
          <p className="text-sm text-muted-foreground">
            {view === "week"
              ? `KW ${startOfWeek.isoWeek()} · ${startOfWeek.format("D. MMM")} – ${startOfWeek.clone().add(6, "days").format("D. MMM YYYY")}`
              : currentMonth.format("MMMM YYYY")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 transition-colors ${view === "week" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
            >Woche</button>
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1.5 transition-colors ${view === "month" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
            >Monat</button>
          </div>
          <Button variant="outline" size="icon" onClick={() => view === "week" ? setWeekOffset(v => v - 1) : setMonthOffset(v => v - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleGoToday}>Heute</Button>
          <Button variant="outline" size="icon" onClick={() => view === "week" ? setWeekOffset(v => v + 1) : setMonthOffset(v => v + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Termin-Banner */}
      {termins.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-2">🗓 Offene Termine</p>
          <div className="flex flex-wrap gap-2">
            {termins.map(c => (
              <Link key={c.id} to={`/leads/${c.id}`}
                className="flex items-center gap-1.5 text-xs bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 hover:border-purple-400 transition-colors">
                <Building2 className="w-3 h-3 text-purple-500" />
                <span className="font-medium">{c.name}</span>
                {c.ort && <span className="text-muted-foreground">· {c.ort}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {/* Calendar Grid */}
        <div className="flex-1 min-w-0">
          {/* Day header row */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {view === "week" ? (
            /* ---- WEEK VIEW ---- */
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((day, i) => {
                const isToday    = day.isSame(moment(), "day");
                const isSelected = selectedDay?.isSame(day, "day");
                const items      = getTasksForDay(day);
                const isPast     = day.isBefore(moment(), "day");
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`rounded-xl border text-left min-h-[120px] flex flex-col transition-all
                      ${isSelected ? "border-primary ring-2 ring-primary/30 bg-primary/5" :
                        isToday   ? "border-primary bg-primary/5" :
                        isPast    ? "border-border bg-card opacity-70" :
                                    "border-border bg-card hover:border-primary/40 hover:shadow-sm"}`}
                  >
                    <div className={`px-2 py-2 text-center border-b ${isToday || isSelected ? "border-primary/20" : "border-border"}`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{DAYS_SHORT[i]}</p>
                      <p className={`text-base font-bold ${isToday || isSelected ? "text-primary" : ""}`}>{day.format("D")}</p>
                    </div>
                    <div className="flex-1 p-1.5 space-y-1 overflow-hidden">
                      {items.slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          className={`text-[10px] rounded px-1.5 py-0.5 truncate border ${TASK_COLORS[task.typ] || TASK_COLORS["Sonstiges"]}`}
                          title={task.titel}
                        >
                          {task.titel}
                        </div>
                      ))}
                      {items.length > 3 && (
                        <p className="text-[9px] text-muted-foreground px-1">+{items.length - 3} mehr</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* ---- MONTH VIEW ---- */
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((day, i) => {
                const isToday     = day.isSame(moment(), "day");
                const isSelected  = selectedDay?.isSame(day, "day");
                const isThisMonth = day.isSame(currentMonth, "month");
                const items       = getTasksForDay(day);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`rounded-lg border text-left min-h-[70px] flex flex-col transition-all p-1
                      ${isSelected ? "border-primary ring-2 ring-primary/30 bg-primary/5" :
                        isToday   ? "border-primary bg-primary/5" :
                        !isThisMonth ? "border-border/50 bg-muted/30 opacity-50" :
                                    "border-border bg-card hover:border-primary/40 hover:shadow-sm"}`}
                  >
                    <p className={`text-xs font-semibold mb-0.5 ${isToday ? "text-primary" : isThisMonth ? "" : "text-muted-foreground"}`}>
                      {day.format("D")}
                    </p>
                    <div className="flex flex-wrap gap-0.5">
                      {items.slice(0, 3).map(task => (
                        <span
                          key={task.id}
                          className={`w-2 h-2 rounded-full ${TASK_DOT[task.typ] || TASK_DOT["Sonstiges"]}`}
                          title={task.titel}
                        />
                      ))}
                      {items.length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{items.length - 3}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Day Detail Panel */}
        {selectedDay && (
          <div className="w-72 shrink-0 bg-white border border-slate-200 rounded-xl p-4 space-y-3 self-start sticky top-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{DAYS_LONG[selectedDay.isoWeekday() - 1]}</p>
                <p className="text-lg font-bold">{selectedDay.format("D. MMMM YYYY")}</p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedDayTasks.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Keine Aufgaben
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayTasks.map(task => (
                  <Link
                    key={task.id}
                    to={task.company_id ? `/leads/${task.company_id}` : "/tasks"}
                    className={`block rounded-lg border p-2.5 hover:opacity-80 transition-opacity ${TASK_COLORS[task.typ] || TASK_COLORS["Sonstiges"]}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-semibold leading-tight">{task.titel}</p>
                      {task.erledigt && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-600" />}
                    </div>
                    {task.company_name && (
                      <p className="text-[11px] opacity-70 mt-0.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {task.company_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] opacity-60 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {moment(task.faellig_am).format("HH:mm")} Uhr
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium
                        ${task.prioritaet === "Hoch" ? "bg-red-100 text-red-700 border-red-200" :
                          task.prioritaet === "Mittel" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                          "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {task.prioritaet}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <Link to="/tasks">
              <Button variant="outline" size="sm" className="w-full text-xs gap-1 mt-1">
                <ListTodo className="w-3 h-3" /> Alle Aufgaben
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-1">
        {Object.entries(TASK_COLORS).map(([typ, cls]) => (
          <span key={typ} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${cls}`}>
            <span className={`w-2 h-2 rounded-full ${TASK_DOT[typ]}`} />
            {typ}
          </span>
        ))}
      </div>
    </div>
  );
}