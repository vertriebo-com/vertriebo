import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Send, Loader2, FlaskConical, CheckCircle2, ArrowLeft, Paperclip, X, ImagePlus, Trash2 } from "lucide-react";
import ReactQuill from "react-quill";
import { toast } from "sonner";

// ─── HTML Email Builder ───────────────────────────────────────────────────────
function buildHtmlEmail({ bodyContent, subject, logoUrl }) {
  const headerLogo = logoUrl
    ? `<img src="${logoUrl}" alt="Logo" style="max-height:56px;max-width:180px;object-fit:contain;display:block;" />`
    : `<div style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1.1;">Huwa Gebäudedienste</div>
       <div style="font-size:11px;color:#93c5fd;margin-top:4px;font-weight:500;letter-spacing:0.8px;text-transform:uppercase;">Gebäudereinigung & Hausmeisterdienste</div>`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%);padding:24px 36px;">
    ${headerLogo}
  </td></tr>
  <tr><td style="background:#1d4ed8;padding:0;">
    <div style="height:3px;background:linear-gradient(90deg,#60a5fa,#a78bfa,#34d399);"></div>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:36px 40px;font-size:14px;color:#374151;line-height:1.8;">
    ${bodyContent}
  </td></tr>

  <!-- DIVIDER -->
  <tr><td style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#f8fafc;padding:22px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:top;">
        <div style="font-size:13px;font-weight:800;color:#1d4ed8;">Huwa Gebäudedienste GmbH</div>
        <div style="font-size:12px;color:#6b7280;margin-top:5px;line-height:1.9;">
          Mittelweg 24 · 56566 Neuwied<br/>
          📞 <a href="tel:026019131820" style="color:#1d4ed8;text-decoration:none;font-weight:600;">02601 / 9131820</a><br/>
          ✉️ <a href="mailto:info@huwa-gebaeudedienste.de" style="color:#1d4ed8;text-decoration:none;">info@huwa-gebaeudedienste.de</a>
        </div>
      </td>
      <td align="right" style="vertical-align:middle;">
        <div style="font-size:10px;color:#9ca3af;text-align:right;line-height:1.6;">
          Versendet über<br/><span style="color:#1d4ed8;font-weight:700;">Huwa CRM</span>
        </div>
      </td>
    </tr></table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

const SIGNATURE = `<p style="margin:28px 0 0;font-size:14px;color:#374151;">Mit freundlichen Grüßen,</p>
<p style="margin:4px 0 0;font-size:14px;font-weight:800;color:#1d4ed8;">Huwa Gebäudedienste</p>`;

