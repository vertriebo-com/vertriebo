import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PhoneCall, Loader2, RefreshCw, Sparkles,
  MessageCircle, Zap, Package, ShieldAlert, CheckCircle2, AlertTriangle
} from "lucide-react";

const SECTION_CONFIG = {
  einstieg:   { icon: MessageCircle, bg: "bg-blue-50",    border: "border-blue-200",    icon_bg: "bg-blue-100",    icon_color: "text-blue-600",    num: 1, label: "Einstieg" },
  aufhaenger: { icon: Zap,           bg: "bg-amber-50",   border: "border-amber-200",   icon_bg: "bg-amber-100",   icon_color: "text-amber-600",   num: 2, label: "Aufhänger" },
  angebot:    { icon: Package,       bg: "bg-emerald-50", border: "border-emerald-200", icon_bg: "bg-emerald-100", icon_color: "text-emerald-600", num: 3, label: "Unser Angebot" },
  einwaende:  { icon: ShieldAlert,   bg: "bg-rose-50",    border: "border-rose-200",    icon_bg: "bg-rose-100",    icon_color: "text-rose-600",    num: 4, label: "Einwand-Antworten" },
  abschluss:  { icon: CheckCircle2,  bg: "bg-purple-50",  border: "border-purple-200",  icon_bg: "bg-purple-100",  icon_color: "text-purple-600",  num: 5, label: "Abschluss" },
};

const SECTION_ORDER = ["einstieg", "aufhaenger", "angebot", "einwaende", "abschluss"];

// ─── Robust JSON extraction: strips fences, finds first { ... last } ──────────
function extractJsonFromText(raw) {
  if (!raw) return null;

  let cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[CallScript] JSON parse failed", { raw, cleaned, error: err?.message });
    return null;
  }
}

// ─── Fallback script built from local data ────────────────────────────────────
function buildFallbackScript(company, settings) {
  const ownCompany = settings?.firmenname || "[Ihr Unternehmen]";
  const services = settings?.dienstleistungen || "unsere Dienstleistungen";
  const contact = company.ansprechpartner || "die zuständige Person";
  const branche = company.branche || "Ihr Unternehmen";

  return {
    _isFallback: true,
    einstieg: {
      script: `Guten Tag, spreche ich mit ${contact}? Mein Name ist [Ihr Name] von ${ownCompany}. Ich melde mich kurz, weil wir Unternehmen wie ${branche} mit ${services} unterstützen.`,
      note: "Kurz, freundlich, kein Druck."
    },
    aufhaenger: {
      script: `Viele Betriebe in Ihrer Branche haben wenig Zeit, passende Dienstleister zu vergleichen – genau dort helfen wir unkompliziert weiter.`,
      note: "Problem des Kunden benennen."
    },
    angebot: {
      script: `Wir würden Ihnen gerne unverbindlich zeigen, ob unsere Leistung für Sie sinnvoll ist.`,
      bullets: [services, "Schnelle Umsetzung ohne großen Aufwand", "Transparente Konditionen ohne versteckte Kosten"],
      note: "Nutzen klar benennen."
    },
    einwaende: {
      note: "Ruhig bleiben, Verständnis zeigen.",
      objections: [
        { objection: "Wir haben bereits jemanden.", answer: "Das verstehe ich. Dann wäre vielleicht ein kurzer Vergleich interessant, falls Sie irgendwann eine Alternative benötigen." },
        { objection: "Kein Interesse.", answer: "Alles gut. Darf ich Ihnen trotzdem kurz unsere Kontaktdaten per E-Mail senden, falls später Bedarf entsteht?" }
      ]
    },
    abschluss: {
      script: `Wäre es für Sie in Ordnung, wenn ich Ihnen kurz eine E-Mail mit den wichtigsten Informationen sende – oder passt ein kurzes Gespräch nächste Woche?`,
      note: "Ziel: E-Mail-Erlaubnis oder Termin."
    }
  };
}

