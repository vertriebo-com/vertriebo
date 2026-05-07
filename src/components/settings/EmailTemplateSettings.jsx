import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Loader2, Plus, ChevronDown, ChevronUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SettingsSection from "./SettingsSection";
import EmailTemplateEditor from "./EmailTemplateEditor";

export default function EmailTemplateSettings() {
  const [templates, setTemplates] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState(null);
  const [sendingTest, setSendingTest] = useState(false);

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
    const currentOrgId = await resolveOrg();
    if (!currentOrgId) { toast.error("Keine Organisation."); return; }

    if (tpl.id) {
      await base44.entities.EmailTemplate.update(tpl.id, {
        name: tpl.name, betreff: tpl.betreff, body: tpl.body, typ: tpl.typ,
      });
      setTemplates(prev => prev.map(t => t.id === tpl.id ? { ...t, ...tpl } : t));
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
      setExpanded(templates.findIndex(t => t._isNew));
      toast.success("Vorlage erstellt");
    }
  };

  const handleDelete = async (tpl) => {
    if (tpl._isNew) {
      setTemplates(prev => prev.filter(t => t !== tpl));
      setExpanded(null);
      return;
    }
    await base44.entities.EmailTemplate.delete(tpl.id);
    setTemplates(prev => prev.filter(t => t.id !== tpl.id));
    setExpanded(null);
    toast.success("Vorlage gelöscht");
  };

  const handleSendTest = async (tpl) => {
    if (!tpl.betreff) { toast.error("Betreff fehlt."); return; }
    setSendingTest(true);
    const user = await base44.auth.me();
    const currentOrgId = await resolveOrg();
    const res = await base44.functions.invoke("sendBrevoEmail", {
      to: user.email,
      subject: "[TEST] " + tpl.betreff,
      body: `<p><em>Dies ist eine Test-E-Mail für die Vorlage „${tpl.name}".</em></p><hr/>${tpl.body?.replace(/\n/g, "<br/>") || ""}`,
      organization_id: currentOrgId,
    });
    if (res.data?.success) {
      toast.success(`Test-Mail an ${user.email} gesendet!`);
    } else {
      toast.error("Fehler beim Senden: " + (res.data?.error || "Unbekannt"));
    }
    setSendingTest(false);
  };

  const addNew = () => {
    const newTpl = { _isNew: true, name: "Neue Vorlage", betreff: "", body: "", typ: "Sonstiges" };
    setTemplates(prev => [...prev, newTpl]);
    setExpanded(templates.length);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <strong>Platzhalter</strong> wie <code className="font-mono text-xs bg-blue-100 px-1 rounded">{"{{firmenname}}"}</code> werden beim Versand automatisch durch echte Daten ersetzt. Klicken Sie einen Platzhalter an, um ihn in den Text einzufügen.
      </div>

      {templates.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Keine Vorlagen vorhanden</p>
          <p className="text-xs mt-1">Legen Sie Ihre erste E-Mail-Vorlage an.</p>
        </div>
      )}

      <div className="space-y-3">
        {templates.map((tpl, idx) => (
          <div key={tpl.id || idx}>
            {/* Collapsed Header */}
            {expanded !== idx && (
              <button
                onClick={() => setExpanded(idx)}
                className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl hover:bg-muted/50 transition-colors"
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
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            )}

            {/* Expanded Editor */}
            {expanded === idx && (
              <EmailTemplateEditor
                tpl={tpl}
                idx={idx}
                orgId={orgId}
                onSave={handleSave}
                onDelete={handleDelete}
                sendingTest={sendingTest}
                onSendTest={handleSendTest}
                onCancel={() => setExpanded(null)}
              />
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addNew} className="gap-2">
        <Plus className="w-3.5 h-3.5" /> Neue Vorlage erstellen
      </Button>
    </div>
  );
}