import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Target, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import moment from "moment";

export default function WeeklyGoal({ user }) {
  const [contactLogs, setContactLogs] = useState([]);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goal, setGoal] = useState(user?.wochenziel_anrufe || 50);
  const [tempGoal, setTempGoal] = useState(goal);

  useEffect(() => {
    if (!user) return;
    const weekStart = moment().startOf("isoWeek").toISOString();
    (async () => {
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
      if (!org) return;
      const logs = await base44.entities.ContactLog.filter({ organization_id: org.id }, "-created_date", 500);
      const thisWeek = logs.filter(l =>
        l.typ === "Anruf" &&
        (!user || l.user_email === user.email || user.role === "admin") &&
        l.created_date >= weekStart
      );
      setContactLogs(thisWeek);
    })();
    if (user?.wochenziel_anrufe) setGoal(user.wochenziel_anrufe);
  }, [user]);

  const saveGoal = async () => {
    await base44.auth.updateMe({ wochenziel_anrufe: Number(tempGoal) });
    setGoal(Number(tempGoal));
    setEditingGoal(false);
  };

  const calls = contactLogs.length;
  const progress = goal > 0 ? Math.min(Math.round((calls / goal) * 100), 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Wochenziel Anrufe</h3>
        </div>
        {!editingGoal ? (
          <button onClick={() => { setTempGoal(goal); setEditingGoal(true); }} className="text-muted-foreground hover:text-foreground">
            <Settings className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={tempGoal}
              onChange={e => setTempGoal(e.target.value)}
              className="w-16 h-7 text-xs"
              min={1}
            />
            <Button size="sm" className="h-7 text-xs" onClick={saveGoal}>OK</Button>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 mb-2">
        <span className="text-2xl font-bold">{calls}</span>
        <span className="text-sm text-muted-foreground mb-0.5">/ {goal} Anrufe</span>
      </div>

      <div className="w-full bg-muted rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${
            progress >= 100 ? "bg-emerald-500" : progress >= 60 ? "bg-primary" : "bg-amber-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        {progress >= 100 ? "🎉 Wochenziel erreicht!" : `${goal - calls} Anrufe noch bis zum Ziel`}
      </p>
    </div>
  );
}