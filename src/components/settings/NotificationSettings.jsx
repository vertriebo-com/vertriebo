import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SettingsSection from "./SettingsSection";

export default function NotificationSettings({ users }) {
  const [reportTime, setReportTime] = useState("07:30");
  const [reportEnabled, setReportEnabled] = useState(true);
  const [reportRecipients, setReportRecipients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await base44.entities.AppSettings.list();
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    if (map.report_time) setReportTime(map.report_time);
    if (map.report_enabled !== undefined) setReportEnabled(map.report_enabled !== "false");
    if (map.report_recipients) {
      try { setReportRecipients(JSON.parse(map.report_recipients)); } catch (_) {}
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const existing = await base44.entities.AppSettings.list();
    const existingMap = {};
    existing.forEach(s => { existingMap[s.key] = s.id; });

    const toSave = {
      report_time: reportTime,
      report_enabled: String(reportEnabled),
      report_recipients: JSON.stringify(reportRecipients),
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
    toast.success("Benachrichtigungseinstellungen gespeichert!");
    setSaving(false);
  };

  const handleTestReport = async () => {
    setTestSending(true);
    try {
      await base44.functions.invoke("morningReport", {});
      toast.success("Test-Report gesendet!");
    } catch (e) {
      toast.error("Fehler: " + e.message);
    }
    setTestSending(false);
  };

  const toggleRecipient = (email) => {
    setReportRecipients(r =>
      r.includes(email) ? r.filter(e => e !== email) : [...r, email]
    );
  };

  return (
    <SettingsSection
      icon={Bell}
      title="Benachrichtigungen & Tagesbericht"
      description="Wer bekommt wann welche automatischen E-Mails"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
          <div>
            <p className="text-sm font-medium">Tagesbericht aktiviert</p>
            <p className="text-xs text-muted-foreground">Täglich morgens an alle Vertriebler</p>
          </div>
          <button
            onClick={() => setReportEnabled(e => !e)}
            className={`w-11 h-6 rounded-full transition-colors ${reportEnabled ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`block w-4 h-4 rounded-full bg-white shadow mx-1 transition-transform ${reportEnabled ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        {reportEnabled && (
          <>
            <div>
              <Label className="text-xs mb-1 block">Uhrzeit Tagesbericht</Label>
              <Input
                type="time"
                value={reportTime}
                onChange={e => setReportTime(e.target.value)}
                className="w-36"
              />
            </div>

            <div>
              <p className="text-xs font-medium mb-2">Bericht-Empfänger</p>
              <div className="space-y-2">
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportRecipients.length === 0 || reportRecipients.includes(u.email)}
                      onChange={() => toggleRecipient(u.email)}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <p className="text-sm font-medium">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Wenn keiner ausgewählt, erhalten alle einen Bericht.</p>
            </div>
          </>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Speichern..." : "Speichern"}
          </Button>
          <Button onClick={handleTestReport} disabled={testSending} className="gap-2">
            <Send className="w-4 h-4" />
            {testSending ? "Sende..." : "Test-Report jetzt senden"}
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
}