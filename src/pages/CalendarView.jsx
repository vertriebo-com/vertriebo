import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useLeadsFilter } from "../hooks/useLeadsFilter";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "../components/StatusBadge";
import moment from "moment";
import "moment/locale/de";
moment.locale("de");

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default function CalendarView() {
  const { user, filterCompanies, loading: filterLoading } = useLeadsFilter();
  const [companies, setCompanies] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Company.list("-created_date", 500),
      base44.entities.Task.list("-faellig_am", 200),
    ]).then(([comps, t]) => {
      setCompanies(comps);
      setTasks(t);
      setLoading(false);
    });
  }, []);

  const startOfWeek = moment().startOf("isoWeek").add(weekOffset, "weeks");

  const days = Array.from({ length: 7 }, (_, i) => startOfWeek.clone().add(i, "days"));

  const myCompanies = filterCompanies(companies);
  const myTasks = user?.role === "admin" ? tasks : tasks.filter(t => t.assigned_to === user?.email);

  const termins = myCompanies.filter(c => c.status === "Termin");

  const getItemsForDay = (day) => {
    const dayStr = day.format("YYYY-MM-DD");
    const dayTasks = myTasks.filter(t =>
      t.faellig_am && moment(t.faellig_am).format("YYYY-MM-DD") === dayStr && !t.erledigt
    );
    // Add Termin-companies that have a task on this day
    return dayTasks;
  };

  if (loading || filterLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Terminkalender
          </h1>
          <p className="text-sm text-muted-foreground">
            KW {startOfWeek.isoWeek()} · {startOfWeek.format("D. MMM")} – {startOfWeek.clone().add(6, "days").format("D. MMM YYYY")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(v => v - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Heute</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(v => v + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Open Termin leads */}
      {termins.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-2">🗓 Leads mit Status "Termin"</p>
          <div className="flex flex-wrap gap-2">
            {termins.map(c => (
              <Link key={c.id} to={`/leads/${c.id}`} className="flex items-center gap-1.5 text-xs bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 hover:border-purple-400 transition-colors">
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground">· {c.ort}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const isToday = day.isSame(moment(), "day");
          const items = getItemsForDay(day);
          return (
            <div key={i} className={`rounded-xl border ${isToday ? "border-primary bg-primary/5" : "border-border bg-card"} min-h-[140px] flex flex-col`}>
              <div className={`px-2 py-2 text-center border-b ${isToday ? "border-primary/20" : "border-border"}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{DAYS[i]}</p>
                <p className={`text-base font-bold ${isToday ? "text-primary" : ""}`}>{day.format("D")}</p>
              </div>
              <div className="flex-1 p-1.5 space-y-1 overflow-hidden">
                {items.slice(0, 4).map(task => (
                  <Link
                    key={task.id}
                    to={task.company_id ? `/leads/${task.company_id}` : "/tasks"}
                    className="block text-[10px] bg-primary/10 text-primary rounded px-1.5 py-1 truncate hover:bg-primary/20 transition-colors"
                    title={task.titel}
                  >
                    {task.titel}
                  </Link>
                ))}
                {items.length > 4 && (
                  <p className="text-[9px] text-muted-foreground px-1">+{items.length - 4} mehr</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}