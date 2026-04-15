import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Target, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import SettingsSection from "./SettingsSection";

export default function TeamGoals({ users }) {
  const [goals, setGoals] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGoals();
  }, [users]);

  const loadGoals = async () => {
    const settings = await base44.entities.AppSettings.list();
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    const g = {};
    users.forEach(u => {
      const key = `goal_${u.email.replace(/[@.]/g, "_")}`;
      g[u.email] = {
        calls: map[key + "_calls"] || "20",
        appointments: map[key + "_appointments"] || "3",
        offers: map[key + "_offers"] || "2",
      };
    });
    setGoals(g);
  };

  const handleSave = async () => {
    setSaving(true);
    const existing = await base44.entities.AppSettings.list();
    const existingMap = {};
    existing.forEach(s => { existingMap[s.key] = s.id; });

    const toSave = {};
    users.forEach(u => {
      const key = `goal_${u.email.replace(/[@.]/g, "_")}`;
      const g = goals[u.email] || {};
      toSave[key + "_calls"] = g.calls || "20";
      toSave[key + "_appointments"] = g.appointments || "3";
      toSave[key + "_offers"] = g.offers || "2";
    });

    await Promise.all(
      Object.entries(toSave).map(([key, value]) => {
        if (existingMap[key]) {
          return base44.entities.AppSettings.update(existingMap[key], { value });
        } else {
          return base44.entities.AppSettings.create({ key, value });
        }
      })
    );
    toast.success("Wochenziele gespeichert!");
    setSaving(false);
  };

  const updateGoal = (email, field, val) => {
    setGoals(g => ({ ...g, [email]: { ...(g[email] || {}), [field]: val } }));
  };

  return (
    <SettingsSection
      icon={Target}
      title="Wochenziele pro Vertriebler"
      description="Wird im Dashboard als Fortschrittsanzeige angezeigt"
    >
      <div className="space-y-4">
        {users.map(u => (
          <div key={u.id} className="p-3 rounded-lg border border-border bg-background">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {u.full_name?.charAt(0) || u.email?.charAt(0)?.toUpperCase()}
              </div>
              <p className="text-sm font-medium">{u.full_name || u.email}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Anrufe/Woche</p>
                <Input
                  type="number"
                  value={goals[u.email]?.calls || "20"}
                  onChange={e => updateGoal(u.email, "calls", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Termine/Woche</p>
                <Input
                  type="number"
                  value={goals[u.email]?.appointments || "3"}
                  onChange={e => updateGoal(u.email, "appointments", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Angebote/Woche</p>
                <Input
                  type="number"
                  value={goals[u.email]?.offers || "2"}
                  onChange={e => updateGoal(u.email, "offers", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-muted-foreground">Keine Benutzer gefunden.</p>}
      </div>
      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Speichern..." : "Ziele speichern"}
        </Button>
      </div>
    </SettingsSection>
  );
}