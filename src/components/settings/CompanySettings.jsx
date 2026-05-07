import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Save, Loader2, MapPin, Target, Users, Phone, Globe, Mail, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import SettingsSection from "./SettingsSection";

// ─── Zielkunden → Google Places Suchbegriffe Mapping ─────────────────────────
// Wird von generateLeads genutzt: Einstellungen → aktive Lead-Suche
export const ZIELKUNDEN_SEARCH_MAPPING = {
  "Hausverwaltungen":              ["Hausverwaltung", "Immobilienverwaltung", "WEG Verwaltung", "Property Management", "Wohnungsverwaltung"],
  "Büros":                         ["Büro", "Unternehmen", "Gewerbe", "Kanzlei", "Beratung"],
  "Arztpraxen":                    ["Arztpraxis", "Zahnarzt", "Physiotherapie", "Praxis", "Ärztehaus"],
  "Restaurants":                   ["Restaurant", "Café", "Gastronomie", "Bistro", "Imbiss"],
  "Immobilienfirmen":              ["Immobilienmakler", "Immobilienbüro", "Immobilienunternehmen", "Makler"],
  "Gewerbekunden":                 ["Gewerbebetrieb", "Handwerk", "Werkstatt", "Produktion", "Fabrik"],
  "Industrie":                     ["Industrieunternehmen", "Produktionsstätte", "Lager", "Logistik", "Fertigung"],
  "Logistik":                      ["Spedition", "Lagerhaus", "Logistikzentrum", "Fulfillment", "Transport"],
  "Schulen / Bildungseinrichtungen": ["Schule", "Gymnasium", "Berufsschule", "Kindergarten", "Bildungszentrum"],
  "Krankenhäuser / Kliniken":      ["Krankenhaus", "Klinik", "Pflegeheim", "Altenheim", "Reha"],
};

const ZIELKUNDEN_OPTIONS = Object.keys(ZIELKUNDEN_SEARCH_MAPPING);

const DIENSTLEISTUNGEN_OPTIONS = [
  "Gebäudereinigung","Büroreinigung","Treppenhausreinigung","Fensterreinigung",
  "Hausmeisterdienst","Entrümpelung","Gartenpflege","Winterdienst",
  "Sicherheitsdienst","IT-Service","Catering","Logistik / Transport",
];

const INDUSTRIES = [
  "Gebäudereinigung","Sicherheitsdienst","IT-Service","Gartenbau",
  "Catering","Handwerk","Spedition / Logistik","Gesundheit / Medizin","Immobilien","Lager / Fulfillment",
];

// Plan → max Radius in km
const PLAN_RADIUS_LIMITS = {
  starter:      25,
  professional: 50,
  gold:         100,
  agency:       null, // unbegrenzt
};

function getPlanRadiusLimit(planName) {
  if (!planName) return null;
  const lower = planName.toLowerCase();
  if (lower.includes("agency")) return PLAN_RADIUS_LIMITS.agency;
  if (lower.includes("gold")) return PLAN_RADIUS_LIMITS.gold;
  if (lower.includes("professional")) return PLAN_RADIUS_LIMITS.professional;
  if (lower.includes("starter")) return PLAN_RADIUS_LIMITS.starter;
  return null;
}

function normalizeUrl(val) {
  const v = val.trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return "https://" + v;
}

function isValidUrl(val) {
  if (!val) return true; // optional field
  try { new URL(normalizeUrl(val)); return true; } catch { return false; }
}

