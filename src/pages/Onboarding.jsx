import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Building2, MapPin, Target, Mail, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import EmailSetupStep from "@/components/onboarding/EmailSetupStep";
import SalesGoalsStep from "@/components/onboarding/SalesGoalsStep";
import StartLeadsStep from "@/components/onboarding/StartLeadsStep";

const STEPS = [
  { id: "company", label: "Unternehmen", icon: Building2 },
  { id: "area", label: "Gebiet", icon: MapPin },
  { id: "goals", label: "Vertriebsziele", icon: Target },
  { id: "email", label: "E-Mail", icon: Mail },
  { id: "leads", label: "Erste Leads", icon: Zap },
];

const INDUSTRIES = [
  { icon: "🧹", name: "Gebäudereinigung" },
  { icon: "🔒", name: "Sicherheitsdienst" },
  { icon: "💻", name: "IT-Service" },
  { icon: "🌿", name: "Gartenbau" },
  { icon: "🍽️", name: "Catering" },
  { icon: "🔨", name: "Handwerk" },
  { icon: "🚚", name: "Spedition / Logistik" },
  { icon: "🏥", name: "Gesundheit / Medizin" },
  { icon: "🏢", name: "Immobilien" },
  { icon: "📦", name: "Lager / Fulfillment" },
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

  // Step data
  const [firmenname, setFirmenname] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [plz, setPlz] = useState("");
  const [plzCity, setPlzCity] = useState("");
  const [radius, setRadius] = useState(25);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!me) { navigate("/"); return; }
        setUser(me);

        // Check for existing org
        const orgs = await base44.entities.Organization.filter({ owner_email: me.email });
        if (orgs?.[0]) {
          const existingOrg = orgs[0];
          setOrg(existingOrg);
          setFirmenname(existingOrg.name || "");
          // If onboarding already done → go to dashboard
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

  // ── Step 0: Company Info ──────────────────────────────────────────────────
  const handleCompanyNext = async () => {
    if (!firmenname.trim()) { toast.error("Bitte geben Sie Ihren Firmennamen ein."); return; }
    setSaving(true);
    try {
      let currentOrg = org;
      if (!currentOrg) {
        // Create org
        currentOrg = await base44.entities.Organization.create({
          name: firmenname.trim(),
          owner_email: user.email,
          status: "active",
          billing_status: "trialing",
          onboarding_done: false,
          industry: selectedIndustry?.name || "",
        });
        // Create member record
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
          industry: selectedIndustry?.name || currentOrg.industry || "",
        });
        setOrg({ ...currentOrg, name: firmenname.trim(), industry: selectedIndustry?.name || currentOrg.industry });
      }

      // Save company settings
      const settingsToSave = [
        { key: "company_name", value: firmenname.trim() },
        ...(selectedIndustry ? [{ key: "industry_name", value: selectedIndustry.name }] : []),
      ];
      for (const s of settingsToSave) {
        const existing = await base44.entities.OrganizationSettings.filter({ organization_id: currentOrg.id, key: s.key });
        if (existing?.[0]) {
          await base44.entities.OrganizationSettings.update(existing[0].id, { value: s.value });
        } else {
          await base44.entities.OrganizationSettings.create({ organization_id: currentOrg.id, ...s });
        }
      }

      setCurrentStep(1);
    } catch (e) {
      toast.error("Fehler: " + e.message);
    }
    setSaving(false);
  };

  // ── Step 1: Area ──────────────────────────────────────────────────────────
  const handleAreaNext = async () => {
    if (!plz.trim()) { toast.error("Bitte geben Sie Ihre PLZ ein."); return; }
    setSaving(true);
    try {
      await base44.entities.Organization.update(org.id, {
        service_area_plz: plz.trim(),
        service_area_radius_km: radius,
      });
      setOrg({ ...org, service_area_plz: plz.trim(), service_area_radius_km: radius });

      const settingsToSave = [
        { key: "lead_plz", value: plz.trim() },
        { key: "lead_radius_km", value: String(radius) },
        ...(plzCity ? [{ key: "lead_plz_city", value: plzCity }] : []),
      ];
      for (const s of settingsToSave) {
        const existing = await base44.entities.OrganizationSettings.filter({ organization_id: org.id, key: s.key });
        if (existing?.[0]) {
          await base44.entities.OrganizationSettings.update(existing[0].id, { value: s.value });
        } else {
          await base44.entities.OrganizationSettings.create({ organization_id: org.id, ...s });
        }
      }

      setCurrentStep(2);
    } catch (e) {
      toast.error("Fehler: " + e.message);
    }
    setSaving(false);
  };

  // ── Step 2: Sales Goals ───────────────────────────────────────────────────
  const handleGoalsNext = async (data) => {
    setSaving(true);
    try {
      const entries = [
        { key: "zielkunden", value: data.zielkunden.join(", ") },
        { key: "dienstleistungen", value: data.dienstleistungen.join(", ") },
        { key: "sales_goal_contacts_per_week", value: data.sales_goal_contacts_per_week },
        { key: "sales_goal_calls_per_week", value: data.sales_goal_calls_per_week },
        { key: "sales_goal_appointments_per_week", value: data.sales_goal_appointments_per_week },
        { key: "sales_goal_followup_days", value: data.sales_goal_followup_days },
        ...(data.sales_default_rep ? [{ key: "sales_default_rep", value: data.sales_default_rep }] : []),
      ];
      for (const s of entries) {
        if (!s.value) continue;
        const existing = await base44.entities.OrganizationSettings.filter({ organization_id: org.id, key: s.key });
        if (existing?.[0]) {
          await base44.entities.OrganizationSettings.update(existing[0].id, { value: String(s.value) });
        } else {
          await base44.entities.OrganizationSettings.create({ organization_id: org.id, key: s.key, value: String(s.value) });
        }
      }
      setCurrentStep(3);
    } catch (e) {
      toast.error("Fehler: " + e.message);
    }
    setSaving(false);
  };

  // ── Step 3: Email Setup ───────────────────────────────────────────────────
  const handleEmailNext = async (_emailData) => {
    // Initialize email templates after email setup (fire & forget)
    base44.functions.invoke("initOrgEmailTemplates", { organization_id: org.id }).catch(e => {
      console.warn("initOrgEmailTemplates failed:", e.message);
    });
    setCurrentStep(4);
  };

  // ── Step 4: Leads / Finish ────────────────────────────────────────────────
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
        <img
          src="https://media.base44.com/images/public/69d8fb5b8dde510755b29a7e/7fe9f4d4d_Logo1HUWA.png"
          alt="Vertriebo"
          className="w-7 h-7 object-contain"
        />
        <span className="font-bold text-lg">Vertriebo</span>
        <span className="text-muted-foreground text-sm ml-1">– Einrichtung</span>
      </div>

      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const done = idx < currentStep;
            const active = idx === currentStep;
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex flex-col items-center gap-1 ${active ? "opacity-100" : done ? "opacity-80" : "opacity-30"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-medium hidden sm:block">{step.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 w-6 sm:w-10 mx-1 ${idx < currentStep ? "bg-emerald-400" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 0: Company */}
        {currentStep === 0 && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-1">Willkommen bei Vertriebo!</h2>
            <p className="text-sm text-muted-foreground mb-6">Richten Sie Ihr Konto in wenigen Minuten ein.</p>

            <div className="space-y-4 mb-6">
              <div>
                <Label className="text-xs font-semibold mb-1 block">Firmenname *</Label>
                <Input
                  value={firmenname}
                  onChange={e => setFirmenname(e.target.value)}
                  placeholder="z.B. Muster Gebäudeservice GmbH"
                  autoFocus
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-2 block">Ihre Branche</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind.name}
                      type="button"
                      onClick={() => setSelectedIndustry(selectedIndustry?.name === ind.name ? null : ind)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm text-left transition-all ${
                        selectedIndustry?.name === ind.name
                          ? "border-primary bg-primary/10 font-semibold text-primary"
                          : "border-border hover:border-primary/40 text-muted-foreground"
                      }`}
                    >
                      <span className="text-lg">{ind.icon}</span>
                      <span className="text-xs leading-tight">{ind.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={handleCompanyNext} disabled={saving || !firmenname.trim()} className="w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Weiter
            </Button>
          </div>
        )}

        {/* Step 1: Service Area */}
        {currentStep === 1 && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-1">Ihr Suchgebiet</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Das System sucht Leads im definierten Umkreis Ihres Standorts.
            </p>

            <div className="space-y-4 mb-6">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">PLZ Ihres Standorts *</Label>
                  <Input
                    value={plz}
                    onChange={e => setPlz(e.target.value)}
                    placeholder="z.B. 56564"
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Ort (optional)</Label>
                  <Input
                    value={plzCity}
                    onChange={e => setPlzCity(e.target.value)}
                    placeholder="z.B. Neuwied"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-2 block">
                  Suchradius: <span className="text-primary font-bold">{radius} km</span>
                </Label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={radius}
                  onChange={e => setRadius(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5 km</span><span>50 km</span><span>100 km</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>Zurück</Button>
              <Button onClick={handleAreaNext} disabled={saving || !plz.trim()} className="flex-1 gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Weiter
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Sales Goals */}
        {currentStep === 2 && (
          <SalesGoalsStep
            onBack={() => setCurrentStep(1)}
            onNext={handleGoalsNext}
            industryName={selectedIndustry?.name}
          />
        )}

        {/* Step 3: Email Setup */}
        {currentStep === 3 && (
          <EmailSetupStep
            firmenname={firmenname}
            userEmail={user?.email}
            onBack={() => setCurrentStep(2)}
            onNext={handleEmailNext}
            orgId={org?.id}
          />
        )}

        {/* Step 4: Start Leads */}
        {currentStep === 4 && (
          <StartLeadsStep
            org={org}
            selectedIndustry={selectedIndustry}
            plz={plz}
            plzCity={plzCity}
            radius={radius}
            onDone={handleDone}
          />
        )}
      </div>
    </div>
  );
}