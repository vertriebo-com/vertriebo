import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, ImagePlus, Trash2, Mail, Phone, Globe, MapPin, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

function normalizeUrl(val) {
  const v = (val || "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.includes(".")) return "https://" + v;
  return "";
}

function isValidUrl(val) {
  if (!val) return true;
  try { new URL(normalizeUrl(val) || "invalid"); return true; } catch { return false; }
}

function isLikelyPlainText(val) {
  if (!val) return false;
  const v = val.trim();
  return v.includes(" ") && !v.includes(".");
}

// ─── Signature Preview ────────────────────────────────────────────────────────
function SignaturePreview({ sig }) {
  const iframeRef = useRef(null);
  useEffect(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    const html = `<html><body style="margin:0;padding:16px;font-family:'Segoe UI',Arial,sans-serif;background:#fff;">${sig}</body></html>`;
    doc.open(); doc.write(html); doc.close();
  }, [sig]);
  return (
    <iframe
      ref={iframeRef}
      className="w-full border-0"
      style={{ height: "160px" }}
      title="Signatur-Vorschau"
      sandbox="allow-same-origin"
    />
  );
}

// ─── Build default signature from fields ─────────────────────────────────────
export function buildSignatureHtml({ absendername, firmenname, telefon, email, website, adresse }) {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:2px solid #e5e7eb;padding-top:16px;width:100%;max-width:480px;">
  <tr>
    <td style="vertical-align:top;">
      <div style="font-size:14px;font-weight:900;color:#1d4ed8;">${absendername || "Ihr Name"}</div>
      <div style="font-size:12px;color:#374151;font-weight:600;">${firmenname || "Ihr Unternehmen"}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:6px;line-height:2.0;">
        ${adresse ? adresse + "<br/>" : ""}
        ${telefon ? `📞 <a href="tel:${telefon}" style="color:#1d4ed8;text-decoration:none;font-weight:700;">${telefon}</a><br/>` : ""}
        ${email ? `✉️ <a href="mailto:${email}" style="color:#1d4ed8;text-decoration:none;">${email}</a>` : ""}
        ${website ? `<br/>🌐 <a href="${website.startsWith("http") ? website : "https://" + website}" style="color:#1d4ed8;text-decoration:none;">${website}</a>` : ""}
      </div>
    </td>
  </tr>
</table>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EmailSetupStep({ firmenname, userEmail, onBack, onNext, orgId }) {
  const [absendername, setAbsendername] = useState("");
  const [replyTo, setReplyTo] = useState(userEmail || "");
  const [absenderEmail, setAbsenderEmail] = useState(userEmail || "");
  const [telefon, setTelefon] = useState("");
  const [website, setWebsite] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [adresse, setAdresse] = useState("");
  const [logoUrl, setLogoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [customSignature, setCustomSignature] = useState(null);
  const [editingSignature, setEditingSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef(null);

  // Live-generated signature (before custom edit)
  const cleanWebsite = normalizeUrl(website);
  const autoSignature = buildSignatureHtml({ absendername, firmenname, telefon, email: replyTo || absenderEmail, website: cleanWebsite, adresse });
  const displaySignature = customSignature !== null ? customSignature : autoSignature;

  // Reset custom signature when fields change (unless user manually edited)
  const handleFieldChange = (setter) => (val) => {
    setter(val);
    if (customSignature !== null) setCustomSignature(null);
  };

  const handleWebsiteChange = (val) => {
    setWebsite(val);
    setCustomSignature(null);
    if (isLikelyPlainText(val)) {
      setWebsiteError("Das ist kein URL. Bitte eine echte Web-Adresse eingeben, z.B. https://www.meinefirma.de");
    } else if (val && !isValidUrl(val)) {
      setWebsiteError("Ungültige URL. Beispiel: https://www.meinefirma.de");
    } else {
      setWebsiteError("");
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLogoUrl(file_url);
    setUploading(false);
    toast.success("Logo hochgeladen");
  };

  const handleSave = async () => {
    if (websiteError) { toast.error("Bitte die Website-URL korrigieren."); return; }
    setSaving(true);
    const existingSettings = await base44.entities.OrganizationSettings.filter({ organization_id: orgId });
    const existingMap = {};
    existingSettings.forEach(s => { existingMap[s.key] = s.id; });

    const cleanWebsite = normalizeUrl(website);

    const toSave = {
      email_from_name: absendername,
      email_reply_to: replyTo,
      email_sender_email: absenderEmail,
      email_telefon: telefon,
      email_website: cleanWebsite,
      company_website: cleanWebsite,
      email_adresse: adresse,
      organization_email_signature: displaySignature,
      ...(logoUrl ? { email_logo_url: logoUrl } : {}),
    };

    await Promise.all(
      Object.entries(toSave).map(([key, value]) => {
        if (!value) return null;
        if (existingMap[key]) {
          return base44.entities.OrganizationSettings.update(existingMap[key], { organization_id: orgId, key, value });
        }
        return base44.entities.OrganizationSettings.create({ organization_id: orgId, key, value });
      }).filter(Boolean)
    );

    setSaving(false);
    onNext({ absendername, replyTo, absenderEmail, telefon, website, adresse, logoUrl, signature: displaySignature });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-1">E-Mail & Kommunikation</h2>
       <p className="text-sm font-medium text-slate-600 mb-6">
         Diese Daten werden für E-Mail-Vorlagen, Signaturen und manuell vorbereitete Nachrichten verwendet.
       </p>

      <div className="space-y-4 mb-6">
        {/* Absendername */}
        <div>
          <Label className="text-xs mb-2 block font-semibold text-slate-900">Absendername *</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={absendername}
              onChange={e => handleFieldChange(setAbsendername)(e.target.value)}
              placeholder={`z.B. Max Mustermann von ${firmenname || "Muster GmbH"}`}
              className="pl-9 bg-white text-slate-900 placeholder:text-slate-400 border-slate-300"
            />
          </div>
          <p className="text-[11px] text-slate-600 font-medium mt-0.5">Erscheint als Absender in allen E-Mails</p>
        </div>

        {/* E-Mail Felder */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-2 block font-semibold text-slate-900">Reply-To / Kontakt-E-Mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={absenderEmail}
                onChange={e => handleFieldChange(setAbsenderEmail)(e.target.value)}
                placeholder="info@meinefirma.de"
                className="pl-9 bg-white text-slate-900 placeholder:text-slate-400 border-slate-300"
                type="email"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs mb-2 block font-semibold text-slate-900">Reply-To E-Mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={replyTo}
                onChange={e => handleFieldChange(setReplyTo)(e.target.value)}
                placeholder="antworten@meinefirma.de"
                className="pl-9 bg-white text-slate-900 placeholder:text-slate-400 border-slate-300"
                type="email"
              />
            </div>
          </div>
        </div>

        {/* Telefon + Website */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-2 block font-semibold text-slate-900">Telefon (für Signatur)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={telefon}
                onChange={e => handleFieldChange(setTelefon)(e.target.value)}
                placeholder="z.B. 0800 / 123456"
                className="pl-9 bg-white text-slate-900 placeholder:text-slate-400 border-slate-300"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs mb-2 block font-semibold text-slate-900">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={website}
                onChange={e => handleWebsiteChange(e.target.value)}
                placeholder="https://www.meinefirma.de"
                className={`pl-9 bg-white text-slate-900 placeholder:text-slate-400 border-slate-300 ${websiteError ? "border-red-500" : ""}`}
              />
            </div>
            {websiteError && <p className="text-[11px] text-red-600 font-medium mt-0.5">{websiteError}</p>}
            {!websiteError && website && normalizeUrl(website) && (
              <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                Gespeichert als: {normalizeUrl(website)}
              </p>
            )}
          </div>
        </div>

        {/* Adresse */}
        <div>
          <Label className="text-xs mb-2 block font-semibold text-slate-900">Firmenadresse (optional)</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={adresse}
              onChange={e => handleFieldChange(setAdresse)(e.target.value)}
              placeholder="Musterstraße 1, 12345 Musterstadt"
              className="pl-9 bg-white text-slate-900 placeholder:text-slate-400 border-slate-300"
            />
          </div>
        </div>

        {/* Logo Upload */}
        <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="w-20 h-10 rounded-lg border border-slate-300 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl
              ? <img src={logoUrl} alt="Logo" className="max-h-9 max-w-[76px] object-contain" />
              : <span className="text-white/50 text-[9px] font-medium text-center leading-tight px-1">Kein Logo</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900">E-Mail Logo (optional)</p>
            <p className="text-[11px] text-slate-600 font-medium">Erscheint im Header aller E-Mails</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
              {uploading ? "..." : "Upload"}
            </button>
            {logoUrl && (
              <button onClick={() => setLogoUrl(null)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>
      </div>

      {/* Signature Preview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold text-slate-900">Automatisch generierte Signatur</Label>
          <button
            onClick={() => setEditingSignature(!editingSignature)}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            {editingSignature ? "Vorschau" : "Bearbeiten"}
          </button>
        </div>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200">
            <span className="text-[11px] text-slate-600 font-medium">So wird Ihre Standard-Signatur aussehen</span>
          </div>
          {editingSignature ? (
           <textarea
             className="w-full p-3 text-xs font-mono bg-white text-slate-900 border-0 outline-none resize-none"
             rows={8}
             value={customSignature !== null ? customSignature : autoSignature}
             onChange={e => setCustomSignature(e.target.value)}
           />
          ) : (
           <SignaturePreview sig={displaySignature} />
          )}
          </div>
          <p className="text-[11px] text-slate-600 font-medium mt-1">
          Die Signatur wird automatisch aus Ihren Angaben generiert. Sie können sie jederzeit anpassen.
          </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>Zurück</Button>
        <Button
          onClick={handleSave}
          disabled={saving || !absendername.trim()}
          className="flex-1 gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird gespeichert...</> : "Weiter"}
        </Button>
      </div>
    </div>
  );
}