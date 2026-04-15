import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Save, ChevronDown, ChevronUp, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SettingsSection from "./SettingsSection";

const DEFAULT_REPORT = {
  greeting: "Guten Morgen, {name}! Hier ist dein Tagesbericht für heute.",
  signature: "Viele Erfolge heute!\n\nDein Huwa Vertrieb-Team\nMittelweg 24 · 56566 Neuwied · 02601/9131820",
  accent_color: "#0f4cb3",
};

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
  const [report, setReport] = useState(DEFAULT_REPORT);
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

    setReport({
      greeting: map["report_greeting"] || DEFAULT_REPORT.greeting,
      signature: map["report_signature"] || DEFAULT_REPORT.signature,
      accent_color: map["report_accent_color"] || DEFAULT_REPORT.accent_color,
    });
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
    toSave["report_greeting"] = report.greeting;
    toSave["report_signature"] = report.signature;
    toSave["report_accent_color"] = report.accent_color;

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
      description="Vorlagen für Erstansprache, Nachfassen, Angebote und den Tagesbericht."
    >
      {/* Tagesbericht-Vorlage */}
      <div className="border border-primary/30 rounded-lg overflow-hidden mb-4">
        <button
          onClick={() => setExpanded(expanded === "__report" ? null : "__report")}
          className="w-full flex items-center justify-between px-4 py-3 bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Tagesbericht-Vorlage</span>
          </div>
          {expanded === "__report" ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
        </button>
        {expanded === "__report" && (
          <div className="px-4 py-4 space-y-4 border-t border-primary/20 bg-background">
            <div>
              <Label className="text-xs mb-1 block">Begrüßungstext <span className="text-muted-foreground font-normal">({"{name}"} = Vorname des Vertrieblars)</span></Label>
              <textarea
                value={report.greeting}
                onChange={e => setReport(r => ({ ...r, greeting: e.target.value }))}
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Signatur / Abschlusstext</Label>
              <textarea
                value={report.signature}
                onChange={e => setReport(r => ({ ...r, signature: e.target.value }))}
                rows={4}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Akzentfarbe (Header-Hintergrund)</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={report.accent_color}
                  onChange={e => setReport(r => ({ ...r, accent_color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border border-border"
                />
                <span className="text-sm text-muted-foreground font-mono">{report.accent_color}</span>
              </div>
            </div>
            {/* Vorschau */}
            <div>
              <Label className="text-xs mb-2 block">Vorschau</Label>
              <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, maxWidth: 480, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ background: report.accent_color, color: "white", padding: "16px 20px" }}>
                  <div style={{ fontWeight: "bold", fontSize: 16 }}>☀️ {report.greeting.replace("{name}", "Max")}</div>
                  <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4 }}>Mittwoch, 15. April 2026</div>
                </div>
                <div style={{ background: "white", padding: "16px 20px" }}>
                  <div style={{ color: "#dc2626", fontWeight: 600, marginBottom: 6 }}>🔴 Überfällige Aufgaben (2)</div>
                  <ul style={{ paddingLeft: 18, margin: "0 0 12px", color: "#374151", fontSize: 12 }}>
                    <li>Rückruf Müller GmbH – (12.04.2026)</li>
                    <li>Angebot erstellen – Schmidt AG – (13.04.2026)</li>
                  </ul>
                  <div style={{ color: "#d97706", fontWeight: 600, marginBottom: 6 }}>🟡 Heute fällig (1)</div>
                  <ul style={{ paddingLeft: 18, margin: "0 0 12px", color: "#374151", fontSize: 12 }}>
                    <li>Nachfassen – Becker Logistik</li>
                  </ul>
                  <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "12px 0" }} />
                  <div style={{ color: "#64748b", fontSize: 11, whiteSpace: "pre-line" }}>{report.signature}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
                {/* E-Mail Vorschau */}
                <div>
                  <Label className="text-xs mb-2 block">Vorschau</Label>
                  <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, maxWidth: 480, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                    {/* Header */}
                    <div style={{ background: "#0f4cb3", padding: "20px 24px" }}>
                      <div style={{ fontWeight: "bold", fontSize: 15, color: "white" }}>✉️ {t.subject.replace("{firmenname}", "Mustermann GmbH")}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>An: kontakt@mustermann-gmbh.de</div>
                    </div>
                    {/* Body */}
                    <div style={{ background: "white", padding: "20px 24px" }}>
                      <div style={{ color: "#374151", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-line" }}>
                        {t.body.replace("{firmenname}", "Mustermann GmbH")}
                      </div>
                    </div>
                    {/* Footer */}
                    <div style={{ background: "#1e293b", padding: "12px 24px" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Huwa Gebäudereinigung & Hausmeisterdienste · Mittelweg 24 · 56566 Neuwied</div>
                    </div>
                  </div>
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