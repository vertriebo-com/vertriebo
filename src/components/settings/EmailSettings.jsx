import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Save, Loader2, User, Phone, Globe, MapPin, ImagePlus, Trash2 } from "lucide-react";
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
  const [adresse, setAdresse] = useState("");
  const [firmenname, setFirmenname] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [customSignature, setCustomSignature] = useState(null);

  const autoSignature = buildSignatureHtml({ absendername, firmenname, telefon, email: replyTo || absenderEmail, website, adresse });
  const displaySignature = customSignature !== null ? customSignature : autoSignature;

  const handleFieldChange = (setter) => (val) => {
    setter(val);
    setCustomSignature(null); // regenerate on field change
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
      setWebsite(map.email_website || "");
      setAdresse(map.email_adresse || "");
      setLogoUrl(map.email_logo_url || "");
      if (map.organization_email_signature) {
        setCustomSignature(map.organization_email_signature);
      }
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
    setSaving(true);
    const currentOrgId = await resolveOrg();
    if (!currentOrgId) { toast.error("Keine Organisation gefunden."); setSaving(false); return; }

    const existing = await base44.entities.OrganizationSettings.filter({ organization_id: currentOrgId });
    const existingMap = {};
    existing.forEach(s => { existingMap[s.key] = s.id; });

    const toSave = {
      email_from_name: absendername,
      email_sender_email: absenderEmail,
      email_reply_to: replyTo,
      email_telefon: telefon,
      email_website: website,
      email_adresse: adresse,
      organization_email_signature: displaySignature,
      ...(logoUrl ? { email_logo_url: logoUrl } : {}),
    };

    await Promise.all(
      Object.entries(toSave).map(([key, value]) => {
        if (!value) return null;
        if (existingMap[key]) {
          return base44.entities.OrganizationSettings.update(existingMap[key], { organization_id: currentOrgId, key, value });
        }
        return base44.entities.OrganizationSettings.create({ organization_id: currentOrgId, key, value });
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
      <SettingsSection icon={Mail} title="Absender & Kontakt" description="Werden als Absender in allen ausgehenden E-Mails verwendet">
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold mb-1 block flex items-center gap-1"><User className="w-3 h-3" /> Absendername *</Label>
            <Input value={absendername} onChange={e => handleFieldChange(setAbsendername)(e.target.value)} placeholder={`z.B. Max Mustermann von ${firmenname || "Ihrer Firma"}`} />
            <p className="text-[11px] text-muted-foreground mt-0.5">Erscheint als Absender in allen E-Mails</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block flex items-center gap-1"><Mail className="w-3 h-3" /> Absender-E-Mail</Label>
              <Input value={absenderEmail} onChange={e => handleFieldChange(setAbsenderEmail)(e.target.value)} placeholder="info@meinefirma.de" type="email" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block flex items-center gap-1"><Mail className="w-3 h-3" /> Reply-To E-Mail</Label>
              <Input value={replyTo} onChange={e => handleFieldChange(setReplyTo)(e.target.value)} placeholder="antworten@meinefirma.de" type="email" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> Telefon (für Signatur)</Label>
              <Input value={telefon} onChange={e => handleFieldChange(setTelefon)(e.target.value)} placeholder="0800 / 123456" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block flex items-center gap-1"><Globe className="w-3 h-3" /> Website</Label>
              <Input value={website} onChange={e => handleFieldChange(setWebsite)(e.target.value)} placeholder="www.meinefirma.de" />
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
        <div className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-xl">
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
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Vorschau der Standard-Signatur</span>
            <button onClick={() => setEditingSignature(!editingSignature)} className="text-xs text-primary hover:underline">
              {editingSignature ? "Vorschau" : "Manuell bearbeiten"}
            </button>
          </div>
          {editingSignature ? (
            <textarea className="w-full p-3 text-xs font-mono bg-background border-0 outline-none resize-none" rows={8}
              value={customSignature !== null ? customSignature : autoSignature}
              onChange={e => setCustomSignature(e.target.value)} />
          ) : (
            <SignaturePreview sig={displaySignature} />
          )}
        </div>
        {customSignature !== null && (
          <button onClick={() => setCustomSignature(null)} className="text-xs text-muted-foreground hover:text-foreground mt-1">
            ↺ Zurück zur automatischen Signatur
          </button>
        )}
      </SettingsSection>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Wird gespeichert..." : "E-Mail-Einstellungen speichern"}
        </Button>
      </div>
    </div>
  );
}