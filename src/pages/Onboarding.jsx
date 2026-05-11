import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Building2, MapPin, Target, Mail, Zap, CheckCircle2, Users, Shield, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { INDUSTRIES } from "@/utils/onboardingConfig";
import { INDUSTRY_PRESETS, getIndustryPreset, getIndustryIdByLabel } from "@/utils/industryTargetPresets";
import ServicesStep from "@/components/onboarding/ServicesStep";
import LeadTargetingStep from "@/components/onboarding/LeadTargetingStep";
import IdealCustomerStep from "@/components/onboarding/IdealCustomerStep";
import EmailSetupStep from "@/components/onboarding/EmailSetupStep";
import StartLeadsStep from "@/components/onboarding/StartLeadsStep";

const STEPS = [
  { id: "company", label: "Unternehmen", icon: Building2 },
  { id: "services", label: "Leistungen", icon: Target },
  { id: "targeting", label: "Zielkunden", icon: Users },
  { id: "ideal", label: "Idealer Kunde", icon: Shield },
  { id: "area", label: "Gebiet", icon: MapPin },
  { id: "email", label: "E-Mail", icon: Mail },
  { id: "leads", label: "Erste Leads", icon: Zap },
];

const Spinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

export default function Onboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 0: Company
  const [firmenname, setFirmenname] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Step 1: Services
  const [services, setServices] = useState([]);

  // Step 2: Lead Targeting
  const [targetCustomers, setTargetCustomers] = useState([]);
  const [customTargets, setCustomTargets] = useState([]);
  const [excluded, setExcluded] = useState([]);
  const [customExcluded, setCustomExcluded] = useState([]);

  // Step 3: Ideal Customer
  const [idealCustomer, setIdealCustomer] = useState(null);

  // Step 4: Area
  const [plz, setPlz] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(25);
  const [targetLocationsInput, setTargetLocationsInput] = useState("");
  const [targetLocations, setTargetLocations] = useState([]);

  // Step 5: Email
  // Managed in EmailSetupStep

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!me) { navigate("/"); return; }
        setUser(me);

        const orgs = await base44.entities.Organization.filter({ owner_email: me.email });
        if (orgs?.[0]) {
          const existingOrg = orgs[0];
          setOrg(existingOrg);
          setFirmenname(existingOrg.name || "");
          if (existingOrg.onboarding_done) {
            navigate("/dashboard");
            return;
          }
        }
      } catch (e) {
        console.error("Onboarding init error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Step 0: Company ──────────────────────────────────────────────────────
  const handleCompanyNext = async () => {
    if (!firmenname.trim()) { toast.error("Bitte geben Sie Ihren Firmennamen ein."); return; }
    if (!selectedIndustry) { toast.error("Bitte wählen Sie Ihre Branche aus."); return; }
    
    setSaving(true);
    try {
      let currentOrg = org;
      if (!currentOrg) {
        currentOrg = await base44.entities.Organization.create({
          name: firmenname.trim(),
          owner_email: user.email,
          status: "active",
          billing_status: "trialing",
          onboarding_done: false,
          industry: selectedIndustry.name,
        });
        await base44.entities.OrganizationMember.create({
          organization_id: currentOrg.id,
          user_email: user.email,
          role: "organization_admin",
          status: "active",
          invited_by: user.email,
        });
        setOrg(currentOrg);
      } else {
        await base44.entities.Organization.update(currentOrg.id, {
          name: firmenname.trim(),
          industry: selectedIndustry.name,
        });
      }

      // Save settings
      const settings = [
        { key: "own_industry", value: selectedIndustry.name },
        ...(website ? [{ key: "website", value: website }] : []),
        ...(phone ? [{ key: "phone", value: phone }] : []),
        ...(address ? [{ key: "address", value: address }] : []),
      ];
      for (const s of settings) {
        const existing = await base44.entities.OrganizationSettings.filter({ organization_id: currentOrg.id, key: s.key });
        if (existing?.[0]) {
          await base44.entities.OrganizationSettings.update(existing[0].id, { value: s.value });
        } else {
          await base44.entities.OrganizationSettings.create({ organization_id: currentOrg.id, ...s });
        }
      }
      setOrg(currentOrg);
      setCurrentStep(1);
    } catch (e) {
      toast.error("Fehler: " + e.message);
    }
    setSaving(false);
  };

  // ── Step 1: Services ─────────────────────────────────────────────────────
   const handleServicesNext = async (data) => {
     setSaving(true);
     try {
       // Canonical Key: services (no legacy duplicate)
       const servicesStr = data.services.join(", ");
       const existing = await base44.entities.OrganizationSettings.filter({ organization_id: org.id, key: "services" });
       if (existing?.[0]) {
         await base44.entities.OrganizationSettings.update(existing[0].id, { value: servicesStr });
       } else {
         await base44.entities.OrganizationSettings.create({ organization_id: org.id, key: "services", value: servicesStr });
       }
       setServices(data.services);
       setCurrentStep(2);
     } catch (e) {
       toast.error("Fehler: " + e.message);
     }
     setSaving(false);
   };

  // ── Step 2: Lead Targeting ───────────────────────────────────────────────
   const handleTargetingNext = async (data) => {
     setSaving(true);
     try {
       // Canonical Keys: target_customer_types, excluded_customer_types
       // Excluded values stored cleanly (no "Keine" prefix)
       const settings = [
         { key: "target_customer_types", value: data.target_customer_types.join(", ") },
         { key: "excluded_customer_types", value: data.excluded_customer_types.join(", ") },
       ];
       for (const s of settings) {
         if (!s.value) continue;
         const existing = await base44.entities.OrganizationSettings.filter({ organization_id: org.id, key: s.key });
         if (existing?.[0]) {
           await base44.entities.OrganizationSettings.update(existing[0].id, { value: s.value });
         } else {
           await base44.entities.OrganizationSettings.create({ organization_id: org.id, key: s.key, value: s.value });
         }
       }
       setTargetCustomers(data.target_customer_types);
       setExcluded(data.excluded_customer_types);
       setCurrentStep(3);
     } catch (e) {
       toast.error("Fehler: " + e.message);
     }
     setSaving(false);
   };

  // ── Step 3: Ideal Customer ───────────────────────────────────────────────
  const handleIdealNext = async (data) => {
    setSaving(true);
    try {
      const existing = await base44.entities.OrganizationSettings.filter({ organization_id: org.id, key: "ideal_customer_profile" });
      const value = JSON.stringify(data.ideal_customer_profile);
      if (existing?.[0]) {
        await base44.entities.OrganizationSettings.update(existing[0].id, { value });
      } else {
        await base44.entities.OrganizationSettings.create({ organization_id: org.id, key: "ideal_customer_profile", value });
      }
      setIdealCustomer(data.ideal_customer_profile);
      setCurrentStep(4);
    } catch (e) {
      toast.error("Fehler: " + e.message);
    }
    setSaving(false);
  };

  // ── Step 4: Area ─────────────────────────────────────────────────────────
  const handleAreaNext = async () => {
    if (!plz.trim()) { toast.error("Bitte geben Sie Ihre PLZ ein."); return; }
    if (!city.trim()) { toast.error("Bitte geben Sie Ihren Ort ein."); return; }

    setSaving(true);
    try {
      await base44.entities.Organization.update(org.id, {
        service_area_plz: plz.trim(),
        service_area_city: city.trim(),
        service_area_radius_km: radius,
      });

      const settings = [
        // Canonical keys for lead generation
        { key: "lead_plz", value: plz.trim() },
        { key: "lead_plz_city", value: city.trim() },
        { key: "lead_radius_km", value: String(radius) },
        { key: "target_locations", value: targetLocations.join(", ") },
        // Also save to service_area_ keys for compatibility
        { key: "service_area_plz", value: plz.trim() },
        { key: "service_area_city", value: city.trim() },
        { key: "service_area_radius_km", value: String(radius) },
      ];
      for (const s of settings) {
        const existing = await base44.entities.OrganizationSettings.filter({ organization_id: org.id, key: s.key });
        if (existing?.[0]) {
          await base44.entities.OrganizationSettings.update(existing[0].id, { value: s.value });
        } else {
          await base44.entities.OrganizationSettings.create({ organization_id: org.id, key: s.key, value: s.value });
        }
      }
      setPlz(plz.trim());
      setCity(city.trim());
      setCurrentStep(5);
    } catch (e) {
      toast.error("Fehler: " + e.message);
    }
    setSaving(false);
  };

  // ── Step 5: Email ────────────────────────────────────────────────────────
  const handleEmailNext = async () => {
    base44.functions.invoke("initOrgEmailTemplates", { organization_id: org.id }).catch(e => {
      console.warn("initOrgEmailTemplates failed:", e.message);
    });
    setCurrentStep(6);
  };

  // ── Step 6: Leads / Finish ───────────────────────────────────────────────
  const handleDone = async () => {
    setSaving(true);
    try {
      await base44.entities.Organization.update(org.id, {
        onboarding_done: true,
        onboarding_completed_at: new Date().toISOString(),
      });
      navigate("/dashboard");
    } catch (e) {
      toast.error("Fehler: " + e.message);
    }
    setSaving(false);
  };

  if (loading) return <Spinner />;

  return (
    <div className="min-h-screen bg-[#F6F8FB] flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center gap-3 shadow-sm">
        <img
          src="https://media.base44.com/images/public/69d8fb5b8dde510755b29a7e/7fe9f4d4d_Logo1HUWA.png"
          alt="Vertriebo"
          className="w-7 h-7 object-contain"
        />
        <span className="font-bold text-lg text-slate-900">Vertriebo</span>
        <span className="text-slate-600 text-sm ml-1 font-medium">– Einrichtung</span>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-12 overflow-x-auto pb-2">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const done = idx < currentStep;
            const active = idx === currentStep;
            return (
              <div key={step.id} className="flex items-center flex-shrink-0">
                <div className={`flex flex-col items-center gap-1 ${active ? "opacity-100" : done ? "opacity-80" : "opacity-30"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${active ? "bg-blue-600 text-white" : done ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-medium hidden sm:block text-slate-700">{step.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 w-6 sm:w-10 mx-1 ${idx < currentStep ? "bg-green-400" : "bg-slate-300"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 0: Company */}
        {currentStep === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Willkommen bei Vertriebo!</h2>
            <p className="text-sm font-medium text-slate-600 mb-6">Richten Sie Ihr Konto in wenigen Minuten ein.</p>

            <div className="space-y-4 mb-6">
              <div>
                <Label className="text-xs font-semibold text-slate-900 mb-2 block">Firmenname *</Label>
                <Input
                  value={firmenname}
                  onChange={e => setFirmenname(e.target.value)}
                  placeholder="z.B. Muster Gebäudeservice GmbH"
                  autoFocus
                  className="bg-white text-slate-900 border-slate-300"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-900 mb-2 block">Ihre Branche *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind.name}
                      type="button"
                      onClick={() => setSelectedIndustry(selectedIndustry?.name === ind.name ? null : ind)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm text-left transition-all ${
                        selectedIndustry?.name === ind.name
                          ? "border-blue-600 bg-blue-50 font-semibold text-blue-700"
                          : "border-slate-300 hover:border-blue-300 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="text-lg">{ind.icon}</span>
                      <span className="text-xs leading-tight">{ind.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-900 mb-2 block">Website (optional)</Label>
                  <Input
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="www.beispiel.de"
                    className="bg-white text-slate-900 border-slate-300"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-900 mb-2 block">Telefon (optional)</Label>
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+49 (0) 1234..."
                    className="bg-white text-slate-900 border-slate-300"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-900 mb-2 block">Adresse (optional)</Label>
                <Input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Straße, Hausnummer"
                  className="bg-white text-slate-900 border-slate-300"
                />
              </div>
            </div>

            <Button onClick={handleCompanyNext} disabled={saving || !firmenname.trim() || !selectedIndustry} className="w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Weiter
            </Button>
          </div>
        )}

        {/* Step 1: Services */}
        {currentStep === 1 && (
          <ServicesStep
            onBack={() => setCurrentStep(0)}
            onNext={handleServicesNext}
            loading={saving}
          />
        )}

        {/* Step 2: Lead Targeting */}
        {currentStep === 2 && (
          <LeadTargetingStep
            onBack={() => setCurrentStep(1)}
            onNext={handleTargetingNext}
            loading={saving}
          />
        )}

        {/* Step 3: Ideal Customer */}
        {currentStep === 3 && (
          <IdealCustomerStep
            onBack={() => setCurrentStep(2)}
            onNext={handleIdealNext}
            loading={saving}
          />
        )}

        {/* Step 4: Area */}
        {currentStep === 4 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Wo möchten Sie Kunden gewinnen?</h2>
            <p className="text-sm font-medium text-slate-600 mb-6">Vertriebo sucht Leads im definierten Umkreis Ihres Standorts.</p>

            <div className="space-y-5 mb-6">
              {/* Hauptstandort */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Hauptstandort</p>
                <p className="text-xs text-slate-500">Von welchem Standort aus arbeiten Sie?</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-900 mb-2 block">PLZ *</Label>
                    <Input
                      value={plz}
                      onChange={e => setPlz(e.target.value)}
                      placeholder="z.B. 20095"
                      maxLength={5}
                      className="bg-white text-slate-900 border-slate-300"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-900 mb-2 block">Ort *</Label>
                    <Input
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="z.B. Hamburg"
                      className="bg-white text-slate-900 border-slate-300"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-900 mb-2 block">
                    Suchradius: <span className="text-blue-600 font-bold">{radius} km</span>
                  </Label>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={radius}
                    onChange={e => setRadius(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>5 km</span><span>50 km</span><span>100 km</span>
                  </div>
                </div>
              </div>

              {/* Zielstädte */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Zusätzliche Zielorte <span className="normal-case font-normal text-slate-500">(optional)</span></p>
                <p className="text-xs text-slate-500">In welchen Städten/Regionen möchten Sie Kunden gewinnen? Diese werden zusätzlich zum Umkreis durchsucht.</p>
                <div className="flex gap-2">
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
                    placeholder="z.B. Köln, Berlin, München..."
                    className="bg-white text-slate-900 border-slate-300 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const v = targetLocationsInput.trim();
                      if (v && !targetLocations.includes(v)) setTargetLocations(prev => [...prev, v]);
                      setTargetLocationsInput("");
                    }}
                    className="shrink-0"
                  >
                    + Hinzufügen
                  </Button>
                </div>
                {targetLocations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {targetLocations.map(loc => (
                      <span key={loc} className="text-xs px-3 py-1.5 rounded-full border-2 border-blue-500 bg-blue-50 text-blue-700 font-semibold flex items-center gap-1">
                        📍 {loc}
                        <button type="button" onClick={() => setTargetLocations(prev => prev.filter(l => l !== loc))} className="ml-0.5 hover:text-red-600">×</button>
                      </span>
                    ))}
                  </div>
                )}
                {targetLocations.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Ohne Zielorte sucht Vertriebo automatisch in nahen Orten im Umkreis.</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(3)} disabled={saving}>Zurück</Button>
              <Button onClick={handleAreaNext} disabled={saving || !plz.trim() || !city.trim()} className="flex-1 gap-2 disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Weiter
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Email Setup */}
        {currentStep === 5 && (
          <EmailSetupStep
            firmenname={firmenname}
            userEmail={user?.email}
            onBack={() => setCurrentStep(4)}
            onNext={handleEmailNext}
            orgId={org?.id}
          />
        )}

        {/* Step 6: Start Free Preview */}
         {currentStep === 6 && (
           <div className="bg-white border border-slate-200 rounded-2xl p-6">
             <h2 className="text-xl font-bold text-slate-900 mb-1">✨ Ihr Vertriebo-Profil ist eingerichtet!</h2>
             <p className="text-sm font-medium text-slate-600 mb-6">Starten Sie jetzt Ihre kostenlose Vorschau.</p>

             <div className="space-y-5">
               {/* Free Preview Info */}
               <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                 <div className="flex items-start gap-3">
                   <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                   <div>
                     <p className="text-sm font-semibold text-blue-900">Kostenlose Vorschau starten</p>
                     <p className="text-xs text-blue-800 mt-1">Sie können bis zu 3 Firmenkontakte kostenlos testen und sehen, wie Vertriebo funktioniert.</p>
                   </div>
                 </div>
                 <div className="bg-blue-100 rounded-lg px-3 py-2">
                   <p className="text-xs text-blue-700 font-medium">📊 Kostenlose Vorschau: 3 Firmenkontakte</p>
                 </div>
               </div>

               {/* CTA for Preview */}
               <div className="space-y-2">
                 <Button 
                   onClick={handleDone}
                   disabled={saving}
                   className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5"
                 >
                   {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                   3 Vorschau-Kontakte finden
                 </Button>
                 <Button 
                   variant="outline"
                   onClick={() => window.location.href = "/settings"}
                   className="w-full gap-2 bg-white border-slate-300 text-slate-700 hover:bg-slate-50 py-2.5"
                 >
                   <ArrowRight className="w-4 h-4" />
                   Verifizierten Testzugang aktivieren
                 </Button>
               </div>

               {/* Why upgrade */}
               <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                 <p className="font-semibold text-slate-900">Warum upgraden?</p>
                 <ul className="space-y-1 text-slate-700">
                   <li>✓ Bis zu 25 Firmenkontakte pro Recherche</li>
                   <li>✓ Unbegrenzte KI-Analysen</li>
                   <li>✓ 14 Tage kostenlos testen</li>
                 </ul>
               </div>
             </div>
           </div>
         )}
      </div>
    </div>
  );
}