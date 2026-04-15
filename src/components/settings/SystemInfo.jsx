import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SettingsSection from "./SettingsSection";

const AUTOMATIONS = [
  { name: "Morgen-Report", desc: "Täglich 7:30 Uhr – Tagesbericht per E-Mail an alle Vertriebler", fn: "morningReport" },
  { name: "Follow-Up Agent", desc: "Täglich – automatisches Nachfassen bei inaktiven Leads", fn: "followUpAgent" },
  { name: "Priority Agent", desc: "Täglich – Leads priorisieren und bewerten", fn: "priorityAgent" },
  { name: "Cleanup Agent", desc: "Wöchentlich – alte Daten bereinigen", fn: "cleanupAgent" },
];

export default function SystemInfo() {
  const [running, setRunning] = useState(null);

  const runAgent = async (fn, name) => {
    setRunning(fn);
    try {
      await base44.functions.invoke(fn, {});
      toast.success(`${name} erfolgreich ausgeführt!`);
    } catch (e) {
      toast.error("Fehler: " + e.message);
    }
    setRunning(null);
  };

  return (
    <SettingsSection icon={Zap} title="System & Automatisierungen" description="Hintergrundprozesse manuell auslösen oder überwachen">
      <div className="space-y-2">
        {AUTOMATIONS.map(a => (
          <div key={a.fn} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
            <div>
              <p className="text-sm font-medium">{a.name}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runAgent(a.fn, a.name)}
              disabled={running === a.fn}
              className="gap-1.5 shrink-0 ml-3"
            >
              {running === a.fn
                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : <Play className="w-3.5 h-3.5" />
              }
              {running === a.fn ? "Läuft..." : "Starten"}
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
        <p>• Lead-Quelle: Google Places API (Neuwied)</p>
        <p>• Dublettencheck bei jedem Import</p>
        <p>• Blacklist-Prüfung bei allen Eingängen</p>
        <p>• Alle Zeiten in Europe/Berlin</p>
      </div>
    </SettingsSection>
  );
}