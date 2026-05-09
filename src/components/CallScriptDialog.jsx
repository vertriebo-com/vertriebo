import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PhoneCall, Loader2, RefreshCw, Sparkles,
  MessageCircle, Zap, Package, ShieldAlert, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

const SECTION_CONFIG = {
  einstieg:   { icon: MessageCircle, bg: "bg-blue-50",    border: "border-blue-200",    icon_bg: "bg-blue-100",    icon_color: "text-blue-600",    num: 1 },
  aufhaenger: { icon: Zap,           bg: "bg-amber-50",   border: "border-amber-200",   icon_bg: "bg-amber-100",   icon_color: "text-amber-600",   num: 2 },
  angebot:    { icon: Package,       bg: "bg-emerald-50", border: "border-emerald-200", icon_bg: "bg-emerald-100", icon_color: "text-emerald-600", num: 3 },
  einwaende:  { icon: ShieldAlert,   bg: "bg-rose-50",    border: "border-rose-200",    icon_bg: "bg-rose-100",    icon_color: "text-rose-600",    num: 4 },
  abschluss:  { icon: CheckCircle2,  bg: "bg-purple-50",  border: "border-purple-200",  icon_bg: "bg-purple-100",  icon_color: "text-purple-600",  num: 5 },
};

const SECTION_ORDER = ["einstieg", "aufhaenger", "angebot", "einwaende", "abschluss"];
const SECTION_LABELS = {
  einstieg: "Einstieg",
  aufhaenger: "Aufhänger",
  angebot: "Unser Angebot",
  einwaende: "Einwand-Antworten",
  abschluss: "Abschluss",
};

function ScriptCard({ sectionKey, data }) {
  const cfg = SECTION_CONFIG[sectionKey];
  const Icon = cfg.icon;
  const label = SECTION_LABELS[sectionKey];

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-8 h-8 rounded-lg ${cfg.icon_bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${cfg.icon_color}`} />
        </div>
        <div>
          <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.icon_color}`}>{cfg.num}</span>
          <h3 className="text-sm font-bold text-slate-900 leading-tight">{label}</h3>
        </div>
        {data.note && (
          <span className="ml-auto text-[10px] text-slate-400 font-medium italic max-w-[180px] text-right">{data.note}</span>
        )}
      </div>

      {/* Hauptskript */}
      {data.script && (
        <div className={`rounded-lg border ${cfg.border} bg-white px-3 py-2.5 mb-2`}>
          <p className="text-sm text-slate-800 leading-relaxed font-medium">{data.script}</p>
        </div>
      )}

      {/* Stichpunkte */}
      {data.bullets && data.bullets.length > 0 && (
        <ul className="space-y-1.5 mt-2">
          {data.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${cfg.icon_bg} inline-block`} />
              <p className="text-sm text-slate-700 leading-relaxed">{b}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Einwand-Paare */}
      {data.objections && data.objections.length > 0 && (
        <div className="space-y-2 mt-2">
          {data.objections.map((obj, i) => (
            <div key={i} className="rounded-lg bg-white border border-rose-100 p-3">
              <p className="text-xs font-bold text-rose-700 mb-1">💬 „{obj.objection}"</p>
              <p className="text-sm text-slate-700 leading-relaxed">→ {obj.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CallScriptDialog({ company }) {
  const [open, setOpen] = useState(false);
  const [scriptData, setScriptData] = useState(null);
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
        dienstleistungen: map.dienstleistungen || "[Ihre Dienstleistungen]",
        zielkunden: map.zielkunden || "",
        adresse: map.company_address || "",
        website: map.company_website || "",
      };
      setOrgSettings(s);
      return s;
    } catch {
      return null;
    }
  };

  const generateScript = async () => {
    setLoading(true);
    setScriptData(null);
    const settings = await loadOrgSettings();

    const firmenname = settings?.firmenname || "[Ihr Firmenname]";
    const dienstleistungen = settings?.dienstleistungen || "[Ihre Dienstleistungen]";
    const zielkunden = settings?.zielkunden || "";

    const logs = await base44.entities.ContactLog.filter({ company_id: company.id });
    const recentLogs = logs
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 3);
    const logContext = recentLogs.length > 0
      ? recentLogs.map(l => `${l.typ}: ${l.ergebnis}${l.notiz ? " – " + l.notiz : ""}`).join("; ")
      : "Kein bisheriger Kontakt";

    const ansprechpartner = company.ansprechpartner || "[Ansprechpartner]";

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        model: "claude_sonnet_4_6",
        response_json_schema: {
          type: "object",
          properties: {
            einstieg: {
              type: "object",
              properties: {
                script: { type: "string" },
                note: { type: "string" }
              }
            },
            aufhaenger: {
              type: "object",
              properties: {
                script: { type: "string" },
                note: { type: "string" }
              }
            },
            angebot: {
              type: "object",
              properties: {
                script: { type: "string" },
                bullets: { type: "array", items: { type: "string" } },
                note: { type: "string" }
              }
            },
            einwaende: {
              type: "object",
              properties: {
                objections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      objection: { type: "string" },
                      answer: { type: "string" }
                    }
                  }
                },
                note: { type: "string" }
              }
            },
            abschluss: {
              type: "object",
              properties: {
                script: { type: "string" },
                note: { type: "string" }
              }
            }
          }
        },
        prompt: `Du erstellst einen strukturierten Gesprächsleitfaden für einen Kaltakquise-Anruf.

UNSER UNTERNEHMEN (wir rufen an):
- Firmenname: ${firmenname}
- Unsere Leistungen: ${dienstleistungen}
- Unsere Zielkunden: ${zielkunden || "lokale Gewerbebetriebe"}

ZIEL-FIRMA (wir rufen dort an):
- Firmenname: ${company.name}
- Branche der Zielfirma: ${company.branche || "Unbekannt"}
- Ort: ${company.ort || ""}
- Ansprechpartner: ${ansprechpartner}
- Bisherige Kontakte: ${logContext}

WICHTIG: Wir verkaufen UNSERE LEISTUNGEN (${dienstleistungen}) AN die Zielfirma (${company.name}).
Die Zielfirma ist POTENTIELLER KUNDE, kein Wettbewerber.
Passe den Leitfaden daran an, warum UNSERE LEISTUNGEN für eine Firma in der Branche "${company.branche || "dieser Branche"}" nützlich sind.

Erstelle einen kurzen, praxisnahen Leitfaden auf Deutsch mit 5 Sektionen:
1. einstieg: Begrüßung + Vorstellung (2 Sätze, direkte Ansprache an ${ansprechpartner})
2. aufhaenger: Warum dieser Anruf? Branchenbezug herstellen (1-2 Sätze)
3. angebot: Was bieten wir konkret an (script = 1 Satz, bullets = 2-3 Punkte)
4. einwaende: 2 typische Einwände mit Antworten (objections array)
5. abschluss: Terminvereinbarung / nächster Schritt (1-2 Sätze)

Kurz, locker, überzeugend. Keine Markdown-Zeichen.`,
      });

      if (result && typeof result === "object" && result.einstieg) {
        setScriptData(result);
      } else {
        toast.error("Leitfaden konnte nicht strukturiert werden. Bitte erneut versuchen.");
      }
    } catch (e) {
      toast.error("Leitfaden konnte nicht generiert werden");
      console.error(e);
    }
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(true);
    if (!scriptData) generateScript();
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
          ) : scriptData ? (
            <div className="space-y-3 pb-2">
              {SECTION_ORDER.map(key => scriptData[key] ? (
                <ScriptCard key={key} sectionKey={key} data={scriptData[key]} />
              ) : null)}
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