import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Save, ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SettingsSection from "./SettingsSection";

const TYP_OPTIONS = ["Erstansprache", "Nachfassen", "Termin", "Rückruf", "Sonstiges"];

export default function EmailTemplateSettings() {
  const [templates, setTemplates] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // template id being saved
  const [orgId, setOrgId] = useState(null);

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
      const dbTemplates = await base44.entities.EmailTemplate.filter({ organization_id: currentOrgId });
      setTemplates(dbTemplates);
      setLoading(false);
    })();
  }, []);

  const handleSave = async (tpl) => {
    setSaving(tpl.id || "new");
    const currentOrgId = await resolveOrg();
    if (!currentOrgId) { toast.error("Keine Organisation."); setSaving(null); return; }

    if (tpl.id) {
      await base44.entities.EmailTemplate.update(tpl.id, {
        name: tpl.name,
        betreff: tpl.betreff,
        body: tpl.body,
        typ: tpl.typ,
      });
      toast.success(`"${tpl.name}" gespeichert`);
    } else {
      const created = await base44.entities.EmailTemplate.create({
        organization_id: currentOrgId,
        name: tpl.name || "Neue Vorlage",
        betreff: tpl.betreff || "",
        body: tpl.body || "",
        typ: tpl.typ || "Sonstiges",
      });
      setTemplates(prev => prev.map(t => t._isNew ? created : t));
      toast.success("Vorlage erstellt");
    }
    setSaving(null);
  };

  const handleDelete = async (tpl) => {
    if (tpl._isNew) {
      setTemplates(prev => prev.filter(t => t !== tpl));
      return;
    }
    await base44.entities.EmailTemplate.delete(tpl.id);
    setTemplates(prev => prev.filter(t => t.id !== tpl.id));
    toast.success("Vorlage gelöscht");
  };

  const addNew = () => {
    const newTpl = { _isNew: true, name: "Neue Vorlage", betreff: "", body: "", typ: "Sonstiges" };
    setTemplates(prev => [...prev, newTpl]);
    setExpanded(templates.length); // expand the new one
  };

  const updateField = (idx, field, value) => {
    setTemplates(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <SettingsSection
      icon={Mail}
      title="E-Mail-Vorlagen"
      description="Eigene Vorlagen für Erstansprache, Nachfassen, Termine und mehr."
    >
      {templates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Noch keine Vorlagen vorhanden.</p>
          <p className="text-xs mt-1">Vorlagen werden beim Onboarding automatisch erstellt oder können manuell hinzugefügt werden.</p>
        </div>
      )}

      <div className="space-y-2">
        {templates.map((tpl, idx) => (
          <div key={tpl.id || idx} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === idx ? null : idx)}
              className="w-full flex items-center justify-between px-4 py-3 bg-background hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium truncate">{tpl.name || "Neue Vorlage"}</span>
                {tpl.typ && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">{tpl.typ}</span>
                )}
                {tpl._isNew && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">Neu</span>
                )}
              </div>
              {expanded === idx ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>

            {expanded === idx && (
              <div className="px-4 py-4 space-y-3 border-t border-border">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block font-semibold">Vorlagenname</Label>
                    <Input value={tpl.name} onChange={e => updateField(idx, "name", e.target.value)} placeholder="z.B. Erstansprache" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block font-semibold">Typ</Label>
                    <select
                      value={tpl.typ || "Sonstiges"}
                      onChange={e => updateField(idx, "typ", e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    >
                      {TYP_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1 block font-semibold">Betreff</Label>
                  <Input value={tpl.betreff} onChange={e => updateField(idx, "betreff", e.target.value)} placeholder="E-Mail Betreff..." />
                </div>
                <div>
                  <Label className="text-xs mb-1 block font-semibold">
                    E-Mail-Text (HTML)
                    <span className="text-muted-foreground font-normal ml-1">— Platzhalter: {"{firmenname}"}, {"{ansprechpartner}"}</span>
                  </Label>
                  <textarea
                    value={tpl.body}
                    onChange={e => updateField(idx, "body", e.target.value)}
                    rows={10}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex justify-between items-center pt-1">
                  <button onClick={() => handleDelete(tpl)} className="flex items-center gap-1 text-xs text-destructive hover:underline">
                    <Trash2 className="w-3 h-3" /> {tpl._isNew ? "Abbrechen" : "Vorlage löschen"}
                  </button>
                  <Button
                    size="sm"
                    onClick={() => handleSave(tpl)}
                    disabled={saving === (tpl.id || "new")}
                    className="gap-1.5"
                  >
                    {saving === (tpl.id || "new") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Speichern
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Button variant="outline" size="sm" onClick={addNew} className="gap-2">
          <Plus className="w-3.5 h-3.5" /> Neue Vorlage
        </Button>
      </div>
    </SettingsSection>
  );
}