const TEMPLATES = [
  {
    id: "dienstleistungen",
    label: "📋 Unsere Dienstleistungen",
    description: "Wenn jemand sagt: 'Schicken Sie uns Infos'",
    betreff: () => `Unsere Dienstleistungen – Huwa Gebäudedienste`,
    body: (c, extra) => `
<p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111827;">Sehr geehrte/r ${c.ansprechpartner || "Damen und Herren"},</p>
<p style="margin:0 0 16px;font-size:14px;color:#4b5563;">vielen Dank für Ihr Interesse! Gerne stellen wir Ihnen unsere Leistungen vor:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
  <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:18px;width:36px;">🧹</td><td style="padding:10px 0 10px 12px;border-bottom:1px solid #f3f4f6;"><div style="font-size:13px;font-weight:700;color:#111827;">Unterhaltsreinigung</div><div style="font-size:12px;color:#6b7280;">Täglich, wöchentlich oder nach Bedarf</div></td></tr>
  <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:18px;">🏢</td><td style="padding:10px 0 10px 12px;border-bottom:1px solid #f3f4f6;"><div style="font-size:13px;font-weight:700;color:#111827;">Büro- & Praxisreinigung</div><div style="font-size:12px;color:#6b7280;">Für Ihre Mitarbeiter und Kunden</div></td></tr>
  <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:18px;">🏭</td><td style="padding:10px 0 10px 12px;border-bottom:1px solid #f3f4f6;"><div style="font-size:13px;font-weight:700;color:#111827;">Hallen- & Industriereinigung</div><div style="font-size:12px;color:#6b7280;">Maschinelle Reinigung für große Flächen</div></td></tr>
  <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:18px;">✨</td><td style="padding:10px 0 10px 12px;border-bottom:1px solid #f3f4f6;"><div style="font-size:13px;font-weight:700;color:#111827;">Grundreinigung & Sonderreinigung</div><div style="font-size:12px;color:#6b7280;">Tiefenreinigung nach Renovierung oder Umzug</div></td></tr>
  <tr><td style="padding:10px 0;font-size:18px;">🔧</td><td style="padding:10px 0 10px 12px;"><div style="font-size:13px;font-weight:700;color:#111827;">Hausmeisterdienste</div><div style="font-size:12px;color:#6b7280;">Kleinreparaturen, Winterdienst, Grünpflege</div></td></tr>
</table>
${extra.notiz ? `<div style="background:#eff6ff;border-left:4px solid #1d4ed8;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;font-size:13px;color:#374151;">${extra.notiz}</div>` : ""}
<div style="background:linear-gradient(135deg,#1d4ed8,#1e40af);border-radius:12px;padding:20px;margin:0 0 20px;text-align:center;">
  <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#ffffff;">Kostenloses Angebot anfordern</p>
  <p style="margin:0;font-size:13px;color:#bfdbfe;">📞 <strong style="color:#ffffff;">02601 / 9131820</strong></p>
</div>
<p style="margin:0;font-size:14px;color:#4b5563;">Darf ich Sie kurz zurückrufen, um Ihren Bedarf zu besprechen?</p>
${SIGNATURE}`,
  },
  {
    id: "erstkontakt",
    label: "👋 Erstkontakt Follow-up",
    description: "Nach erfolglosem Anruf – schriftliche Vorstellung",
    betreff: () => `Professionelle Gebäudereinigung – Huwa Gebäudedienste Neuwied`,
    body: (c, extra) => `
<p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111827;">Sehr geehrte/r ${c.ansprechpartner || "Damen und Herren"},</p>
<p style="margin:0 0 14px;font-size:14px;color:#4b5563;">wir haben versucht Sie telefonisch zu erreichen – daher melden wir uns auf diesem Weg.</p>
<p style="margin:0 0 14px;font-size:14px;color:#4b5563;">Wir sind <strong style="color:#111827;">Huwa Gebäudedienste</strong> aus Neuwied und bieten professionelle Gebäudereinigung und Hausmeisterdienste für Gewerbe, Büros und Industrie in der Region an.</p>
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:0 0 20px;">
  <ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#4b5563;line-height:1.9;">
    <li>Zuverlässige & pünktliche Reinigungsteams</li>
    <li>Faire, transparente Preise ohne versteckte Kosten</li>
    <li>Individuelle Reinigungspläne nach Ihrem Bedarf</li>
    <li>Regionaler Anbieter – kurze Wege, schnelle Reaktion</li>
  </ul>
</div>
${extra.notiz ? `<div style="background:#eff6ff;border-left:4px solid #1d4ed8;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;font-size:13px;color:#374151;">${extra.notiz}</div>` : ""}
<p style="margin:0;font-size:14px;color:#4b5563;">Darf ich Sie kurz zurückrufen für einen unverbindlichen Termin?</p>
${SIGNATURE}`,
  },
  {
    id: "termin",
    label: "📅 Terminbestätigung",
    description: "Vereinbarten Termin schriftlich bestätigen",
    hasDatum: true, hasUhrzeit: true,
    betreff: () => `Terminbestätigung – Huwa Gebäudedienste`,
    body: (c, extra) => `
<p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111827;">Sehr geehrte/r ${c.ansprechpartner || "Damen und Herren"},</p>
<p style="margin:0 0 20px;font-size:14px;color:#4b5563;">vielen Dank für Ihr Interesse! Hiermit bestätigen wir unseren Termin:</p>
<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:12px;padding:24px;margin:0 0 20px;">
  <table cellpadding="0" cellspacing="0">
    <tr><td style="padding:6px 16px 6px 0;font-size:22px;">📅</td><td><div style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Datum</div><div style="font-size:16px;font-weight:800;color:#1e3a8a;">${extra.datum || "wird mitgeteilt"}</div></td></tr>
    <tr><td style="padding:6px 16px 6px 0;font-size:22px;">🕐</td><td><div style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Uhrzeit</div><div style="font-size:16px;font-weight:800;color:#1e3a8a;">${extra.uhrzeit ? extra.uhrzeit + " Uhr" : "wird mitgeteilt"}</div></td></tr>
    <tr><td style="padding:6px 16px 6px 0;font-size:22px;">📍</td><td><div style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Ort</div><div style="font-size:16px;font-weight:800;color:#1e3a8a;">${c.adresse ? `${c.adresse}, ${c.plz} ${c.ort}` : c.ort || "Ihr Standort"}</div></td></tr>
  </table>
</div>
${extra.notiz ? `<div style="background:#fefce8;border-left:4px solid #eab308;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;font-size:13px;color:#374151;"><strong>Hinweis:</strong> ${extra.notiz}</div>` : ""}
<p style="margin:0;font-size:14px;color:#4b5563;">Wir freuen uns auf das Gespräch! Bei Fragen: <strong>02601 / 9131820</strong></p>
${SIGNATURE}`,
  },
  {
    id: "angebot",
    label: "📊 Angebots-Nachfassung",
    description: "Nachfassen nach gestelltem Angebot",
    hasDatum: true,
    betreff: (c) => `Nachfrage zu unserem Angebot – ${c.name}`,
    body: (c, extra) => `
<p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111827;">Sehr geehrte/r ${c.ansprechpartner || "Damen und Herren"},</p>
<p style="margin:0 0 14px;font-size:14px;color:#4b5563;">wir hoffen, es geht Ihnen gut! Wir melden uns bezüglich unseres Angebots${extra.datum ? ` vom <strong>${extra.datum}</strong>` : ""}.</p>
<p style="margin:0 0 14px;font-size:14px;color:#4b5563;">Haben Sie die Möglichkeit gehabt, unser Angebot zu prüfen? Gerne beantworten wir Ihre Fragen oder passen es individuell an.</p>
${extra.notiz ? `<div style="background:#eff6ff;border-left:4px solid #1d4ed8;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;font-size:13px;color:#374151;">${extra.notiz}</div>` : ""}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:0 0 20px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">✅ Angebot ist unverbindlich & kostenlos</p>
</div>
<p style="margin:0;font-size:14px;color:#4b5563;">Wir freuen uns auf Ihre Rückmeldung!</p>
${SIGNATURE}`,
  },
  {
    id: "rueckruf",
    label: "📞 Rückruf-Bestätigung",
    description: "Vereinbarten Rückruf bestätigen",
    hasDatum: true, hasUhrzeit: true,
    betreff: () => `Rückruf-Bestätigung – Huwa Gebäudedienste`,
    body: (c, extra) => `
<p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111827;">Sehr geehrte/r ${c.ansprechpartner || "Damen und Herren"},</p>
<p style="margin:0 0 20px;font-size:14px;color:#4b5563;">vielen Dank für Ihr Interesse! Wie vereinbart, rufen wir Sie zurück:</p>
<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;padding:24px;margin:0 0 20px;text-align:center;">
  <p style="margin:0 0 4px;font-size:32px;">📞</p>
  <p style="margin:0 0 6px;font-size:12px;color:#16a34a;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Ihr Rückruf-Termin</p>
  <p style="margin:0;font-size:22px;font-weight:900;color:#15803d;">${extra.datum || "___"} · ${extra.uhrzeit ? extra.uhrzeit + " Uhr" : "___"}</p>
</div>
${extra.notiz ? `<div style="background:#fefce8;border-left:4px solid #eab308;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;font-size:13px;color:#374151;">${extra.notiz}</div>` : ""}
<p style="margin:0;font-size:14px;color:#4b5563;">Vorher erreichbar: <strong>02601 / 9131820</strong></p>
${SIGNATURE}`,
  },
];

