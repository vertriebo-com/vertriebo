import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Send, Loader2, Eye, FlaskConical, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// ─── HTML-E-Mail-Templates ───────────────────────────────────────────────────
function buildHtmlEmail(body, subject) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);padding:32px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Huwa Gebäudedienste</div>
              <div style="font-size:13px;color:#bfdbfe;margin-top:4px;">Gebäudereinigung & Hausmeisterdienste</div>
            </td>
            <td align="right">
              <div style="width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;">🏢</div>
            </td>
          </tr>
        </table>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:36px 40px;">
        ${body}
      </td></tr>
      <!-- Divider -->
      <tr><td style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>
      <!-- Footer -->
      <tr><td style="padding:24px 40px;background:#f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="font-size:13px;font-weight:700;color:#374151;">Huwa Gebäudereinigung & Hausmeisterdienste</div>
              <div style="font-size:12px;color:#6b7280;margin-top:6px;line-height:1.6;">
                Mittelweg 24 · 56566 Neuwied<br/>
                📞 <a href="tel:026019131820" style="color:#2563eb;text-decoration:none;">02601 / 9131820</a><br/>
                ✉️ <a href="mailto:info@huwa-gebaeudedienste.de" style="color:#2563eb;text-decoration:none;">info@huwa-gebaeudedienste.de</a>
              </div>
            </td>
            <td align="right" style="vertical-align:top;">
              <div style="font-size:11px;color:#9ca3af;">Diese E-Mail wurde über<br/>Huwa Vertrieb CRM versendet.</div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

const SIGNATURE_HTML = `
<p style="margin:28px 0 0;font-size:14px;color:#374151;">Mit freundlichen Grüßen,</p>
<p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#1d4ed8;">Huwa Gebäudedienste</p>
`;

