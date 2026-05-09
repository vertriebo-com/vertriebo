import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Send, Loader2, FlaskConical, CheckCircle2, ArrowLeft, Paperclip, X, ImagePlus, Trash2 } from "lucide-react";
import ReactQuill from "react-quill";
import { toast } from "sonner";
import { TEMPLATES, dbTemplateToRuntimeTemplate, buildSignature } from "./emailTemplates";

// ─── HTML Email Builder ───────────────────────────────────────────────────────
function buildHtmlEmail({ bodyContent, subject, logoUrl, senderName }) {
  const displayName = senderName || "Vertriebo";
  const headerLogo = logoUrl
    ? `<img src="${logoUrl}" alt="Logo" style="max-height:60px;max-width:200px;object-fit:contain;display:block;" />`
    : `<div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1.1;">${displayName}</div>`;

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
  <tr><td style="background:linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%);padding:22px 36px;">
    ${headerLogo}
  </td></tr>
  <tr><td style="background:#1d4ed8;padding:0;">
    <div style="height:3px;background:linear-gradient(90deg,#60a5fa,#a78bfa,#34d399);"></div>
  </td></tr>
  <tr><td style="padding:36px 40px;font-size:14px;color:#374151;line-height:1.8;">
    ${bodyContent}
  </td></tr>
  <tr><td style="background:#f8fafc;padding:18px 40px;border-top:1px solid #e5e7eb;">
    <div style="font-size:11px;color:#9ca3af;text-align:center;">Versendet über <span style="color:#1d4ed8;font-weight:700;">Vertriebo CRM</span></div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

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
      className="w-full border-0 rounded-b-xl"
      style={{ height: "380px" }}
      title="E-Mail Vorschau"
      sandbox="allow-same-origin"
    />
  );
}

