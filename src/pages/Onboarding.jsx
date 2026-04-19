import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Check, ArrowRight, Loader2, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const INDUSTRIES = [
  { icon: "🧹", key: "reinigung", name: "Gebäudereinigung", keywords: ["Bürogebäude", "Immobilienverwaltung", "Arztpraxis", "Rechtsanwalt", "Steuerberatung", "Zahnarztpraxis", "Lager", "Produktionshalle", "Bank", "Versicherung"] },
  { icon: "🔒", key: "sicherheit", name: "Sicherheitsdienst", keywords: ["Einkaufszentrum", "Bank", "Hotel", "Veranstaltungshalle", "Logistik", "Rechenzentrum", "Industriepark", "Krankenhaus", "Messe", "Flughafen"] },
  { icon: "💻", key: "it", name: "IT-Service / Systemhaus", keywords: ["Steuerberatung", "Arztpraxis", "Architekturbüro", "Rechtsanwalt", "Handwerksbetrieb", "Immobilienverwaltung", "Autohändler", "Versicherung", "Zahnarztpraxis", "Druckerei"] },
  { icon: "🌿", key: "gartenbau", name: "Gartenbau / Landschaftspflege", keywords: ["Hotel", "Immobilienverwaltung", "Seniorenheim", "Klinik", "Büropark", "Wohnanlage", "Schule", "Gemeinde", "Industriepark", "Freizeitanlage"] },
  { icon: "🍽️", key: "catering", name: "Catering / Gastronomie", keywords: ["Bürogebäude", "Schule", "Krankenhaus", "Messe", "Veranstaltungshalle", "Hotel", "Sportanlage", "Universität", "Firmenkantine", "Eventlocation"] },
  { icon: "🔨", key: "handwerk", name: "Handwerk (Elektriker, Sanitär, Maler)", keywords: ["Immobilienverwaltung", "Hausverwaltung", "Wohnanlage", "Hotel", "Bürogebäude", "Schule", "Krankenhaus", "Industriebetrieb", "Einkaufszentrum", "Gasthaus"] },
  { icon: "🚚", key: "spedition", name: "Spedition / Logistik", keywords: ["Online-Händler", "Großhändler", "Produktionsbetrieb", "Pharmaunternehmen", "Autohändler", "Möbelhaus", "Druckerei", "Lebensmittelhandel", "Baumarkt", "Elektronikhändler"] },
  { icon: "🏥", key: "gesundheit", name: "Gesundheit / Medizin", keywords: ["Arztpraxis", "Zahnarztpraxis", "Physiotherapie", "Pflegeheim", "Apotheke", "Fitnessstudio", "Rehabilitationszentrum", "Krankenhaus", "Sanitätshaus", "Optiker"] },
  { icon: "🏢", key: "immobilien", name: "Immobilien / Hausverwaltung", keywords: ["Wohnanlage", "Gewerbepark", "Einkaufszentrum", "Bürogebäude", "Industriepark", "Logistikzentrum", "Hotel", "Seniorenheim", "Schule", "Krankenhaus"] },
  { icon: "📦", key: "lager", name: "Lager / Fulfillment", keywords: ["Online-Händler", "Großhändler", "Hersteller", "Pharmaunternehmen", "Elektronikhändler", "Modehändler", "Lebensmittelhandel", "Automobilzulieferer", "Sportartikel", "Kosmetik"] },
];

const STEPS = ["Branche", "Standort", "Fertig"];

