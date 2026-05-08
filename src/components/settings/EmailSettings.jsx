import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Save, Loader2, User, Phone, Globe, MapPin, ImagePlus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SettingsSection from "./SettingsSection";
import { buildSignatureHtml } from "@/components/onboarding/EmailSetupStep";

function SignaturePreview({ sig }) {
  const iframeRef = useRef(null);
  useEffect(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    const html = `<html><body style="margin:0;padding:16px;font-family:'Segoe UI',Arial,sans-serif;background:#fff;">${sig}</body></html>`;
    doc.open(); doc.write(html); doc.close();
  }, [sig]);
  return <iframe ref={iframeRef} className="w-full border-0" style={{ height: "150px" }} title="Signatur-Vorschau" sandbox="allow-same-origin" />;
}

function normalizeUrl(val) {
  const v = (val || "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  // Looks like a real domain?
  if (v.includes(".")) return "https://" + v;
  return ""; // plain text like "Huwa Gebäudedienste" → discard
}

function isValidUrl(val) {
  if (!val) return true;
  try { new URL(normalizeUrl(val) || "invalid"); return true; } catch { return false; }
}

function isLikelyPlainText(val) {
  if (!val) return false;
  const v = val.trim();
  // Contains spaces and no dot → likely plain text
  return v.includes(" ") && !v.includes(".");
}

export default function EmailSettings({ org: orgProp }) {
  const [orgId, setOrgId] = useState(orgProp?.id || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingSignature, setEditingSignature] = useState(false);
  const logoInputRef = useRef(null);

  const [absendername, setAbsendername] = useState("");
  const [absenderEmail, setAbsenderEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [telefon, setTelefon] = useState("");
  const [website, setWebsite] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [adresse, setAdresse] = useState("");
  const [firmenname, setFirmenname] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [customSignature, setCustomSignature] = useState(null);

  const autoSignature = buildSignatureHtml({
    absendername, firmenname, telefon,
    email: replyTo || absenderEmail,
    website: normalizeUrl(website),
    adresse,
  });
  const displaySignature = customSignature !== null ? customSignature : autoSignature;

  const handleFieldChange = (setter) => (val) => {
    setter(val);
    setCustomSignature(null);
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

  const resolveOrg = async () => {
    if (orgId) return orgId;
    const user = await base44.auth.me();
    const orgs = await base44.entities.Organization.filter({ owner_email: user.email });
    let found = orgs?.[0] || null;
    if (!found) {
      const memberships = await base44.entities.OrganizationMember.filter({ user_email: user.email, status: "active" });
      if (memberships?.[0]?.organization_id) {
        const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
        found = memberOrgs?.[0] || null;
      }
    }
    if (found) setOrgId(found.id);
    return found?.id || null;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const currentOrgId = await resolveOrg();
      if (!currentOrgId) { setLoading(false); return; }
      const [orgs, settings] = await Promise.all([
        base44.entities.Organization.filter({ id: currentOrgId }),
        base44.entities.OrganizationSettings.filter({ organization_id: currentOrgId }),
      ]);
      const map = {};
      settings.forEach(s => { map[s.key] = s.value; });
      const org = orgs[0];
      setFirmenname(org?.name || map.company_name || "");
      setAbsendername(map.email_from_name || "");
      setAbsenderEmail(map.email_sender_email || "");
      setReplyTo(map.email_reply_to || "");
      setTelefon(map.email_telefon || "");

      // Load website – only if it looks like a real URL
      const rawWebsite = map.email_website || map.company_website || "";
      setWebsite(isLikelyPlainText(rawWebsite) ? "" : rawWebsite);

      setAdresse(map.email_adresse || "");
      setLogoUrl(map.email_logo_url || "");
      if (map.organization_email_signature) setCustomSignature(map.organization_email_signature);
      setLoading(false);
    })();
  }, []);

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
    const currentOrgId = await resolveOrg();
    if (!currentOrgId) { toast.error("Keine Organisation gefunden."); setSaving(false); return; }

    const cleanWebsite = normalizeUrl(website);

    const existing = await base44.entities.OrganizationSettings.filter({ organization_id: currentOrgId });
    const existingMap = {};
    existing.forEach(s => { existingMap[s.key] = s.id; });

    const toSave = {
      email_from_name:               absendername,
      email_sender_email:            absenderEmail,
      email_reply_to:                replyTo,
      email_telefon:                 telefon,
      email_website:                 cleanWebsite,
      company_website:               cleanWebsite,
      email_adresse:                 adresse,
      organization_email_signature:  displaySignature,
      ...(logoUrl ? { email_logo_url: logoUrl } : {}),
    };

    await Promise.all(
      Object.entries(toSave).map(([key, value]) => {
        const strVal = String(value ?? "");
        if (existingMap[key]) {
          return base44.entities.OrganizationSettings.update(existingMap[key], { organization_id: currentOrgId, key, value: strVal });
        }
        if (strVal) {
          return base44.entities.OrganizationSettings.create({ organization_id: currentOrgId, key, value: strVal });
        }
        return null;
      }).filter(Boolean)
    );

    toast.success("E-Mail-Einstellungen gespeichert!");
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Info-Box: Plattform-Absender */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>Wie E-Mail-Versand funktioniert:</strong>{" "}
          E-Mails werden über die verifizierte Vertriebo-Infrastruktur versendet.
          Der <strong>Absendername</strong> bestimmt, welcher Name beim Empfänger erscheint.
          Die <strong>Reply-To-Adresse</strong> bestimmt, wohin Antworten gehen.
        </div>
      </div>

      <SettingsSection icon={User} title="Absender & Kontakt" description="Werden als Absender in allen ausgehenden E-Mails verwendet">
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold mb-1 block">
              Absendername *
              <span className="text-muted-foreground font-normal ml-1">— erscheint beim Empfänger als „Von: ..."</span>
            </Label>
            <Input
              value={absendername}
              onChange={e => handleFieldChange(setAbsendername)(e.target.value)}
              placeholder={`z.B. Max Mustermann von ${firmenname || "Ihrer Firma"}`}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Absender-E-Mail
                <span className="text-muted-foreground font-normal ml-1">— technische Absenderadresse</span>
              </Label>
              <Input
                value={absenderEmail}
                onChange={e => handleFieldChange(setAbsenderEmail)(e.target.value)}
                placeholder="info@meinefirma.de"
                type="email"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Reply-To E-Mail
                <span className="text-muted-foreground font-normal ml-1">— wohin gehen Antworten?</span>
              </Label>
              <Input
                value={replyTo}
                onChange={e => handleFieldChange(setReplyTo)(e.target.value)}
                placeholder="antworten@meinefirma.de"
                type="email"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> Telefon (für Signatur)</Label>
              <Input value={telefon} onChange={e => handleFieldChange(setTelefon)(e.target.value)} placeholder="0800 / 123456" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block flex items-center gap-1"><Globe className="w-3 h-3" /> Website</Label>
              <Input
                value={website}
                onChange={e => handleWebsiteChange(e.target.value)}
                placeholder="https://www.meinefirma.de"
                className={websiteError ? "border-destructive" : ""}
              />
              {websiteError && <p className="text-[11px] text-destructive mt-0.5">{websiteError}</p>}
              {!websiteError && website && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Gespeichert als: {normalizeUrl(website)}
                </p>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block flex items-center gap-1"><MapPin className="w-3 h-3" /> Firmenadresse (Signatur)</Label>
            <Input value={adresse} onChange={e => handleFieldChange(setAdresse)(e.target.value)} placeholder="Musterstraße 1, 12345 Musterstadt" />
          </div>
        </div>
      </SettingsSection>

      {/* Logo */}
      <SettingsSection icon={ImagePlus} title="E-Mail Logo" description="Erscheint im Header aller ausgehenden E-Mails">
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="w-20 h-10 rounded-lg border border-border bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl
              ? <img src={logoUrl} alt="Logo" className="max-h-9 max-w-[76px] object-contain" />
              : <span className="text-white/50 text-[9px] font-medium text-center leading-tight px-1">Kein Logo</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">Logo (optional)</p>
            <p className="text-[11px] text-muted-foreground">PNG oder JPG empfohlen</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => logoInputRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
              {uploading ? "..." : "Upload"}
            </button>
            {logoUrl && (
              <button onClick={() => setLogoUrl("")} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>
      </SettingsSection>

      {/* Signatur */}
      <SettingsSection icon={Mail} title="E-Mail-Signatur" description="Automatisch generiert aus Ihren Angaben – kann manuell angepasst werden">
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Vorschau der Standard-Signatur</span>
            <button onClick={() => setEditingSignature(!editingSignature)} className="text-xs text-primary hover:underline">
              {editingSignature ? "Vorschau" : "Manuell bearbeiten (HTML)"}
            </button>
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
        {customSignature !== null && (
          <button onClick={() => setCustomSignature(null)} className="text-xs text-slate-500 hover:text-slate-900 mt-1">
            ↺ Zurück zur automatischen Signatur
          </button>
        )}
      </SettingsSection>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !!websiteError} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Wird gespeichert..." : "E-Mail-Einstellungen speichern"}
        </Button>
      </div>
    </div>
  );
}