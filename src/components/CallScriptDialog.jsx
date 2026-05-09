import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhoneCall, Loader2, RefreshCw, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function CallScriptDialog({ company }) {
  const [open, setOpen] = useState(false);
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [orgSettings, setOrgSettings] = useState(null);

  const loadOrgSettings = async () => {
    if (orgSettings) return orgSettings;
    try {
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
      if (!org) return null;
      const settingsRecords = await base44.entities.OrganizationSettings.filter({ organization_id: org.id });
      const map = {};
      settingsRecords.forEach(s => { map[s.key] = s.value; });
      const settings = {
        firmenname: map.company_name || org.name || "",
        adresse: map.company_address || "",
        telefon: map.company_phone || "",
        website: map.company_website || "",
        dienstleistungen: map.dienstleistungen || "",
        zielkunden: map.zielkunden || "",
      };
      setOrgSettings(settings);
      return settings;
    } catch {
      return null;
    }
  };

  const generateScript = async () => {
    setLoading(true);
    setScript("");
    const settings = await loadOrgSettings();

    const firmenname = settings?.firmenname || "Unser Unternehmen";
    const dienstleistungen = settings?.dienstleistungen || "Unsere Dienstleistungen";
    const adresse = settings?.adresse || "";
    const telefon = settings?.telefon || "";
    const website = settings?.website || "";

    const logs = await base44.entities.ContactLog.filter({ company_id: company.id });
    const recentLogs = logs
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 3);

    const logContext = recentLogs.length > 0
      ? recentLogs.map(l => `- ${l.typ} (${new Date(l.created_date).toLocaleDateString('de-DE')}): ${l.ergebnis}${l.notiz ? ' – ' + l.notiz : ''}`).join('\n')
      : 'Kein bisheriger Kontakt';

    const result = await base44.integrations.Core.InvokeLLM({
      model: "claude_sonnet_4_6",
      prompt: `Du bist ein erfahrener Vertriebsprofi für ${firmenname}${adresse ? ` (${adresse}` : ""}${telefon ? `, Tel: ${telefon}` : ""}${website ? `, ${website}` : ""}${adresse ? ")" : ""}.

Das Unternehmen bietet folgende Leistungen an:
${dienstleistungen || "verschiedene Dienstleistungen"}

Erstelle einen kurzen, natürlichen Gesprächsleitfaden für einen Kaltakquise-Anruf bei folgender Firma:

Firma: ${company.name}
Branche: ${company.branche || "Unbekannt"}
Ort: ${company.ort || ""}
Status: ${company.status}
Aktueller Dienstleister: ${company.aktueller_dienstleister || "Unbekannt"}
Ansprechpartner: ${company.ansprechpartner || "Unbekannt"}
Notizen: ${company.notizen || "Keine"}
Bisherige Kontakte:
${logContext}

Wichtig: Passe den Leitfaden an die Branche der Zielfirma an. Wenn es bereits Kontakte gab, passe den Einstieg entsprechend an.

Strukturiere den Leitfaden mit:
1. **Einstieg** (Begrüßung & Vorstellung, 2 Sätze)
2. **Aufhänger** (warum rufst du genau diese Firma an – branchenbezogen, 1-2 Sätze)
3. **Unser Angebot** (welche Leistungen passen konkret zu dieser Firma, 2-3 Punkte)
4. **Einwand-Antworten** (2 typische Einwände mit kurzer Antwort)
5. **Abschluss** (Terminvereinbarung, 1-2 Sätze)

Halte es praxisnah, locker und überzeugend. Auf Deutsch.`,
    });
    setScript(typeof result === "string" ? result : result?.text || JSON.stringify(result));
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(true);
    if (!script) generateScript();
  };

  return (
    <>
      <button onClick={handleOpen} className="inline-flex items-center gap-1.5 h-9 text-sm font-semibold border border-slate-200 bg-white px-3 rounded-lg hover:bg-slate-50 transition-colors">
        <Sparkles className="w-3.5 h-3.5" /> Leitfaden
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-slate-900">
              <PhoneCall className="w-4 h-4 text-purple-600" />
              Gesprächsleitfaden — {company.name}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              <p className="text-sm font-medium">KI erstellt deinen Gesprächsleitfaden...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="prose prose-sm max-w-none text-sm leading-relaxed text-slate-800
                [&_h1]:text-slate-900 [&_h2]:text-slate-900 [&_h3]:text-slate-900
                [&_strong]:text-slate-900 [&_p]:text-slate-700 [&_li]:text-slate-700">
                <ReactMarkdown>{script}</ReactMarkdown>
              </div>
              <div className="flex justify-end pt-2 border-t border-slate-200">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs bg-white border-slate-300 text-slate-700" onClick={generateScript}>
                  <RefreshCw className="w-3 h-3" /> Neu generieren
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}