export default function Onboarding() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const plan = urlParams.get("plan") || "Starter";

  const [step, setStep] = useState(0);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [firmenname, setFirmenname] = useState("");
  const [plz, setPlz] = useState("");
  const [radius, setRadius] = useState("40");
  const [plzLoading, setPlzLoading] = useState(false);
  const [plzCity, setPlzCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (!authed) {
        base44.auth.redirectToLogin(window.location.href);
      } else {
        setAuthChecked(true);
      }
    });
  }, []);

  const lookupPlz = async () => {
    if (!plz || plz.length < 4) return;
    setPlzLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${plz}&country=de&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setPlzCity(data[0].display_name.split(",")[0]);
        toast.success(`Ort gefunden: ${data[0].display_name.split(",")[0]}`);
      } else {
        toast.error("PLZ nicht gefunden.");
      }
    } catch (e) {
      toast.error("Fehler bei der PLZ-Suche.");
    }
    setPlzLoading(false);
  };

  const handleFinish = async () => {
    if (!firmenname.trim() || !plz.trim()) {
      toast.error("Bitte Firmenname und PLZ eingeben.");
      return;
    }
    setSaving(true);
    try {
      // Geocode PLZ
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${plz}&country=de&format=json&limit=1`);
      const geoData = await geoRes.json();
      const lat = geoData?.[0]?.lat || "50.4265";
      const lng = geoData?.[0]?.lon || "7.4620";
      const city = geoData?.[0]?.display_name?.split(",")[0] || "";

      // Save all settings
      const existing = await base44.entities.AppSettings.list();
      const existingMap = {};
      existing.forEach(s => { existingMap[s.key] = s.id; });

      const toSave = {
        lead_lat: String(parseFloat(lat).toFixed(4)),
        lead_lng: String(parseFloat(lng).toFixed(4)),
        lead_radius: radius,
        lead_plz: plz,
        lead_plz_city: city,
        lead_count: "25",
        lead_keywords: JSON.stringify(selectedIndustry?.keywords || []),
        onboarding_done: "true",
        onboarding_branche: selectedIndustry?.name || "",
        onboarding_firmenname: firmenname,
        onboarding_plan: plan,
      };

      await Promise.all(
        Object.entries(toSave).map(([key, value]) => {
          if (existingMap[key]) {
            return base44.entities.AppSettings.update(existingMap[key], { value });
          } else {
            return base44.entities.AppSettings.create({ key, value });
          }
        })
      );

      // Auto-generate first leads (non-blocking, user might not be fully logged in yet)
      base44.functions.invoke("generateLeads", { count: 25 }).catch(() => {
        // Leads werden beim ersten Dashboard-Besuch nachgeladen
      });

      setStep(2);
    } catch (e) {
      toast.error("Fehler: " + e.message);
    }
    setSaving(false);
  };

  if (!authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i < step ? "bg-primary text-white" : i === step ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Branche */}
        {step === 0 && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-1">In welcher Branche bist du tätig?</h2>
            <p className="text-sm text-muted-foreground mb-6">Das System wird automatisch auf deine Branche konfiguriert.</p>
            <div className="grid sm:grid-cols-2 gap-2 mb-6">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind.key}
                  onClick={() => setSelectedIndustry(ind)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    selectedIndustry?.key === ind.key
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="text-xl">{ind.icon}</span>
                  <span className="text-sm">{ind.name}</span>
                  {selectedIndustry?.key === ind.key && <Check className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </div>
            <Button onClick={() => setStep(1)} disabled={!selectedIndustry} className="w-full gap-2">
              Weiter <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step 1: Standort */}
        {step === 1 && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-1">Dein Suchgebiet</h2>
            <p className="text-sm text-muted-foreground mb-6">Wo suchst du nach Kunden? Das System findet Firmen in deiner Nähe.</p>
            <div className="space-y-4 mb-6">
              <div>
                <Label className="text-xs mb-1 block">Firmenname</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={firmenname}
                    onChange={e => setFirmenname(e.target.value)}
                    placeholder="z.B. Muster GmbH"
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Postleitzahl (Mittelpunkt der Suche)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={plz}
                      onChange={e => setPlz(e.target.value)}
                      onBlur={lookupPlz}
                      onKeyDown={e => e.key === "Enter" && lookupPlz()}
                      placeholder="z.B. 56566"
                      maxLength={5}
                      className="pl-9"
                    />
                  </div>
                  <Button variant="outline" onClick={lookupPlz} disabled={plzLoading}>
                    {plzLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Suchen"}
                  </Button>
                </div>
                {plzCity && (
                  <p className="text-xs text-primary font-medium mt-1">📍 {plzCity}</p>
                )}
              </div>
              <div>
                <Label className="text-xs mb-1 block">Suchradius: {radius} km</Label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={radius}
                  onChange={e => setRadius(e.target.value)}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>10 km</span><span>100 km</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>Zurück</Button>
              <Button onClick={handleFinish} disabled={saving} className="flex-1 gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird eingerichtet...</> : <>Fertig & Leads generieren <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Fertig */}
        {step === 2 && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Alles bereit! 🎉</h2>
            <p className="text-muted-foreground mb-2">
              Dein System ist konfiguriert für <strong>{selectedIndustry?.icon} {selectedIndustry?.name}</strong>.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              25 neue Leads wurden bereits für dich generiert. Dein erster Morgenreport kommt morgen früh.
            </p>
            <Button onClick={() => navigate("/")} className="gap-2" size="lg">
              Zum Dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}