import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { GitBranch, Save, Plus, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import SettingsSection from "./SettingsSection";

const DEFAULT_STATUSES = ["Neu", "Kontakt", "Rückruf", "Termin", "Angebot", "Gewonnen", "Verloren"];
const DEFAULT_FOLLOWUP_DAYS = { "Rückruf": "3", "Termin": "7", "Angebot": "5" };

export default function PipelineSettings() {
  const [statuses, setStatuses] = useState(DEFAULT_STATUSES);
  const [newStatus, setNewStatus] = useState("");
  const [followupDays, setFollowupDays] = useState(DEFAULT_FOLLOWUP_DAYS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await base44.entities.AppSettings.list();
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    if (map.pipeline_statuses) {
      try { setStatuses(JSON.parse(map.pipeline_statuses)); } catch (_) {}
    }
    if (map.followup_days) {
      try { setFollowupDays(JSON.parse(map.followup_days)); } catch (_) {}
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const existing = await base44.entities.AppSettings.list();
    const existingMap = {};
    existing.forEach(s => { existingMap[s.key] = s.id; });

    const toSave = {
      pipeline_statuses: JSON.stringify(statuses),
      followup_days: JSON.stringify(followupDays),
    };

    await Promise.all(
      Object.entries(toSave).map(([key, value]) => {
        if (existingMap[key]) {
          return base44.entities.AppSettings.update(existingMap[key], { value });
        } else {
          return base44.entities.AppSettings.create({ key, value });
        }
      })
    );
    toast.success("Pipeline-Einstellungen gespeichert!");
    setSaving(false);
  };

  const STATUS_COLORS = {
    "Neu": "bg-blue-100 text-blue-700",
    "Kontakt": "bg-cyan-100 text-cyan-700",
    "Rückruf": "bg-amber-100 text-amber-700",
    "Termin": "bg-purple-100 text-purple-700",
    "Angebot": "bg-orange-100 text-orange-700",
    "Gewonnen": "bg-emerald-100 text-emerald-700",
    "Verloren": "bg-red-100 text-red-700",
  };

  return (
    <SettingsSection
      icon={GitBranch}
      title="Vertriebs-Pipeline"
      description="Status-Stufen und automatische Follow-up-Intervalle"
    >
      <div className="mb-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status-Stufen</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {statuses.map((s, i) => (
            <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s] || "bg-muted text-muted-foreground"}`}>
              <GripVertical className="w-3 h-3 opacity-40" />
              {s}
              {!["Gewonnen", "Verloren", "Neu"].includes(s) && (
                <button onClick={() => setStatuses(ss => ss.filter((_, j) => j !== i))}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Neuer Status..."
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && newStatus.trim()) {
                setStatuses(ss => [...ss.slice(0, -2), newStatus.trim(), ...ss.slice(-2)]);
                setNewStatus("");
              }
            }}
            className="flex-1 max-w-48"
          />
          <Button variant="outline" size="icon" onClick={() => {
            if (newStatus.trim()) {
              setStatuses(ss => [...ss.slice(0, -2), newStatus.trim(), ...ss.slice(-2)]);
              setNewStatus("");
            }
          }}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="mb-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Automatisches Follow-up nach (Tagen)</p>
        <div className="space-y-2">
          {Object.entries(followupDays).map(([status, days]) => (
            <div key={status} className="flex items-center gap-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-20 text-center ${STATUS_COLORS[status] || "bg-muted text-muted-foreground"}`}>
                {status}
              </span>
              <Input
                type="number"
                value={days}
                onChange={e => setFollowupDays(d => ({ ...d, [status]: e.target.value }))}
                className="w-20 h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground">Tage</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Speichern..." : "Speichern"}
        </Button>
      </div>
    </SettingsSection>
  );
}