// ─── Live Preview ─────────────────────────────────────────────────────────────
function LivePreview({ html }) {
  const iframeRef = useRef(null);
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      doc.open(); doc.write(html); doc.close();
    }
  }, [html]);
  return (
    <iframe
      ref={iframeRef}
      className="w-full border-0"
      style={{ height: "360px" }}
      title="E-Mail Vorschau"
      sandbox="allow-same-origin"
    />
  );
}

// ─── Logo Upload Widget ───────────────────────────────────────────────────────
function LogoUploader({ logoUrl, onLogoChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    // Persist to AppSettings
    const existing = await base44.entities.AppSettings.filter({ key: "email_logo_url" });
    if (existing.length > 0) {
      await base44.entities.AppSettings.update(existing[0].id, { value: file_url });
    } else {
      await base44.entities.AppSettings.create({ key: "email_logo_url", value: file_url });
    }
    onLogoChange(file_url);
    setUploading(false);
    toast.success("Logo gespeichert!");
  };

  const handleRemove = async () => {
    const existing = await base44.entities.AppSettings.filter({ key: "email_logo_url" });
    if (existing.length > 0) await base44.entities.AppSettings.update(existing[0].id, { value: "" });
    onLogoChange(null);
    toast.success("Logo entfernt");
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-xl">
      {/* Preview */}
      <div className="w-24 h-12 rounded-lg border border-border bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center overflow-hidden shrink-0">
        {logoUrl
          ? <img src={logoUrl} alt="Logo" className="max-h-10 max-w-[88px] object-contain" />
          : <span className="text-white/60 text-[10px] font-medium text-center leading-tight px-1">Kein Logo</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold mb-1">E-Mail Logo</p>
        <p className="text-[11px] text-muted-foreground">Erscheint im blauen Header aller E-Mails</p>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
          {uploading ? "..." : "Upload"}
        </button>
        {logoUrl && (
          <button onClick={handleRemove} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
    </div>
  );
}

// ─── Email Editor ─────────────────────────────────────────────────────────────
function EmailEditor({ tpl, company, logoUrl, onLogoChange, onBack, onSend }) {
  const [datum, setDatum] = useState("");
  const [uhrzeit, setUhrzeit] = useState("");
  const [notiz, setNotiz] = useState("");
  const [betreff, setBetreff] = useState(tpl.betreff(company));
  const [customBody, setCustomBody] = useState(() => tpl.body(company, {}));
  const [tab, setTab] = useState("edit");
  const [sending, setSending] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  const fullHtml = buildHtmlEmail({ bodyContent: customBody || "", subject: betreff, logoUrl });

  useEffect(() => {
    setCustomBody(tpl.body(company, { datum, uhrzeit, notiz }));
  }, [datum, uhrzeit, notiz]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAttachments(prev => [...prev, { name: file.name, url: file_url }]);
    setUploadingFile(false);
    toast.success(`Anhang "${file.name}" hinzugefügt`);
  };

  const doSend = async (toEmail, isTest = false) => {
    await base44.functions.invoke("sendBrevoEmail", {
      to: toEmail,
      subject: isTest ? `[TEST] ${betreff}` : betreff,
      body: fullHtml,
      fromName: "Huwa Gebäudedienste",
    });
  };

  const handleSend = async () => {
    setSending(true);
    await doSend(company.email);
    toast.success(`E-Mail an ${company.email} gesendet!`);
    setSending(false);
    onSend();
  };

  const handleTestSend = async () => {
    setTestSending(true);
    const me = await base44.auth.me();
    await doSend(me.email, true);
    setTestSending(false);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
    toast.success(`Test-E-Mail an ${me.email} gesendet!`);
  };

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-primary hover:underline self-start">
        <ArrowLeft className="w-3.5 h-3.5" /> Vorlage wechseln
      </button>

      {/* Logo */}
      <LogoUploader logoUrl={logoUrl} onLogoChange={onLogoChange} />

      {/* Betreff */}
      <div>
        <Label className="text-xs mb-1 block font-semibold">Betreff</Label>
        <Input value={betreff} onChange={e => setBetreff(e.target.value)} className="text-sm" />
      </div>

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

      {/* Persönliche Ergänzung */}
      <div>
        <Label className="text-xs mb-1 block">Persönliche Ergänzung (optional)</Label>
        <Input value={notiz} onChange={e => setNotiz(e.target.value)} placeholder="z.B. Bezug auf unser Gespräch..." className="text-sm" />
      </div>

      {/* Tabs */}
      <div>
        <div className="flex bg-muted rounded-xl p-1 gap-1 mb-3">
          <button onClick={() => setTab("edit")} className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${tab === "edit" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
            ✏️ Text bearbeiten
          </button>
          <button onClick={() => setTab("preview")} className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${tab === "preview" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
            👁️ Live-Vorschau
          </button>
        </div>

        {tab === "edit" ? (
          <div className="border border-input rounded-xl overflow-hidden [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-border [&_.ql-toolbar]:bg-muted/50 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-sm [&_.ql-editor]:font-sans [&_.ql-editor]:leading-relaxed">
            <ReactQuill
              theme="snow"
              value={customBody}
              onChange={setCustomBody}
              modules={{
                toolbar: [
                  ["bold", "italic", "underline"],
                  [{ list: "ordered" }, { list: "bullet" }],
                  ["link"],
                  ["clean"],
                ],
              }}
            />
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/60 px-3 py-2 border-b border-border flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-muted-foreground truncate flex-1">Von: info@huwa-gebaeudedienste.de &nbsp;|&nbsp; An: {company.email}</span>
            </div>
            <LivePreview html={fullHtml} />
          </div>
        )}
      </div>

      {/* Anhänge */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Label className="text-xs font-semibold">Anhänge</Label>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
          >
            {uploadingFile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
            {uploadingFile ? "Lädt hoch..." : "Datei hinzufügen"}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
        </div>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs">
                <Paperclip className="w-3 h-3 text-muted-foreground" />
                <span className="max-w-[120px] truncate">{a.name}</span>
                <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Mail className="w-3.5 h-3.5" />
          An: <span className="font-semibold text-foreground">{company.email}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleTestSend} disabled={testSending || testSent} className="w-full gap-2 text-xs h-9">
          {testSent ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Test gesendet!</>
           : testSending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sende Test...</>
           : <><FlaskConical className="w-3.5 h-3.5" /> Test-E-Mail an mich selbst senden</>}
        </Button>
        <Button onClick={handleSend} disabled={sending} className="w-full gap-2 h-9">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Wird gesendet..." : `An ${company.name} senden`}
        </Button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SendEmailDialog({ company }) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const hasEmail = !!company?.email;

  // Load saved logo once when dialog opens
  useEffect(() => {
    if (open && !logoLoaded) {
      base44.entities.AppSettings.filter({ key: "email_logo_url" }).then(res => {
        if (res.length > 0 && res[0].value) setLogoUrl(res[0].value);
        setLogoLoaded(true);
      });
    }
  }, [open]);

  const handleClose = () => { setOpen(false); setSelectedTemplate(null); };

  return (
    <>
      <button
        onClick={() => hasEmail ? setOpen(true) : toast.error("Keine E-Mail-Adresse hinterlegt")}
        title={hasEmail ? company.email : "Keine E-Mail vorhanden"}
        className="inline-flex items-center gap-1.5 h-8 text-xs font-medium border border-border bg-background px-3 rounded-md hover:bg-muted transition-colors"
      >
        <Mail className="w-3.5 h-3.5" /> E-Mail senden
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Mail className="w-4 h-4 text-primary" />
              E-Mail an {company.name}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1 pb-2">
            {!selectedTemplate ? (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground mb-3">Vorlage auswählen:</p>
                {TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className="w-full text-left px-4 py-3.5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <div className="font-semibold text-sm group-hover:text-primary">{tpl.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{tpl.description}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="pt-1">
                <EmailEditor
                  tpl={selectedTemplate}
                  company={company}
                  logoUrl={logoUrl}
                  onLogoChange={setLogoUrl}
                  onBack={() => setSelectedTemplate(null)}
                  onSend={handleClose}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}