// ─── Logo Upload Widget ───────────────────────────────────────────────────────
function LogoUploader({ logoUrl, orgId, onLogoChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const existing = await base44.entities.OrganizationSettings.filter({ organization_id: orgId, key: "email_logo_url" });
    if (existing.length > 0) {
      await base44.entities.OrganizationSettings.update(existing[0].id, { value: file_url });
    } else {
      await base44.entities.OrganizationSettings.create({ organization_id: orgId, key: "email_logo_url", value: file_url });
    }
    onLogoChange(file_url);
    setUploading(false);
    toast.success("Logo gespeichert!");
  };

  const handleRemove = async () => {
    const existing = await base44.entities.OrganizationSettings.filter({ organization_id: orgId, key: "email_logo_url" });
    if (existing.length > 0) await base44.entities.OrganizationSettings.update(existing[0].id, { value: "" });
    onLogoChange(null);
    toast.success("Logo entfernt");
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
      <div className="w-24 h-12 rounded-lg border border-slate-200 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center overflow-hidden shrink-0">
        {logoUrl
          ? <img src={logoUrl} alt="Logo" className="max-h-10 max-w-[88px] object-contain" />
          : <span className="text-white/60 text-[10px] font-medium text-center leading-tight px-1">Kein Logo</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-900 mb-0.5">E-Mail Logo</p>
        <p className="text-[11px] text-slate-500">Erscheint im blauen Header aller E-Mails</p>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
          {uploading ? "..." : "Upload"}
        </button>
        {logoUrl && (
          <button onClick={handleRemove} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
    </div>
  );
}

// ─── Email Editor ─────────────────────────────────────────────────────────────
function EmailEditor({ tpl, company, logoUrl, orgId, fromName, onLogoChange, onBack, onSend }) {
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

  const fullHtml = buildHtmlEmail({ bodyContent: customBody || "", subject: betreff, logoUrl, senderName: fromName });

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
      organization_id: orgId,
    });
  };

  const handleSend = async () => {
    setSending(true);
    await doSend(company.email);
    try {
      const me = await base44.auth.me();
      let orgIdForLog = orgId;
      if (!orgIdForLog) {
        const orgs = await base44.entities.Organization.filter({ owner_email: me.email });
        orgIdForLog = orgs?.[0]?.id || null;
      }
      await base44.entities.ContactLog.create({
        organization_id: orgIdForLog,
        company_id: company.id,
        typ: "E-Mail",
        ergebnis: "Angebot gesendet",
        naechster_schritt: `E-Mail gesendet: ${betreff}`,
        notiz: `Vorlage: ${tpl?.label || "Individuell"}`,
        user_email: me.email,
      });
    } catch (e) {
      console.warn("ContactLog konnte nicht erstellt werden:", e.message);
    }
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
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline self-start font-medium">
        <ArrowLeft className="w-3.5 h-3.5" /> Vorlage wechseln
      </button>

      {/* Logo */}
      <LogoUploader logoUrl={logoUrl} orgId={orgId} onLogoChange={onLogoChange} />

      {/* Betreff */}
      <div>
        <Label className="text-xs mb-1.5 block font-semibold text-slate-700">Betreff</Label>
        <Input value={betreff} onChange={e => setBetreff(e.target.value)} className="text-sm bg-white border-slate-200 text-slate-900 placeholder:text-slate-400" />
      </div>

      {/* Datum / Uhrzeit */}
      {(tpl.hasDatum || tpl.hasUhrzeit) && (
        <div className="flex gap-3">
          {tpl.hasDatum && (
            <div className="flex-1">
              <Label className="text-xs mb-1.5 block font-semibold text-slate-700">Datum</Label>
              <Input type="date" value={datum} onChange={e => setDatum(e.target.value)} className="text-sm bg-white border-slate-200 text-slate-900" />
            </div>
          )}
          {tpl.hasUhrzeit && (
            <div className="flex-1">
              <Label className="text-xs mb-1.5 block font-semibold text-slate-700">Uhrzeit</Label>
              <Input type="time" value={uhrzeit} onChange={e => setUhrzeit(e.target.value)} className="text-sm bg-white border-slate-200 text-slate-900" />
            </div>
          )}
        </div>
      )}

      {/* Persönliche Ergänzung */}
      <div>
        <Label className="text-xs mb-1.5 block font-semibold text-slate-700">Persönliche Ergänzung <span className="font-normal text-slate-400">(optional)</span></Label>
        <Input value={notiz} onChange={e => setNotiz(e.target.value)} placeholder="z.B. Bezug auf unser Gespräch..." className="text-sm bg-white border-slate-200 text-slate-900 placeholder:text-slate-400" />
      </div>

      {/* Tabs */}
      <div>
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mb-3">
          <button
            onClick={() => setTab("edit")}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${tab === "edit" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            ✏️ Text bearbeiten
          </button>
          <button
            onClick={() => setTab("preview")}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${tab === "preview" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            👁️ Live-Vorschau
          </button>
        </div>

        {tab === "edit" ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden
            [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200
            [&_.ql-toolbar]:bg-slate-50
            [&_.ql-container]:border-0 [&_.ql-container]:bg-white
            [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-sm [&_.ql-editor]:font-sans
            [&_.ql-editor]:leading-relaxed [&_.ql-editor]:text-slate-900 [&_.ql-editor]:bg-white
            [&_.ql-editor.ql-blank::before]:text-slate-400
            [&_.ql-toolbar_.ql-stroke]:stroke-slate-600
            [&_.ql-toolbar_.ql-fill]:fill-slate-600
            [&_.ql-toolbar_button:hover_.ql-stroke]:stroke-blue-600
            [&_.ql-toolbar_button.ql-active_.ql-stroke]:stroke-blue-600">
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
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-slate-500 truncate flex-1">Von: {fromName || "Ihr Unternehmen"} &nbsp;|&nbsp; An: {company.email}</span>
            </div>
            <LivePreview html={fullHtml} />
          </div>
        )}
      </div>

      {/* Anhänge */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Label className="text-xs font-semibold text-slate-700">Anhänge</Label>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline disabled:opacity-50 font-medium"
          >
            {uploadingFile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
            {uploadingFile ? "Lädt hoch..." : "Datei hinzufügen"}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
        </div>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
                <Paperclip className="w-3 h-3 text-slate-400" />
                <span className="max-w-[120px] truncate">{a.name}</span>
                <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-slate-200 pt-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Mail className="w-3.5 h-3.5" />
          An: <span className="font-semibold text-slate-900">{company.email}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleTestSend} disabled={testSending || testSent}
          className="w-full gap-2 text-xs h-9 bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
          {testSent ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Test gesendet!</>
           : testSending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sende Test...</>
           : <><FlaskConical className="w-3.5 h-3.5" /> Test-E-Mail an mich selbst senden</>}
        </Button>
        <Button onClick={handleSend} disabled={sending} className="w-full gap-2 h-9 bg-blue-600 hover:bg-blue-700 text-white">
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
  const [fromName, setFromName] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [orgLoaded, setOrgLoaded] = useState(false);
  const [runtimeTemplates, setRuntimeTemplates] = useState(TEMPLATES);
  const hasEmail = !!company?.email;

  useEffect(() => {
    if (open && !orgLoaded) {
      (async () => {
        const user = await base44.auth.me();
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
        setOrgId(org.id);

        const [settings, dbTemplates] = await Promise.all([
          base44.entities.OrganizationSettings.filter({ organization_id: org.id }),
          base44.entities.EmailTemplate.filter({ organization_id: org.id }),
        ]);

        const map = {};
        settings.forEach(s => { map[s.key] = s.value; });
        if (map.email_logo_url) setLogoUrl(map.email_logo_url);
        setFromName(map.email_from_name || map.company_name || org.name || null);

        const sig = map.organization_email_signature || buildSignature({
          firmenname: map.company_name || org.name,
          absendername: map.email_from_name,
          telefon: map.email_telefon,
          email: map.email_reply_to || user.email,
          website: map.email_website,
          adresse: map.email_adresse,
        });

        if (dbTemplates?.length > 0) {
          setRuntimeTemplates(dbTemplates.map(t => dbTemplateToRuntimeTemplate(t, sig)));
        }

        setOrgLoaded(true);
      })();
    }
  }, [open]);

  const handleClose = () => { setOpen(false); setSelectedTemplate(null); };

  return (
    <>
      <button
        onClick={() => hasEmail ? setOpen(true) : toast.error("Keine E-Mail-Adresse hinterlegt")}
        title={hasEmail ? company.email : "Keine E-Mail vorhanden"}
        className="inline-flex items-center gap-1.5 h-9 text-sm font-semibold border border-slate-200 bg-white px-3 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <Mail className="w-3.5 h-3.5" /> E-Mail
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-xl max-h-[92vh] flex flex-col overflow-hidden bg-white border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base text-slate-900">
              <Mail className="w-4 h-4 text-blue-600" />
              E-Mail an {company.name}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1 pb-2">
            {!selectedTemplate ? (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-slate-500 font-medium mb-3">Vorlage auswählen:</p>
                {runtimeTemplates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className="w-full text-left px-4 py-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <div className="font-semibold text-sm text-slate-900 group-hover:text-blue-700">{tpl.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{tpl.description}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="pt-1">
                <EmailEditor
                  tpl={selectedTemplate}
                  company={company}
                  logoUrl={logoUrl}
                  orgId={orgId}
                  fromName={fromName}
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