// ─── ScriptCard component ─────────────────────────────────────────────────────
function ScriptCard({ sectionKey, data }) {
  const cfg = SECTION_CONFIG[sectionKey];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-8 h-8 rounded-lg ${cfg.icon_bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${cfg.icon_color}`} />
        </div>
        <div>
          <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.icon_color}`}>{cfg.num}</span>
          <h3 className="text-sm font-bold text-slate-900 leading-tight">{cfg.label}</h3>
        </div>
        {data.note && (
          <span className="ml-auto text-[10px] text-slate-500 font-medium max-w-[180px] text-right leading-tight">{data.note}</span>
        )}
      </div>

      {data.script && (
        <div className={`rounded-lg border ${cfg.border} bg-white px-3 py-2.5 mb-2`}>
          <p className="text-sm text-slate-800 leading-relaxed">{data.script}</p>
        </div>
      )}

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

// ─── UsageLog upsert helper ───────────────────────────────────────────────────
async function incrementKiAction(orgId) {
  const now = new Date();
  const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const existing = await base44.entities.UsageLog.filter({ organization_id: orgId, period_month: periodMonth });
  if (existing.length > 0) {
    const log = existing[0];
    await base44.entities.UsageLog.update(log.id, {
      ai_actions_used: (log.ai_actions_used || 0) + 1,
    });
  } else {
    const periodStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString();
    const periodEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)).toISOString();
    await base44.entities.UsageLog.create({
      organization_id: orgId,
      period_month: periodMonth,
      period_start: periodStart,
      period_end: periodEnd,
      ai_actions_used: 1,
    });
  }
  console.info("[CallScript] UsageLog ki_actions_used +1 für org:", orgId);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CallScriptDialog({ company }) {
  const [open, setOpen] = useState(false);
  const [scriptData, setScriptData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [orgSettings, setOrgSettings] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [limitReached, setLimitReached] = useState(false);
  const generatingRef = useRef(false);

  const loadOrgSettings = async () => {
    if (orgSettings) return { settings: orgSettings, orgId };
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
      if (!org) return { settings: null, orgId: null };

      const settingsRecords = await base44.entities.OrganizationSettings.filter({ organization_id: org.id });
      const map = {};
      settingsRecords.forEach(s => { map[s.key] = s.value; });
      const s = {
        firmenname: map.company_name || org.name || "[Ihr Firmenname]",
        // Canonical Key: services; Legacy-Fallback: dienstleistungen
        dienstleistungen: map.services || map.dienstleistungen || "[Ihre Dienstleistungen]",
        // Canonical Key: target_customer_types; Legacy-Fallback: zielkunden
        zielkunden: map.target_customer_types || map.zielkunden || "",
        ausschluesse: map.excluded_customer_types || "",
        servicegebiet: map.service_area_city || map.service_area_plz || "",
        industrie: map.industry_name || map.own_industry || "",
      };
      setOrgSettings(s);
      setOrgId(org.id);
      return { settings: s, orgId: org.id, org };
    } catch (e) {
      console.error("[CallScript] loadOrgSettings failed:", e?.message);
      return { settings: null, orgId: null };
    }
  };

  const checkKiLimit = async (resolvedOrgId, org) => {
    if (!resolvedOrgId) return false;
    try {
      const now = new Date();
      const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [usageLogs, plans] = await Promise.all([
        base44.entities.UsageLog.filter({ organization_id: resolvedOrgId, period_month: periodMonth }),
        org?.plan_id ? base44.entities.Plan.filter({ id: org.plan_id }) : Promise.resolve([]),
      ]);
      const used = usageLogs[0]?.ai_actions_used || 0;
      const max = plans[0]?.max_ai_scorings_per_month ?? 50;
      if (max !== -1 && used >= max) {
        console.warn(`[CallScript] KI-Limit erreicht: ${used}/${max}`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const generateScript = async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setLoading(true);
    setScriptData(null);
    setIsFallback(false);
    setLimitReached(false);

    const { settings, orgId: resolvedOrgId, org } = await loadOrgSettings();

    // Limit-Check vor KI-Aufruf
    const isLimitReached = await checkKiLimit(resolvedOrgId, org);
    if (isLimitReached) {
      setLimitReached(true);
      setLoading(false);
      return;
    }

    const firmenname = settings?.firmenname || "[Ihr Firmenname]";
    const dienstleistungen = settings?.dienstleistungen || "[Ihre Dienstleistungen]";
    const zielkunden = settings?.zielkunden || "lokale Gewerbebetriebe";
    const ansprechpartner = company.ansprechpartner || "[Ansprechpartner]";
    const servicegebiet = settings?.servicegebiet || "";
    const ausschluesse = settings?.ausschluesse || "";
    const industrie = settings?.industrie || "";

    // Lead-Kontext aus Recherche-Engine
    const matchedZielgruppe = company.matched_target_customer_type || "";
    const serviceKontext = company.matched_service_context || "";
    const relevanzGrund = company.relevance_reason || "";

    let logs = [];
    try {
      logs = await base44.entities.ContactLog.filter({ company_id: company.id });
    } catch {}
    const recentLogs = logs
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 3);
    const logContext = recentLogs.length > 0
      ? recentLogs.map(l => `${l.typ}: ${l.ergebnis}${l.naechster_schritt ? " → " + l.naechster_schritt : ""}${l.notiz ? " – " + l.notiz : ""}`).join("; ")
      : "Kein bisheriger Kontakt";

    let parsed = null;
    let kiSucceeded = false;
    try {
      const llmPromise = base44.integrations.Core.InvokeLLM({
        model: "claude_sonnet_4_6",
        prompt: `Du erstellst einen strukturierten Gesprächsleitfaden als JSON für einen Kaltakquise-Anruf. ANTWORTE NUR MIT JSON.

UNSER UNTERNEHMEN (wir rufen an):
- Firmenname: ${firmenname}
- Unsere Branche / was wir tun: ${industrie || dienstleistungen}
- Unsere konkreten Leistungen: ${dienstleistungen}
- Unsere Zielkunden: ${zielkunden}
${ausschluesse ? `- Nicht passende Kunden (Ausschlüsse): ${ausschluesse}` : ""}
${servicegebiet ? `- Unser Servicegebiet: ${servicegebiet}` : ""}

ZIEL-FIRMA (wir rufen dort an):
- Firmenname: ${company.name}
- Branche der Zielfirma: ${company.branche || "Unbekannt"}
- Ort: ${company.ort || ""}
- Ansprechpartner: ${ansprechpartner}
${matchedZielgruppe ? `- Erkannte Zielgruppe: ${matchedZielgruppe} (diese Firma passt zu unserem Zielkundenprofil)` : ""}
${serviceKontext ? `- Relevanter Service-Kontext: ${serviceKontext}` : ""}
${relevanzGrund ? `- Warum dieser Lead relevant ist: ${relevanzGrund}` : ""}
- Bisherige Kontakte: ${logContext}

WICHTIG: Wir verkaufen UNSERE LEISTUNGEN (${dienstleistungen}) AN die Zielfirma.
Die Zielfirma ist POTENTIELLER KUNDE. Nutze den erkannten Zielgruppen-Kontext (${matchedZielgruppe || company.branche || "diese Branche"}) für konkrete, branchenspezifische Argumente.
Wenn vorherige Kontakte existieren, passe den Einstieg entsprechend an (kein generischer Kaltakquise-Einstieg).

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärungen). Format:
{
  "einstieg": { "script": "...", "note": "..." },
  "aufhaenger": { "script": "...", "note": "..." },
  "angebot": { "script": "...", "bullets": ["...", "..."], "note": "..." },
  "einwaende": { "objections": [{"objection": "...", "answer": "..."}, {"objection": "...", "answer": "..."}], "note": "..." },
  "abschluss": { "script": "...", "note": "..." }
}

Texte kurz, praxisnah, auf Deutsch. Keine Markdown-Zeichen in den Texten.`,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("KI-Anfrage hat zu lange gedauert. Bitte erneut versuchen.")), 45000)
      );
      const raw = await Promise.race([llmPromise, timeoutPromise]);

      if (raw && typeof raw === "object" && raw.einstieg) {
        parsed = raw;
        kiSucceeded = true;
        console.info("[CallScript] Direkt als Objekt erhalten ✓");
      } else if (typeof raw === "string") {
        parsed = extractJsonFromText(raw);
        if (parsed && parsed.einstieg) {
          kiSucceeded = true;
          console.info("[CallScript] JSON aus String extrahiert ✓");
        } else {
          console.warn("[CallScript] JSON-Extraktion fehlgeschlagen, verwende Fallback");
        }
      } else {
        console.warn("[CallScript] Unerwartetes Format:", typeof raw, raw);
      }
    } catch (e) {
      console.error("[CallScript] LLM-Aufruf fehlgeschlagen:", e?.message);
    }

    // UsageLog nur bei erfolgreicher KI-Generierung
    if (kiSucceeded && resolvedOrgId) {
      try {
        await incrementKiAction(resolvedOrgId);
      } catch (e) {
        console.error("[CallScript] UsageLog update fehlgeschlagen:", e?.message);
      }
    } else if (!kiSucceeded) {
      console.warn("[CallScript] Fallback verwendet – kein KI-Credit verbraucht");
    }

    // Fallback wenn kein valides JSON
    if (!parsed || !parsed.einstieg) {
      parsed = buildFallbackScript(company, settings);
      setIsFallback(true);
    } else {
      setIsFallback(false);
    }

    setScriptData(parsed);
    setLoading(false);
    generatingRef.current = false;
  };

  const handleOpen = () => {
    setOpen(true);
    if (!scriptData) generateScript();
  };

  return (
    <>
      <button onClick={handleOpen} className="inline-flex items-center gap-1.5 h-9 text-sm font-semibold border border-slate-200 bg-white text-slate-800 px-3 rounded-lg hover:bg-slate-50 transition-colors">
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
              <p className="text-sm font-semibold text-slate-700">Vertriebo erstellt deinen Gesprächsleitfaden…</p>
              <p className="text-xs text-slate-400">Optimiert für {company.branche || "die Branche"}</p>
            </div>
          ) : limitReached ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <p className="text-sm font-bold text-slate-900">Aktionslimit erreicht</p>
              <p className="text-xs text-slate-500">Ihr monatliches Kontingent für Vertriebo-Aktionen ist aufgebraucht. Bitte warten Sie bis zum nächsten Monat oder upgraden Sie Ihren Plan.</p>
            </div>
          ) : scriptData ? (
            <div className="space-y-3 pb-4">
              {/* Status-Badge */}
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                isFallback
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}>
                {isFallback
                    ? <><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Standard-Leitfaden</>
                    : <><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Vertriebo-Leitfaden erstellt für {company.branche || company.name}</>
                  }
              </div>

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