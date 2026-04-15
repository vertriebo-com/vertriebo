import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Save, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SettingsSection from "./SettingsSection";

const DEFAULT_TEMPLATES = [
  {
    key: "email_erstansprache",
    label: "Erstansprache",
    subject: "Professionelle Gebäudereinigung für {firmenname}",
    body: "Sehr geehrte Damen und Herren,\n\nmein Name ist [IHR NAME] von Huwa Gebäudereinigung & Hausmeisterdienste aus Neuwied.\n\nWir sind auf professionelle Unterhalts- und Sonderreinigung spezialisiert und betreuen bereits zahlreiche Unternehmen in Ihrer Region.\n\nGerne würden wir Ihnen ein kostenloses und unverbindliches Angebot unterbreiten.\n\nDarf ich Sie kurz anrufen?\n\nMit freundlichen Grüßen\n[IHR NAME]\nHuwa Gebäudereinigung & Hausmeisterdienste\nTel: 02601/9131820",
  },
  {
    key: "email_nachfassen",
    label: "Nachfassen",
    subject: "Nochmals: Reinigungsangebot für {firmenname}",
    body: "Sehr geehrte Damen und Herren,\n\nvor einiger Zeit habe ich Ihnen unser Reinigungsangebot vorgestellt. Gerne würde ich nachhaken, ob Sie Interesse haben.\n\nWir bieten flexible Lösungen – vom kleinen Büro bis zur großen Industriehalle.\n\nBei Fragen stehe ich gerne zur Verfügung.\n\nMit freundlichen Grüßen\n[IHR NAME]\nHuwa Gebäudereinigung & Hausmeisterdienste\nTel: 02601/9131820",
  },
  {
    key: "email_angebot",
    label: "Angebot Bestätigung",
    subject: "Ihr Reinigungsangebot von Huwa",
    body: "Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihr Interesse an unseren Dienstleistungen.\n\nIm Anhang finden Sie unser maßgeschneidertes Angebot für {firmenname}.\n\nGerne besprechen wir alle Details in einem persönlichen Gespräch.\n\nMit freundlichen Grüßen\n[IHR NAME]\nHuwa Gebäudereinigung & Hausmeisterdienste\nTel: 02601/9131820",
  },
];

export default function EmailTemplateSettings() {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await base44.entities.AppSettings.list();
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });

    setTemplates(DEFAULT_TEMPLATES.map(t => ({
      ...t,
      subject: map[t.key + "_subject"] || t.subject,
      body: map[t.key + "_body"] || t.body,
    })));
  };

  const handleSave = async () => {
    setSaving(true);
    const existing = await base44.entities.AppSettings.list();
    const existingMap = {};
    existing.forEach(s => { existingMap[s.key] = s.id; });

    const toSave = {};
    templates.forEach(t => {
      toSave[t.key + "_subject"] = t.subject;
      toSave[t.key + "_body"] = t.body;
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
    toast.success("E-Mail-Vorlagen gespeichert!");
    setSaving(false);
  };

  const updateTemplate = (key, field, val) => {
    setTemplates(ts => ts.map(t => t.key === key ? { ...t, [field]: val } : t));
  };

  return (
    <SettingsSection
      icon={Mail}
      title="E-Mail-Vorlagen"
      description="Vorlagen für Erstansprache, Nachfassen und Angebote. {firmenname} wird automatisch ersetzt."
    >
      <div className="space-y-3">
        {templates.map(t => (
          <div key={t.key} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === t.key ? null : t.key)}
              className="w-full flex items-center justify-between px-4 py-3 bg-background hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{t.label}</span>
              </div>
              {expanded === t.key ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {expanded === t.key && (
              <div className="px-4 py-3 space-y-3 border-t border-border">
                <div>
                  <Label className="text-xs mb-1 block">Betreff</Label>
                  <Input
                    value={t.subject}
                    onChange={e => updateTemplate(t.key, "subject", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Text</Label>
                  <textarea
                    value={t.body}
                    onChange={e => updateTemplate(t.key, "body", e.target.value)}
                    rows={8}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Speichern..." : "Alle Vorlagen speichern"}
        </Button>
      </div>
    </SettingsSection>
  );
}