export default function CompanySettings({ org: orgProp }) {
  const [org, setOrg] = useState(orgProp || null);
  const [orgId, setOrgId] = useState(orgProp?.id || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]); // OrganizationMember list
  const [plan, setPlan] = useState(null);

  // Organization fields
  const [firmenname, setFirmenname] = useState("");
  const [industry, setIndustry] = useState("");

  // OrganizationSettings fields
  const [telefon, setTelefon] = useState("");
  const [website, setWebsite] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [adresse, setAdresse] = useState("");
  const [plz, setPlz] = useState("");
  const [radius, setRadius] = useState("25");
  const [plzCity, setPlzCity] = useState("");

  // Sales settings
  const [zielkunden, setZielkunden] = useState([]);
  const [customZielkunde, setCustomZielkunde] = useState("");
  const [dienstleistungen, setDienstleistungen] = useState([]);
  const [customDienst, setCustomDienst] = useState("");
  const [kontakteProWoche, setKontakteProWoche] = useState("20");
  const [anrufeProWoche, setAnrufeProWoche] = useState("30");
  const [termineProWoche, setTermineProWoche] = useState("3");
  const [followUpTage, setFollowUpTage] = useState("3");
  const [standardVertriebler, setStandardVertriebler] = useState("none");

  useEffect(() => { loadData(); }, []);

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
    if (found) { setOrg(found); setOrgId(found.id); }
    return found?.id || null;
  };

  const loadData = async () => {
    setLoading(true);
    const currentOrgId = await resolveOrg();
    if (!currentOrgId) { setLoading(false); return; }

    const [orgs, settings, orgMembers] = await Promise.all([
      base44.entities.Organization.filter({ id: currentOrgId }),
      base44.entities.OrganizationSettings.filter({ organization_id: currentOrgId }),
      base44.entities.OrganizationMember.filter({ organization_id: currentOrgId, status: "active" }),
    ]);

    const currentOrg = orgs[0] || null;
    if (currentOrg) {
      setOrg(currentOrg);
      setFirmenname(currentOrg.name || "");
      setIndustry(currentOrg.industry || "");

      // Load plan for radius limit
      if (currentOrg.plan_id) {
        const plans = await base44.entities.Plan.filter({ id: currentOrg.plan_id });
        setPlan(plans[0] || null);
      }
    }

    setMembers(orgMembers);

    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });

    setTelefon(map.email_telefon || map.company_phone || "");
    setWebsite(map.email_website || map.company_website || "");
    setAdresse(map.email_adresse || map.company_address || "");
    setPlz(currentOrg?.service_area_plz || map.lead_plz || "");
    setRadius(currentOrg?.service_area_radius_km ? String(currentOrg.service_area_radius_km) : map.lead_radius_km || "25");
    setPlzCity(map.lead_plz_city || "");
    setZielkunden(map.zielkunden ? map.zielkunden.split(", ").filter(Boolean) : []);
    setDienstleistungen(map.dienstleistungen ? map.dienstleistungen.split(", ").filter(Boolean) : []);
    setKontakteProWoche(map.sales_goal_contacts_per_week || "20");
    setAnrufeProWoche(map.sales_goal_calls_per_week || "30");
    setTermineProWoche(map.sales_goal_appointments_per_week || "3");
    setFollowUpTage(map.sales_goal_followup_days || "3");
    setStandardVertriebler(map.sales_default_rep || "none");

    setLoading(false);
  };

  const saveSettingKey = async (currentOrgId, existingMap, key, value) => {
    const strVal = String(value ?? "");
    if (existingMap[key]) {
      await base44.entities.OrganizationSettings.update(existingMap[key], { value: strVal });
    } else if (strVal) {
      await base44.entities.OrganizationSettings.create({ organization_id: currentOrgId, key, value: strVal });
    }
  };

  const handleWebsiteChange = (val) => {
    setWebsite(val);
    if (val && !isValidUrl(val)) {
      setWebsiteError("Bitte eine gültige URL eingeben, z.B. https://www.beispiel.de");
    } else {
      setWebsiteError("");
    }
  };

  const handleRadiusChange = (val) => {
    const maxKm = getPlanRadiusLimit(plan?.name);
    if (maxKm !== null && parseInt(val) > maxKm) {
      toast.warning(`Ihr Plan erlaubt max. ${maxKm} km Suchradius.`);
      setRadius(String(maxKm));
    } else {
      setRadius(val);
    }
  };

  const handleSave = async () => {
    if (!firmenname.trim()) { toast.error("Firmenname ist Pflichtfeld."); return; }
    if (website && !isValidUrl(website)) { toast.error("Bitte eine gültige Website-URL eingeben."); return; }

    setSaving(true);
    const currentOrgId = await resolveOrg();
    if (!currentOrgId) { toast.error("Keine Organisation gefunden."); setSaving(false); return; }

    const normalizedWebsite = normalizeUrl(website);

    // Build search keywords from selected Zielkunden
    const zielkundenKeywords = zielkunden
      .flatMap(z => ZIELKUNDEN_SEARCH_MAPPING[z] || [z])
      .join(", ");

    await base44.entities.Organization.update(currentOrgId, {
      name: firmenname.trim(),
      industry,
      service_area_plz: plz,
      service_area_radius_km: parseFloat(radius) || 25,
    });

    const existing = await base44.entities.OrganizationSettings.filter({ organization_id: currentOrgId });
    const existingMap = {};
    existing.forEach(s => { existingMap[s.key] = s.id; });

    const settingsToSave = {
      company_name:                    firmenname.trim(),
      industry_name:                   industry,
      email_telefon:                   telefon,
      company_phone:                   telefon,
      email_website:                   normalizedWebsite,
      company_website:                 normalizedWebsite,
      email_adresse:                   adresse,
      company_address:                 adresse,
      lead_plz:                        plz,
      lead_radius_km:                  radius,
      lead_plz_city:                   plzCity,
      zielkunden:                      zielkunden.join(", "),
      zielkunden_keywords:             zielkundenKeywords, // ← für generateLeads nutzbar
      dienstleistungen:                dienstleistungen.join(", "),
      sales_goal_contacts_per_week:    kontakteProWoche,
      sales_goal_calls_per_week:       anrufeProWoche,
      sales_goal_appointments_per_week: termineProWoche,
      sales_goal_followup_days:        followUpTage,
      sales_default_rep:               standardVertriebler === "none" ? "" : standardVertriebler,
    };

    await Promise.all(
      Object.entries(settingsToSave).map(([key, value]) => saveSettingKey(currentOrgId, existingMap, key, value))
    );

    toast.success("Unternehmensprofil gespeichert!");
    setSaving(false);
  };

  const toggleZielkunde = (v) => setZielkunden(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleDienst = (v) => setDienstleistungen(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const addCustomZielkunde = () => {
    const v = customZielkunde.trim();
    if (v && !zielkunden.includes(v)) setZielkunden(prev => [...prev, v]);
    setCustomZielkunde("");
  };
  const addCustomDienst = () => {
    const v = customDienst.trim();
    if (v && !dienstleistungen.includes(v)) setDienstleistungen(prev => [...prev, v]);
    setCustomDienst("");
  };

  const planRadiusLimit = getPlanRadiusLimit(plan?.name);
  const radiusOverLimit = planRadiusLimit !== null && parseInt(radius) > planRadiusLimit;

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Firmenstammdaten */}
      <SettingsSection icon={Building2} title="Unternehmensprofil" description="Firmenstammdaten – werden in E-Mails, PDFs und Vorlagen verwendet">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold mb-1 block">Firmenname *</Label>
            <Input value={firmenname} onChange={e => setFirmenname(e.target.value)} placeholder="Muster GmbH" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold mb-2 block">Branche</Label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(ind => (
                <button key={ind} type="button" onClick={() => setIndustry(industry === ind ? "" : ind)}
                  className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${industry === ind ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {ind}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> Telefon</Label>
            <Input value={telefon} onChange={e => setTelefon(e.target.value)} placeholder="02601/9131820" />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block flex items-center gap-1"><Globe className="w-3 h-3" /> Website</Label>
            <Input
              value={website}
              onChange={e => handleWebsiteChange(e.target.value)}
              placeholder="https://www.beispiel.de"
              type="url"
              className={websiteError ? "border-destructive" : ""}
            />
            {websiteError && <p className="text-[11px] text-destructive mt-0.5">{websiteError}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold mb-1 block">Adresse</Label>
            <Input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Musterstraße 1, 12345 Musterstadt" />
          </div>
        </div>
      </SettingsSection>

      {/* Suchgebiet */}
      <SettingsSection icon={MapPin} title="Hauptstandort & Suchgebiet" description="Wird für die Lead-Generierung und geografische Suche verwendet">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-semibold mb-1 block">PLZ *</Label>
            <Input value={plz} onChange={e => setPlz(e.target.value)} placeholder="56564" maxLength={5} />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Ort</Label>
            <Input value={plzCity} onChange={e => setPlzCity(e.target.value)} placeholder="Neuwied" />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">
              Suchradius: <span className={`font-bold ${radiusOverLimit ? "text-destructive" : "text-primary"}`}>{radius} km</span>
            </Label>
            <input
              type="range" min={5} max={100} step={5} value={radius}
              onChange={e => handleRadiusChange(e.target.value)}
              className="w-full accent-primary mt-2"
            />
            {planRadiusLimit !== null && (
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Info className="w-3 h-3" /> Ihr Plan erlaubt max. <strong>{planRadiusLimit} km</strong>
              </p>
            )}
          </div>
        </div>
        {radiusOverLimit && (
          <div className="flex items-center gap-2 mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Der gewählte Radius überschreitet Ihr Plan-Limit. Bitte auf max. {planRadiusLimit} km reduzieren oder auf einen höheren Plan wechseln.
          </div>
        )}
      </SettingsSection>

      {/* Zielkunden */}
      <SettingsSection icon={Users} title="Zielkunden & Dienstleistungen" description="Steuert Lead-Generierung, E-Mail-Vorlagen und KI-Skripte">
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold mb-1 block">Ihre Zielkunden</Label>
            <p className="text-[11px] text-muted-foreground mb-2">
              Die Auswahl bestimmt automatisch die Suchbegriffe für die Lead-Generierung via Google Places.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {ZIELKUNDEN_OPTIONS.map(v => (
                <button key={v} type="button" onClick={() => toggleZielkunde(v)}
                  className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${zielkunden.includes(v) ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {v}
                </button>
              ))}
              {zielkunden.filter(v => !ZIELKUNDEN_OPTIONS.includes(v)).map(v => (
                <span key={v} className="text-xs px-3 py-1.5 rounded-full border-2 border-primary bg-primary/10 text-primary font-semibold flex items-center gap-1">
                  {v}<button onClick={() => toggleZielkunde(v)} className="ml-0.5 hover:text-destructive">×</button>
                </span>
              ))}
            </div>
            {zielkunden.length > 0 && (
              <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <span className="font-semibold">Aktive Suchbegriffe:</span>{" "}
                {zielkunden.flatMap(z => ZIELKUNDEN_SEARCH_MAPPING[z] || [z]).slice(0, 8).join(", ")}
                {zielkunden.flatMap(z => ZIELKUNDEN_SEARCH_MAPPING[z] || [z]).length > 8 && " ..."}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <Input value={customZielkunde} onChange={e => setCustomZielkunde(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomZielkunde()}
                placeholder="Eigene Zielgruppe..." className="text-sm h-8" />
              <Button variant="outline" size="sm" onClick={addCustomZielkunde} className="shrink-0">+ Hinzufügen</Button>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">Ihre Dienstleistungen</Label>
            <p className="text-[11px] text-muted-foreground mb-2">
              Werden automatisch in E-Mail-Vorlagen, KI-Anrufskripten und Follow-up-Texten verwendet.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {DIENSTLEISTUNGEN_OPTIONS.map(v => (
                <button key={v} type="button" onClick={() => toggleDienst(v)}
                  className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${dienstleistungen.includes(v) ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {v}
                </button>
              ))}
              {dienstleistungen.filter(v => !DIENSTLEISTUNGEN_OPTIONS.includes(v)).map(v => (
                <span key={v} className="text-xs px-3 py-1.5 rounded-full border-2 border-primary bg-primary/10 text-primary font-semibold flex items-center gap-1">
                  {v}<button onClick={() => toggleDienst(v)} className="ml-0.5 hover:text-destructive">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={customDienst} onChange={e => setCustomDienst(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomDienst()}
                placeholder="Sonstige Leistung..." className="text-sm h-8" />
              <Button variant="outline" size="sm" onClick={addCustomDienst} className="shrink-0">+ Hinzufügen</Button>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Vertriebsziele */}
      <SettingsSection icon={Target} title="Vertriebsziele" description="Wöchentliche Ziele und Standard-Einstellungen für das Vertriebsteam">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Neue Kontakte/Woche", value: kontakteProWoche, set: setKontakteProWoche },
            { label: "Anrufe/Woche", value: anrufeProWoche, set: setAnrufeProWoche },
            { label: "Termine/Woche", value: termineProWoche, set: setTermineProWoche },
            { label: "Follow-up nach (Tage)", value: followUpTage, set: setFollowUpTage },
          ].map(item => (
            <div key={item.label}>
              <Label className="text-[11px] text-muted-foreground mb-1 block">{item.label}</Label>
              <Input type="number" min="1" value={item.value}
                onChange={e => item.set(e.target.value)} className="text-sm text-center font-bold" />
            </div>
          ))}
        </div>

        <div>
          <Label className="text-xs font-semibold mb-1 block flex items-center gap-1">
            <Mail className="w-3 h-3" /> Standard-Vertriebler
          </Label>
          <Select value={standardVertriebler} onValueChange={setStandardVertriebler}>
            <SelectTrigger>
              <SelectValue placeholder="Vertriebler auswählen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Keiner / manuell zuweisen</SelectItem>
              {members.map(m => (
                <SelectItem key={m.id} value={m.user_email}>
                  {m.user_email}
                  {m.role === "organization_admin" ? " (Admin)" : " (Vertriebler)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-0.5">Neu generierte Leads werden automatisch diesem Vertriebler zugewiesen</p>
        </div>
      </SettingsSection>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !!websiteError} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Wird gespeichert..." : "Änderungen speichern"}
        </Button>
      </div>
    </div>
  );
}