const TEMPLATES = [
  {
    id: "dienstleistungen",
    label: "📋 Unsere Dienstleistungen",
    icon: "📋",
    description: "Wenn jemand fragt: 'Schicken Sie uns mal Infos'",
    betreff: (c) => `Unsere Dienstleistungen – Huwa Gebäudedienste`,
    bodyHtml: (c, extra) => `
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">Sehr geehrte/r ${c.ansprechpartner || "Damen und Herren"},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.7;">
        vielen Dank für Ihr Interesse! Gerne stellen wir Ihnen unsere Leistungen kurz vor:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        ${[
          ["🧹","Unterhaltsreinigung","Tägliche, wöchentliche oder individuelle Reinigung Ihrer Räumlichkeiten"],
          ["🏢","Büro- & Praxisreinigung","Saubere Arbeitsumgebung für Ihre Mitarbeiter und Kunden"],
          ["🏭","Hallen- & Industriereinigung","Maschinelle Reinigung für große Flächen und Produktionsstätten"],
          ["✨","Grundreinigung & Sonderreinigung","Tiefenreinigung nach Renovierung, Umzug oder Bedarf"],
          ["🔧","Hausmeisterdienste","Kleinreparaturen, Winterdienst, Grünpflege und mehr"],
        ].map(([icon, title, desc]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;width:40px;font-size:20px;">${icon}</td>
          <td style="padding:10px 12px 10px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
            <div style="font-size:13px;font-weight:700;color:#111827;">${title}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">${desc}</div>
          </td>
        </tr>`).join("")}
      </table>
      ${extra.notiz ? `<div style="background:#eff6ff;border-left:3px solid #2563eb;padding:12px 16px;border-radius:4px;margin:0 0 20px;font-size:13px;color:#374151;">${extra.notiz}</div>` : ""}
      <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:10px;padding:20px;margin:0 0 20px;text-align:center;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1e40af;">Kostenloses Angebot anfordern</p>
        <p style="margin:0;font-size:13px;color:#3b82f6;">Rufen Sie uns an: <strong>02601 / 9131820</strong></p>
      </div>
      <p style="margin:0 0 6px;font-size:14px;color:#4b5563;line-height:1.7;">
        Darf ich Sie kurz zurückrufen, um Ihren individuellen Bedarf zu besprechen?
      </p>
      ${SIGNATURE_HTML}
    `,
  },
  {
    id: "erstkontakt",
    label: "👋 Erstkontakt Follow-up",
    icon: "👋",
    description: "Nach erfolglosem Anruf – schriftliche Vorstellung",
    betreff: (c) => `Professionelle Gebäudereinigung – Huwa Gebäudedienste Neuwied`,
    bodyHtml: (c, extra) => `
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">Sehr geehrte/r ${c.ansprechpartner || "Damen und Herren"},</p>
      <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.7;">
        wir haben versucht Sie telefonisch zu erreichen, leider ohne Erfolg – daher melden wir uns auf diesem Weg.
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.7;">
        Wir sind <strong>Huwa Gebäudedienste</strong> aus Neuwied und bieten seit Jahren professionelle Gebäudereinigung 
        und Hausmeisterdienste für Gewerbe, Büros und Industrie in der Region an.
      </p>
      ${extra.notiz ? `<div style="background:#eff6ff;border-left:3px solid #2563eb;padding:12px 16px;border-radius:4px;margin:0 0 20px;font-size:13px;color:#374151;">${extra.notiz}</div>` : ""}
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#374151;">Unsere Stärken auf einen Blick:</p>
        <ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#4b5563;line-height:1.8;">
          <li>Zuverlässige & pünktliche Reinigungsteams</li>
          <li>Faire, transparente Preise ohne versteckte Kosten</li>
          <li>Individuelle Reinigungspläne nach Ihrem Bedarf</li>
          <li>Regionaler Anbieter – kurze Wege, schnelle Reaktion</li>
        </ul>
      </div>
      <p style="margin:0 0 6px;font-size:14px;color:#4b5563;line-height:1.7;">
        Darf ich Sie kurz zurückrufen, um einen unverbindlichen Termin abzustimmen?
      </p>
      ${SIGNATURE_HTML}
    `,
  },
  {
    id: "termin_bestaetigung",
    label: "📅 Terminbestätigung",
    icon: "📅",
    description: "Vereinbarten Termin schriftlich bestätigen",
    hasDatum: true,
    hasUhrzeit: true,
    betreff: (c) => `Terminbestätigung – Huwa Gebäudedienste`,
    bodyHtml: (c, extra) => `
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">Sehr geehrte/r ${c.ansprechpartner || "Damen und Herren"},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.7;">vielen Dank für Ihr Interesse an unseren Dienstleistungen!</p>
      <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:12px;padding:24px;margin:0 0 24px;">
        <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px;">Ihr Termin</p>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 16px 6px 0;font-size:24px;">📅</td><td><div style="font-size:13px;color:#6b7280;">Datum</div><div style="font-size:15px;font-weight:700;color:#1f2937;">${extra.datum || "wird noch mitgeteilt"}</div></td></tr>
          <tr><td style="padding:6px 16px 6px 0;font-size:24px;">🕐</td><td><div style="font-size:13px;color:#6b7280;">Uhrzeit</div><div style="font-size:15px;font-weight:700;color:#1f2937;">${extra.uhrzeit ? extra.uhrzeit + " Uhr" : "wird noch mitgeteilt"}</div></td></tr>
          <tr><td style="padding:6px 16px 6px 0;font-size:24px;">📍</td><td><div style="font-size:13px;color:#6b7280;">Adresse</div><div style="font-size:15px;font-weight:700;color:#1f2937;">${c.adresse ? `${c.adresse}, ${c.plz} ${c.ort}` : c.ort || "Ihr Standort"}</div></td></tr>
        </table>
      </div>
      ${extra.notiz ? `<div style="background:#fefce8;border-left:3px solid #eab308;padding:12px 16px;border-radius:4px;margin:0 0 20px;font-size:13px;color:#374151;"><strong>Hinweis:</strong> ${extra.notiz}</div>` : ""}
      <p style="margin:0 0 6px;font-size:14px;color:#4b5563;line-height:1.7;">
        Wir freuen uns auf das Gespräch! Bei Fragen: <strong>02601 / 9131820</strong>
      </p>
      ${SIGNATURE_HTML}
    `,
  },
  {
    id: "angebot_nachfassung",
    label: "📊 Angebots-Nachfassung",
    icon: "📊",
    description: "Nachfassen nach gestelltem Angebot",
    hasDatum: true,
    betreff: (c) => `Nachfrage zu unserem Angebot – ${c.name}`,
    bodyHtml: (c, extra) => `
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">Sehr geehrte/r ${c.ansprechpartner || "Damen und Herren"},</p>
      <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.7;">
        wir hoffen, es geht Ihnen gut! Wir melden uns bezüglich unseres Angebots${extra.datum ? ` vom <strong>${extra.datum}</strong>` : ""} für Ihre Liegenschaft.
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.7;">
        Haben Sie die Möglichkeit gehabt, unser Angebot zu prüfen? Gerne beantworten wir Ihre Rückfragen 
        oder passen das Angebot noch individuell an Ihren Bedarf an.
      </p>
      ${extra.notiz ? `<div style="background:#eff6ff;border-left:3px solid #2563eb;padding:12px 16px;border-radius:4px;margin:0 0 20px;font-size:13px;color:#374151;">${extra.notiz}</div>` : ""}
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:0 0 20px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#15803d;">✅ Kein Risiko – Angebot ist unverbindlich & kostenlos</p>
      </div>
      <p style="margin:0 0 6px;font-size:14px;color:#4b5563;line-height:1.7;">Wir würden uns sehr freuen, von Ihnen zu hören.</p>
      ${SIGNATURE_HTML}
    `,
  },
  {
    id: "rueckruf",
    label: "📞 Rückruf-Bestätigung",
    icon: "📞",
    description: "Bestätigung eines vereinbarten Rückrufs",
    hasDatum: true,
    hasUhrzeit: true,
    betreff: (c) => `Rückruf-Bestätigung – Huwa Gebäudedienste`,
    bodyHtml: (c, extra) => `
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">Sehr geehrte/r ${c.ansprechpartner || "Damen und Herren"},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.7;">vielen Dank für Ihr Interesse an Huwa Gebäudedienste!</p>
      <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;padding:20px;margin:0 0 24px;text-align:center;">
        <p style="margin:0 0 8px;font-size:28px;">📞</p>
        <p style="margin:0 0 4px;font-size:13px;color:#16a34a;font-weight:700;">Wir rufen Sie zurück am</p>
        <p style="margin:0;font-size:20px;font-weight:900;color:#15803d;">${extra.datum || "___"} um ${extra.uhrzeit ? extra.uhrzeit + " Uhr" : "___"}</p>
      </div>
      ${extra.notiz ? `<div style="background:#fefce8;border-left:3px solid #eab308;padding:12px 16px;border-radius:4px;margin:0 0 20px;font-size:13px;color:#374151;">${extra.notiz}</div>` : ""}
      <p style="margin:0 0 6px;font-size:14px;color:#4b5563;line-height:1.7;">
        Falls Sie uns vorher erreichen möchten: <strong>02601 / 9131820</strong>
      </p>
      ${SIGNATURE_HTML}
    `,
  },
];

// ─── Step-Komponenten ─────────────────────────────────────────────────────────
function TemplateSelector({ onSelect }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">Welche Vorlage möchtest du verwenden?</p>
      <div className="grid gap-2">
        {TEMPLATES.map(tpl => (
          <button
            key={tpl.id}
            onClick={() => onSelect(tpl)}
            className="text-left px-4 py-3.5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <div className="font-semibold text-sm group-hover:text-primary transition-colors">{tpl.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{tpl.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function EmailEditor({ tpl, company, onSend, onBack }) {
  const [datum, setDatum] = useState("");
  const [uhrzeit, setUhrzeit] = useState("");
  const [notiz, setNotiz] = useState("");
  const [betreff, setBetreff] = useState(tpl.betreff(company));
  const [step, setStep] = useState("edit"); // edit | preview
  const [sending, setSending] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const extra = { datum, uhrzeit, notiz };
  const bodyHtml = tpl.bodyHtml(company, extra);
  const fullHtml = buildHtmlEmail(bodyHtml, betreff);

  const handleSend = async (toEmail, isTest = false) => {
    if (isTest) setTestSending(true);
    else setSending(true);

    await base44.functions.invoke("sendBrevoEmail", {
      to: toEmail,
      subject: isTest ? `[TEST] ${betreff}` : betreff,
      body: fullHtml,
      fromName: "Huwa Gebäudedienste",
    });

    if (isTest) {
      setTestSending(false);
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
      toast.success(`Test-E-Mail an ${toEmail} gesendet!`);
    } else {
      setSending(false);
      toast.success(`E-Mail an ${toEmail} gesendet!`);
      onSend();
    }
  };

  const handleTestSend = async () => {
    const me = await base44.auth.me();
    if (!me?.email) { toast.error("Keine eigene E-Mail gefunden"); return; }
    await handleSend(me.email, true);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" /> Vorlage wechseln
      </button>

      {/* Step tabs */}
      <div className="flex bg-muted rounded-xl p-1 gap-1">
        <button
          onClick={() => setStep("edit")}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${step === "edit" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          ✏️ Bearbeiten
        </button>
        <button
          onClick={() => setStep("preview")}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${step === "preview" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Eye className="w-3.5 h-3.5" /> Vorschau
        </button>
      </div>

      {step === "edit" ? (
        <div className="space-y-3">
          {/* Datum / Uhrzeit */}
          {(tpl.hasDatum || tpl.hasUhrzeit) && (
            <div className="flex gap-3">
              {tpl.hasDatum && (
                <div className="flex-1">
                  <Label className="text-xs mb-1 block">Datum</Label>
                  <Input type="date" value={datum} onChange={e => setDatum(e.target.value)} className="text-sm" />
                </div>
              )}
              {tpl.hasUhrzeit && (
                <div className="flex-1">
                  <Label className="text-xs mb-1 block">Uhrzeit</Label>
                  <Input type="time" value={uhrzeit} onChange={e => setUhrzeit(e.target.value)} className="text-sm" />
                </div>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs mb-1 block">Persönliche Notiz / Ergänzung (optional)</Label>
            <Input
              value={notiz}
              onChange={e => setNotiz(e.target.value)}
              placeholder="z.B. Bezug auf unser Gespräch von gestern..."
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-xs mb-1 block">Betreff</Label>
            <Input value={betreff} onChange={e => setBetreff(e.target.value)} className="text-sm" />
          </div>

          <div className="p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground">
            💡 Die E-Mail-Vorlage wird automatisch mit deinen Angaben befüllt. Klicke auf <strong>Vorschau</strong>, um das fertige Ergebnis zu sehen.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 border-b border-border flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-muted-foreground flex-1 text-center">E-Mail Vorschau</span>
            </div>
            <div className="bg-[#f4f6f9]">
              <div className="px-2 py-1.5 bg-white border-b border-gray-100 text-xs text-gray-500">
                <span className="font-semibold text-gray-700">Betreff: </span>{betreff}
              </div>
              <iframe
                srcDoc={fullHtml}
                className="w-full border-0"
                style={{ height: "420px" }}
                title="E-Mail Vorschau"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      {/* Send actions */}
      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Mail className="w-3.5 h-3.5" />
          Empfänger: <span className="font-semibold text-foreground">{company.email}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleTestSend}
          disabled={testSending || testSent}
          className="w-full gap-2 text-xs"
        >
          {testSent ? (
            <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Test-E-Mail gesendet!</>
          ) : testSending ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sende Test...</>
          ) : (
            <><FlaskConical className="w-3.5 h-3.5" /> Test-E-Mail an mich senden</>
          )}
        </Button>

        <Button
          onClick={() => handleSend(company.email)}
          disabled={sending}
          className="w-full gap-2"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Wird gesendet..." : `E-Mail an ${company.name} senden`}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SendEmailDialog({ company }) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const hasEmail = !!company?.email;

  const handleClose = () => {
    setOpen(false);
    setSelectedTemplate(null);
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

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              E-Mail an {company.name}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1">
            {!selectedTemplate ? (
              <TemplateSelector onSelect={setSelectedTemplate} />
            ) : (
              <EmailEditor
                tpl={selectedTemplate}
                company={company}
                onBack={() => setSelectedTemplate(null)}
                onSend={handleClose}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}