import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TEMPLATES = [
  {
    id: "termin_bestaetigung",
    label: "📅 Terminbestätigung",
    betreff: (company) => `Terminbestätigung – Huwa Gebäudedienste`,
    body: (company, extra) => `Sehr geehrte/r ${company.ansprechpartner || "Damen und Herren"},

vielen Dank für Ihr Interesse an unseren Dienstleistungen!

Hiermit bestätigen wir unseren vereinbarten Termin:

📅 Datum: ${extra.datum || "___________"}
🕐 Uhrzeit: ${extra.uhrzeit || "___________"}
📍 Adresse: ${company.adresse ? `${company.adresse}, ${company.plz} ${company.ort}` : "___________"}

${extra.notiz ? `Hinweise: ${extra.notiz}\n\n` : ""}Wir freuen uns auf das Gespräch und stehen Ihnen bei Fragen gerne zur Verfügung.

Mit freundlichen Grüßen,

Huwa Gebäudereinigung & Hausmeisterdienste
Mittelweg 24 · 56566 Neuwied
Tel: 02601/9131820
info@huwa-gebaeudedienste.de`,
  },
  {
    id: "angebot_nachfassung",
    label: "📋 Angebots-Nachfassung",
    betreff: (company) => `Nachfassung: Angebot Gebäudereinigung – ${company.name}`,
    body: (company, extra) => `Sehr geehrte/r ${company.ansprechpartner || "Damen und Herren"},

wir hoffen, es geht Ihnen gut! Wir melden uns bezüglich unseres Angebots vom ${extra.datum || "___________"}.

Haben Sie die Möglichkeit gehabt, unser Angebot zu prüfen? Gerne beantworten wir Ihre Fragen oder passen das Angebot nach Ihren Wünschen an.

${extra.notiz ? `${extra.notiz}\n\n` : ""}Wir würden uns freuen, von Ihnen zu hören.

Mit freundlichen Grüßen,

Huwa Gebäudereinigung & Hausmeisterdienste
Mittelweg 24 · 56566 Neuwied
Tel: 02601/9131820
info@huwa-gebaeudedienste.de`,
  },
  {
    id: "erstkontakt_followup",
    label: "👋 Erstkontakt Follow-up",
    betreff: (company) => `Professionelle Gebäudereinigung – Huwa Gebäudedienste Neuwied`,
    body: (company, extra) => `Sehr geehrte/r ${company.ansprechpartner || "Damen und Herren"},

mein Name ist [Ihr Name] von der Huwa Gebäudedienste aus Neuwied. Wir haben versucht Sie telefonisch zu erreichen, leider ohne Erfolg – daher melden wir uns auf diesem Weg.

Wir bieten professionelle Unterhaltsreinigung, Büroreinigung und Sonderreinigungen für Gewerbe und Industrie zu fairen Preisen an.

Unsere Leistungen:
• Unterhaltsreinigung (täglich / wöchentlich)
• Büro- & Praxisreinigung
• Hallen- & Maschinelle Reinigung
• Grundreinigung & Sonderreinigungen

${extra.notiz ? `${extra.notiz}\n\n` : ""}Darf ich Sie kurz zurückrufen, um einen Termin abzustimmen?

Mit freundlichen Grüßen,

Huwa Gebäudereinigung & Hausmeisterdienste
Mittelweg 24 · 56566 Neuwied
Tel: 02601/9131820
info@huwa-gebaeudedienste.de`,
  },
  {
    id: "rueckruf_bestaetigung",
    label: "📞 Rückruf-Bestätigung",
    betreff: (company) => `Rückruf-Bestätigung – Huwa Gebäudedienste`,
    body: (company, extra) => `Sehr geehrte/r ${company.ansprechpartner || "Damen und Herren"},

vielen Dank für Ihr Interesse! Wie besprochen, werden wir Sie am ${extra.datum || "___________"} um ${extra.uhrzeit || "___________"} Uhr zurückrufen.

${extra.notiz ? `${extra.notiz}\n\n` : ""}Falls Sie uns vorher erreichen möchten: Tel: 02601/9131820

Mit freundlichen Grüßen,

Huwa Gebäudereinigung & Hausmeisterdienste
Mittelweg 24 · 56566 Neuwied
Tel: 02601/9131820
info@huwa-gebaeudedienste.de`,
  },
];

