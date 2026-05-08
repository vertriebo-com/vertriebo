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
    <div className="space-y-6">
      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 text-sm text-blue-900">
        <strong className="font-semibold">Platzhalter</strong> wie <code className="font-mono text-xs bg-blue-100 px-1.5 py-0.5 rounded ml-1">{"{{firmenname}}"}</code> werden beim Versand automatisch durch echte Daten ersetzt. Klicken Sie einen Platzhalter an, um ihn in den Text einzufügen.
      </div>

      {/* Empty State - Hochwertig */}
      {templates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Noch keine Vorlagen angelegt</h3>
          <p className="text-sm font-medium text-slate-600 mb-5 max-w-md mx-auto">
            Erstellen Sie Vorlagen für Erstkontakt, Nachfassen, Termine und Angebote.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={addNew} className="gap-2">
              <Plus className="w-4 h-4" /> Standardvorlagen erstellen
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Templates Liste */}
          <div className="space-y-3">
            {templates.map((tpl, idx) => (
              <div key={tpl.id || idx}>
                {/* Collapsed Header */}
                {expanded !== idx && (
                  <button
                    onClick={() => setExpanded(idx)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-slate-900 truncate block">{tpl.name || "Neue Vorlage"}</span>
                        {tpl.betreff && (
                         <span className="text-xs text-slate-600 font-medium truncate block mt-0.5">{tpl.betreff}</span>
                        )}
                      </div>
                      {tpl.typ && (
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium shrink-0">{tpl.typ}</span>
                      )}
                      {tpl._isNew && (
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium shrink-0">Neu</span>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
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
            <Plus className="w-3.5 h-3.5" /> Weitere Vorlage erstellen
          </Button>
        </>
      )}
    </div>
  );
}