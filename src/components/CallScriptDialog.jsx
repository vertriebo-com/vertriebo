import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhoneCall, Loader2, RefreshCw, Sparkles, MessageCircle, Zap, Package, ShieldAlert, CheckCircle, Lightbulb } from "lucide-react";
import { toast } from "sonner";

// Section config: icon, color, label → matched by section number in LLM output
const SECTION_CONFIG = [
  { key: "einstieg",   icon: MessageCircle, bg: "bg-blue-50",   border: "border-blue-200",   icon_bg: "bg-blue-100",   icon_color: "text-blue-600",   label: "Einstieg" },
  { key: "aufhaenger", icon: Zap,           bg: "bg-amber-50",  border: "border-amber-200",  icon_bg: "bg-amber-100",  icon_color: "text-amber-600",  label: "Aufhänger" },
  { key: "angebot",    icon: Package,       bg: "bg-emerald-50",border: "border-emerald-200",icon_bg: "bg-emerald-100",icon_color: "text-emerald-600",label: "Unser Angebot" },
  { key: "einwaende",  icon: ShieldAlert,   bg: "bg-rose-50",   border: "border-rose-200",   icon_bg: "bg-rose-100",   icon_color: "text-rose-600",   label: "Einwand-Antworten" },
  { key: "abschluss",  icon: CheckCircle,   bg: "bg-purple-50", border: "border-purple-200", icon_bg: "bg-purple-100", icon_color: "text-purple-600", label: "Abschluss" },
];

// Parse LLM markdown output into sections
function parseScript(raw) {
  if (!raw) return [];
  const lines = raw.split("\n");
  const sections = [];
  let current = null;

  for (const line of lines) {
    // Match "1. **Einstieg**" or "## Einstieg" or "**1. Einstieg**"
    const headerMatch = line.match(/^(?:#{1,3}\s+|\d+\.\s+\*{0,2}|\*{0,2}\d+\.\s+)(?:\*{0,2})?(Einstieg|Aufhänger|Angebot|Unser Angebot|Einwand|Einwände|Einwand-Antworten|Abschluss)/i);
    if (headerMatch) {
      if (current) sections.push(current);
      const label = headerMatch[1].toLowerCase();
      let idx = 0;
      if (label.includes("aufhäng") || label.includes("aufhang")) idx = 1;
      else if (label.includes("angebot")) idx = 2;
      else if (label.includes("einwand")) idx = 3;
      else if (label.includes("abschluss")) idx = 4;
      current = { idx, lines: [] };
    } else if (current !== null && line.trim()) {
      current.lines.push(line.replace(/^\*{1,2}|\*{1,2}$/g, "").trim());
    }
  }
  if (current) sections.push(current);

  // If parsing failed (no sections found), return raw as single block
  if (sections.length === 0) return [{ idx: -1, lines: raw.split("\n").filter(l => l.trim()) }];
  return sections;
}

function ScriptSection({ section }) {
  const cfg = section.idx >= 0 ? SECTION_CONFIG[section.idx] : null;
  const Icon = cfg?.icon || Lightbulb;

  if (!cfg) {
    // Fallback: raw text block
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="space-y-1.5">
          {section.lines.map((line, i) => (
            <p key={i} className="text-sm text-slate-700 leading-relaxed">{line}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-7 h-7 rounded-lg ${cfg.icon_bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${cfg.icon_color}`} />
        </div>
        <h3 className="text-sm font-bold text-slate-900">{cfg.label}</h3>
        <span className={`ml-auto text-xs font-bold ${cfg.icon_color} opacity-60`}>{section.idx + 1}</span>
      </div>
      <div className="space-y-1.5 pl-1">
        {section.lines.map((line, i) => {
          const isBullet = /^[-•]/.test(line);
          const cleaned = line.replace(/^[-•]\s*/, "");
          if (isBullet) {
            return (
              <div key={i} className="flex items-start gap-2">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${cfg.icon_bg} ${cfg.icon_color} shrink-0 block`} style={{}} />
                <p className="text-sm text-slate-700 leading-relaxed">{cleaned}</p>
              </div>
            );
          }
          return <p key={i} className="text-sm text-slate-700 leading-relaxed">{line}</p>;
        })}
      </div>
    </div>
  );
}

export default function CallScriptDialog({ company }) {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState([]);
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
      const s = {
        firmenname: map.company_name || org.name || "[Ihr Firmenname]",
        adresse: map.company_address || "",
        telefon: map.company_phone || "",
        website: map.company_website || "",
        dienstleistungen: map.dienstleistungen || "[Ihre Dienstleistungen]",
        zielkunden: map.zielkunden || "",
      };
      setOrgSettings(s);
      return s;
    } catch {
      return null;
    }
  };

  const generateScript = async () => {
    setLoading(true);
    setSections([]);
    const settings = await loadOrgSettings();

    const firmenname = settings?.firmenname || "[Ihr Firmenname]";
    const dienstleistungen = settings?.dienstleistungen || "[Ihre Dienstleistungen]";
    const adresse = settings?.adresse || "";
    const telefon = settings?.telefon || "";
    const website = settings?.website || "";

    const logs = await base44.entities.ContactLog.filter({ company_id: company.id });
    const recentLogs = logs
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 3);

    const logContext = recentLogs.length > 0
      ? recentLogs.map(l => `- ${l.typ} (${new Date(l.created_date).toLocaleDateString("de-DE")}): ${l.ergebnis}${l.notiz ? " – " + l.notiz : ""}`).join("\n")
      : "Kein bisheriger Kontakt";

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        model: "claude_sonnet_4_6",
        prompt: `Du bist ein erfahrener Vertriebsprofi für ${firmenname}${adresse ? ` (${adresse}` : ""}${telefon ? `, Tel: ${telefon}` : ""}${website ? `, ${website}` : ""}${adresse ? ")" : ""}.

Das Unternehmen bietet folgende Leistungen an:
${dienstleistungen}

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

Strukturiere EXAKT mit diesen Überschriften (keine anderen):
1. Einstieg
2. Aufhänger
3. Unser Angebot
4. Einwand-Antworten
5. Abschluss

Kurze, praxisnahe Texte. Auf Deutsch. Keine langen Absätze.`,
      });
      const raw = typeof result === "string" ? result : result?.text || JSON.stringify(result);
      setSections(parseScript(raw));
    } catch (e) {
      toast.error("Leitfaden konnte nicht generiert werden");
      console.error(e);
    }
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(true);
    if (sections.length === 0) generateScript();
  };

  return (
    <>
      <button onClick={handleOpen} className="inline-flex items-center gap-1.5 h-9 text-sm font-semibold border border-slate-200 bg-white px-3 rounded-lg hover:bg-slate-50 transition-colors">
        <Sparkles className="w-3.5 h-3.5" /> Leitfaden
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-slate-900">
              <PhoneCall className="w-4 h-4 text-purple-600" />
              Gesprächsleitfaden
              <span className="text-slate-400 font-normal">— {company.name}</span>
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-purple-500" />
              <p className="text-sm font-semibold text-slate-700">KI erstellt deinen Gesprächsleitfaden…</p>
              <p className="text-xs text-slate-400">Passt Inhalte an {company.branche || "die Branche"} an</p>
            </div>
          ) : sections.length > 0 ? (
            <div className="space-y-3 pb-1">
              {sections.map((section, i) => (
                <ScriptSection key={i} section={section} />
              ))}
              <div className="flex justify-end pt-1">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs bg-white border-slate-200 text-slate-600 hover:bg-slate-50" onClick={generateScript}>
                  <RefreshCw className="w-3 h-3" /> Neu generieren
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}