export default function SendEmailDialog({ company }) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [datum, setDatum] = useState("");
  const [uhrzeit, setUhrzeit] = useState("");
  const [notiz, setNotiz] = useState("");
  const [betreff, setBetreff] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [sending, setSending] = useState(false);

  const hasEmail = !!company?.email;

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    const extra = { datum, uhrzeit, notiz };
    setBetreff(tpl.betreff(company));
    setBodyText(tpl.body(company, extra));
  };

  const handleExtraChange = (field, value) => {
    if (field === "datum") setDatum(value);
    if (field === "uhrzeit") setUhrzeit(value);
    if (field === "notiz") setNotiz(value);

    if (selectedTemplate) {
      const extra = {
        datum: field === "datum" ? value : datum,
        uhrzeit: field === "uhrzeit" ? value : uhrzeit,
        notiz: field === "notiz" ? value : notiz,
      };
      setBodyText(selectedTemplate.body(company, extra));
    }
  };

  const handleSend = async () => {
    if (!betreff || !bodyText) return;
    setSending(true);
    const htmlBody = bodyText.replace(/\n/g, "<br/>");
    await base44.functions.invoke("sendBrevoEmail", {
      to: company.email,
      subject: betreff,
      body: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#1f2937;">${htmlBody}</div>`,
      fromName: "Huwa Gebäudedienste",
    });
    toast.success(`E-Mail an ${company.email} gesendet!`);
    setSending(false);
    setOpen(false);
    setSelectedTemplate(null);
    setDatum(""); setUhrzeit(""); setNotiz("");
  };

  return (
    <>
      <button
        onClick={() => hasEmail ? setOpen(true) : toast.error("Keine E-Mail-Adresse hinterlegt")}
        title={hasEmail ? company.email : "Keine E-Mail-Adresse vorhanden"}
        className="inline-flex items-center gap-1.5 h-8 text-xs font-medium border border-border bg-background px-3 rounded-md hover:bg-muted transition-colors"
      >
        <Mail className="w-3.5 h-3.5" />
        E-Mail senden
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              E-Mail senden an {company.name}
            </DialogTitle>
          </DialogHeader>

          <div className="text-xs text-muted-foreground mb-3">
            Empfänger: <span className="font-medium text-foreground">{company.email}</span>
          </div>

          {/* Vorlage wählen */}
          {!selectedTemplate ? (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Vorlage wählen</Label>
              <div className="grid gap-2">
                {TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className="text-left px-4 py-3 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-xs text-primary hover:underline"
              >
                ← Vorlage wechseln
              </button>

              {/* Datum / Uhrzeit falls relevant */}
              {(selectedTemplate.id === "termin_bestaetigung" || selectedTemplate.id === "rueckruf_bestaetigung" || selectedTemplate.id === "angebot_nachfassung") && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label className="text-xs mb-1 block">Datum</Label>
                    <Input
                      type="date"
                      value={datum}
                      onChange={e => handleExtraChange("datum", e.target.value)}
                    />
                  </div>
                  {(selectedTemplate.id === "termin_bestaetigung" || selectedTemplate.id === "rueckruf_bestaetigung") && (
                    <div className="flex-1">
                      <Label className="text-xs mb-1 block">Uhrzeit</Label>
                      <Input
                        type="time"
                        value={uhrzeit}
                        onChange={e => handleExtraChange("uhrzeit", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label className="text-xs mb-1 block">Zusätzliche Notiz (optional)</Label>
                <Input
                  value={notiz}
                  onChange={e => handleExtraChange("notiz", e.target.value)}
                  placeholder="z.B. Bitte Angebot mitbringen..."
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Betreff</Label>
                <Input value={betreff} onChange={e => setBetreff(e.target.value)} />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Nachricht</Label>
                <textarea
                  value={bodyText}
                  onChange={e => setBodyText(e.target.value)}
                  rows={12}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>

              <Button onClick={handleSend} disabled={sending} className="w-full gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Wird gesendet..." : "E-Mail jetzt senden"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}