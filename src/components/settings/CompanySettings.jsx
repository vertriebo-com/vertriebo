import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Save, Loader2, MapPin, Target, Users, Phone, Globe, Mail, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// ─── Zielkunden → Google Places Suchbegriffe Mapping ─────────────────────────
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

const PLAN_RADIUS_LIMITS = {
  starter:      25,
  professional: 50,
  gold:         100,
  agency:       null,
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
  if (!val) return true;
  try { new URL(normalizeUrl(val)); return true; } catch { return false; }
}

export default function CompanySettings({ org: orgProp }) {
  const [org, setOrg] = useState(orgProp || null);
  const [orgId, setOrgId] = useState(orgProp?.id || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]);
  const [plan, setPlan] = useState(null);

  const [firmenname, setFirmenname] = useState("");
  const [industry, setIndustry] = useState("");
  const [telefon, setTelefon] = useState("");
  const [website, setWebsite] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [adresse, setAdresse] = useState("");
  const [plz, setPlz] = useState("");
  const [radius, setRadius] = useState("25");
  const [plzCity, setPlzCity] = useState("");
  const [targetLocations, setTargetLocations] = useState([]);
  const [targetLocationsInput, setTargetLocationsInput] = useState("");
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
    setPlzCity(map.lead_plz_city || map.service_area_city || "");
    setTargetLocations(map.target_locations ? map.target_locations.split(",").map(s => s.trim()).filter(Boolean) : []);
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
      // Always update existing records (including clearing them)
      await base44.entities.OrganizationSettings.update(existingMap[key], { value: strVal });
    } else if (strVal) {
      // Only create new records if there's a value
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
    const zielkundenKeywords = zielkunden.flatMap(z => ZIELKUNDEN_SEARCH_MAPPING[z] || [z]).join(", ");

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
      service_area_city:               plzCity,
      target_locations:                targetLocations.join(", "),
      zielkunden:                      zielkunden.join(", "),
      zielkunden_keywords:             zielkundenKeywords,
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
      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Card 1: Firmendaten */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="mb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Firmendaten</h3>
            <p className="text-xs font-medium text-slate-600 mt-0.5">Grundlegende Unternehmensinformationen</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-xs font-bold mb-1.5 block text-slate-800">Firmenname *</Label>
            <Input value={firmenname} onChange={e => setFirmenname(e.target.value)} placeholder="Muster GmbH" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-bold mb-2 block text-slate-800">Branche</Label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(ind => (
                <button key={ind} type="button" onClick={() => setIndustry(industry === ind ? "" : ind)}
                  className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all font-medium ${industry === ind ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-700 hover:border-primary/40 hover:text-slate-900"}`}>
                  {ind}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block flex items-center gap-1.5 text-slate-900">
              <Phone className="w-3.5 h-3.5 text-slate-500" /> Telefon
            </Label>
            <Input value={telefon} onChange={e => setTelefon(e.target.value)} placeholder="02601/9131820" />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block flex items-center gap-1.5 text-slate-900">
              <Globe className="w-3.5 h-3.5 text-slate-500" /> Website
            </Label>
            <Input
              value={website}
              onChange={e => handleWebsiteChange(e.target.value)}
              placeholder="https://www.beispiel.de"
              type="url"
              className={websiteError ? "border-destructive" : ""}
            />
            {websiteError && <p className="text-[11px] text-destructive mt-1">{websiteError}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold mb-1.5 block text-slate-900">Adresse</Label>
            <Input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Musterstraße 1, 12345 Musterstadt" />
          </div>
        </div>
      </div>

      {/* Card 2: Suchgebiet */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="mb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Hauptstandort & Suchgebiet</h3>
            <p className="text-xs font-medium text-slate-600 mt-0.5">Wird für die Lead-Generierung verwendet</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs font-bold mb-1.5 block text-slate-800">PLZ *</Label>
            <Input value={plz} onChange={e => setPlz(e.target.value)} placeholder="56564" maxLength={5} />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block text-slate-800">Ort</Label>
            <Input value={plzCity} onChange={e => setPlzCity(e.target.value)} placeholder="Neuwied" />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block text-slate-800">
              Suchradius: <span className={`font-bold ${radiusOverLimit ? "text-red-600" : "text-blue-600"}`}>{radius} km</span>
            </Label>
            <input
              type="range" min={5} max={100} step={5} value={radius}
              onChange={e => handleRadiusChange(e.target.value)}
              className="w-full accent-primary mt-2"
            />
            {planRadiusLimit !== null && (
              <p className="text-[11px] text-slate-600 font-medium mt-1.5 flex items-center gap-1">
                <Info className="w-3 h-3 text-slate-400" /> Ihr Plan erlaubt max. <strong>{planRadiusLimit} km</strong>
              </p>
            )}
          </div>
        </div>
        {radiusOverLimit && (
          <div className="flex items-start gap-2.5 mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div>
              Der gewählte Radius überschreitet Ihr Plan-Limit. Bitte auf max. {planRadiusLimit} km reduzieren oder auf einen höheren Plan wechseln.
            </div>
          </div>
        )}

        {/* Zielstädte */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <Label className="text-xs font-bold mb-1 block text-slate-800">Zusätzliche Zielorte <span className="font-normal text-slate-500">(optional)</span></Label>
          <p className="text-[11px] text-slate-500 mb-2">Städte/Regionen, die zusätzlich zum Umkreis durchsucht werden. Werden direkt als Suchgebiet genutzt.</p>
          <div className="flex gap-2 mb-2">
            <Input
              value={targetLocationsInput}
              onChange={e => setTargetLocationsInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && targetLocationsInput.trim()) {
                  const v = targetLocationsInput.trim();
                  if (!targetLocations.includes(v)) setTargetLocations(prev => [...prev, v]);
                  setTargetLocationsInput("");
                }
              }}
              placeholder="z.B. Köln, Neuwied, Berlin..."
              className="text-sm h-9"
            />
            <Button variant="outline" size="sm" className="shrink-0 h-9" onClick={() => {
              const v = targetLocationsInput.trim();
              if (v && !targetLocations.includes(v)) setTargetLocations(prev => [...prev, v]);
              setTargetLocationsInput("");
            }}>+ Hinzufügen</Button>
          </div>
          {targetLocations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {targetLocations.map(loc => (
                <span key={loc} className="text-xs px-3 py-1.5 rounded-full border-2 border-blue-500 bg-blue-50 text-blue-700 font-semibold flex items-center gap-1">
                  📍 {loc}
                  <button type="button" onClick={() => setTargetLocations(prev => prev.filter(l => l !== loc))} className="ml-0.5 hover:text-destructive">×</button>
                </span>
              ))}
            </div>
          )}
          {targetLocations.length === 0 && (
            <p className="text-[11px] text-slate-400 italic">Ohne Zielorte sucht Vertriebo automatisch nahe Orte im Umkreis.</p>
          )}
        </div>
      </div>

      {/* Card 3: Zielkunden & Leistungen */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="mb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Zielkunden & Dienstleistungen</h3>
            <p className="text-xs font-medium text-slate-600 mt-0.5">Steuert Lead-Generierung, E-Mail-Vorlagen und KI-Skripte</p>
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <Label className="text-xs font-bold mb-1.5 block text-slate-800">Ihre Zielkunden</Label>
            <p className="text-[11px] text-slate-600 font-medium mb-2.5">
              Die Auswahl bestimmt automatisch die Suchbegriffe für die Lead-Generierung via Google Places.
            </p>
            <div className="flex flex-wrap gap-2 mb-2.5">
              {ZIELKUNDEN_OPTIONS.map(v => (
                <button key={v} type="button" onClick={() => toggleZielkunde(v)}
                  className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all font-medium ${zielkunden.includes(v) ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-700 hover:border-primary/40 hover:text-slate-900"}`}>
                  {v}
                </button>
              ))}
              {zielkunden.filter(v => !ZIELKUNDEN_OPTIONS.includes(v)).map(v => (
                <span key={v} className="text-xs px-3 py-1.5 rounded-full border-2 border-primary bg-primary/10 text-primary font-medium flex items-center gap-1">
                  {v}<button onClick={() => toggleZielkunde(v)} className="ml-0.5 hover:text-destructive">×</button>
                </span>
              ))}
            </div>
            {zielkunden.length > 0 && (
              <div className="text-[11px] text-slate-600 font-medium bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                <span className="font-semibold text-slate-900">Aktive Suchbegriffe:</span>{" "}
                {zielkunden.flatMap(z => ZIELKUNDEN_SEARCH_MAPPING[z] || [z]).slice(0, 8).join(", ")}
                {zielkunden.flatMap(z => ZIELKUNDEN_SEARCH_MAPPING[z] || [z]).length > 8 && " ..."}
              </div>
            )}
            <div className="flex gap-2 mt-2.5">
              <Input value={customZielkunde} onChange={e => setCustomZielkunde(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomZielkunde()}
                placeholder="Eigene Zielgruppe..." className="text-sm h-9" />
              <Button variant="outline" size="sm" onClick={addCustomZielkunde} className="shrink-0 h-9">+ Hinzufügen</Button>
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold mb-1.5 block text-slate-800">Ihre Dienstleistungen</Label>
            <p className="text-[11px] text-slate-600 font-medium mb-2.5">
              Werden automatisch in E-Mail-Vorlagen, KI-Anrufskripten und Follow-up-Texten verwendet.
            </p>
            <div className="flex flex-wrap gap-2 mb-2.5">
              {DIENSTLEISTUNGEN_OPTIONS.map(v => (
                <button key={v} type="button" onClick={() => toggleDienst(v)}
                  className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all font-medium ${dienstleistungen.includes(v) ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-700 hover:border-primary/40 hover:text-slate-900"}`}>
                  {v}
                </button>
              ))}
              {dienstleistungen.filter(v => !DIENSTLEISTUNGEN_OPTIONS.includes(v)).map(v => (
                <span key={v} className="text-xs px-3 py-1.5 rounded-full border-2 border-primary bg-primary/10 text-primary font-medium flex items-center gap-1">
                  {v}<button onClick={() => toggleDienst(v)} className="ml-0.5 hover:text-destructive">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={customDienst} onChange={e => setCustomDienst(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomDienst()}
                placeholder="Sonstige Leistung..." className="text-sm h-9" />
              <Button variant="outline" size="sm" onClick={addCustomDienst} className="shrink-0 h-9">+ Hinzufügen</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Card 4: Vertriebsziele */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="mb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Vertriebsziele</h3>
            <p className="text-xs font-medium text-slate-600 mt-0.5">Wöchentliche Ziele und Standard-Einstellungen</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          {[
            { label: "Kontakte/Woche", value: kontakteProWoche, set: setKontakteProWoche },
            { label: "Anrufe/Woche", value: anrufeProWoche, set: setAnrufeProWoche },
            { label: "Termine/Woche", value: termineProWoche, set: setTermineProWoche },
            { label: "Follow-up (Tage)", value: followUpTage, set: setFollowUpTage },
          ].map(item => (
            <div key={item.label}>
              <Label className="text-xs font-bold text-slate-800 mb-1.5 block">{item.label}</Label>
              <Input type="number" min="1" value={item.value}
                onChange={e => item.set(e.target.value)} className="text-sm text-center font-semibold" />
            </div>
          ))}
        </div>

        <div>
          <Label className="text-xs font-semibold mb-1.5 block flex items-center gap-1.5 text-slate-900">
            <Mail className="w-3.5 h-3.5 text-slate-500" /> Standard-Vertriebler
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
          <p className="text-[11px] text-slate-600 font-medium mt-1.5">Neu generierte Leads werden automatisch diesem Vertriebler zugewiesen</p>
        </div>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 py-4 flex justify-end">
        <Button onClick={handleSave} disabled={saving || !!websiteError} className="gap-2 px-6 h-11 text-sm font-semibold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Wird gespeichert..." : "Änderungen speichern"}
        </Button>
      </div>
    </div>
  );
}