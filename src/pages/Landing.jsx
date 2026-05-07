import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Zap, Users, Building2, Phone, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PLANS = [
  {
    name: "Starter",
    planId: "69fb1b37d7433caf98c34ff9",
    price: "99",
    description: "Perfekt für Einzelkämpfer",
    color: "border-border",
    features: [
      "2 Vertriebler",
      "300 Leads pro Monat",
      "100 Recherche-Credits/Monat",
      "CRM & Pipeline",
      "KI-Morgenreport",
      "Google Maps Integration",
      "500 E-Mails/Monat",
    ],
  },
  {
    name: "Professional",
    planId: "69fb1b37d7433caf98c34ffa",
    price: "199",
    description: "Für wachsende Teams",
    color: "border-primary",
    popular: true,
    features: [
      "5 Vertriebler",
      "1.500 Leads pro Monat",
      "750 Recherche-Credits/Monat",
      "Alle Starter-Features",
      "Erweiterte Reports",
      "Eigene E-Mail-Vorlagen",
      "2.000 E-Mails/Monat",
    ],
  },
  {
    name: "Gold",
    planId: "69fb7de571a0504da10ef985",
    price: "349",
    description: "Für ambitionierte Teams",
    color: "border-border",
    features: [
      "10 Vertriebler",
      "5.000 Leads pro Monat",
      "2.000 Recherche-Credits/Monat",
      "Alle Professional-Features",
      "1.000 KI-Aktionen/Monat",
      "5.000 E-Mails/Monat",
      "Priority Support",
    ],
  },
  {
    name: "Agency",
    planId: "69fb1b37d7433caf98c34ffb",
    price: "599",
    description: "Für professionelle Agenturen",
    color: "border-border",
    features: [
      "Unbegrenzte Vertriebler",
      "Unbegrenzte Leads",
      "Unbegrenzte Recherche-Credits",
      "Alle Gold-Features",
      "Unbegrenzte KI-Aktionen",
      "Unbegrenzte E-Mails",
      "Individuelle Anpassungen & Onboarding",
    ],
  },
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

export default function Landing() {
  const [loading, setLoading] = useState(null);

  // Nach erfolgreichem Checkout → direkt zum Dashboard weiterleiten
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      window.location.href = "/dashboard";
    }
  }, []);

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.origin + "/dashboard");
  };

  const handleRegister = () => {
    base44.auth.redirectToLogin(window.location.origin + "/onboarding");
  };

  const handleCheckout = async (plan) => {
    if (window.self !== window.top) {
      alert("Der Checkout funktioniert nur in der veröffentlichten App, nicht in der Vorschau.");
      return;
    }
    setLoading(plan.name);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      // Nicht eingeloggt → zum Login, danach zurück zum Onboarding mit Plan-Parameter
      base44.auth.redirectToLogin(`${window.location.origin}/onboarding?plan_id=${plan.planId}&plan_name=${encodeURIComponent(plan.name)}`);
      return;
    }
    // Bereits eingeloggt → prüfen ob Organisation existiert
    try {
      const orgs = await base44.entities.Organization.filter({ owner_email: user.email });
      const org = orgs?.[0];
      if (!org) {
        // Hat Organisation noch nicht → Onboarding mit Plan starten
        window.location.href = `/onboarding?plan_id=${plan.planId}&plan_name=${encodeURIComponent(plan.name)}`;
        return;
      }
      const res = await base44.functions.invoke("createCheckoutSession", {
        organization_id: org.id,
        plan_id: plan.planId,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error(res.data?.error || "Kein Checkout-Link erhalten.");
      }
    } catch (e) {
      toast.error("Fehler beim Starten des Checkouts: " + e.message);
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen" style={{ background: "#0d1117" }}>
      {/* Navbar */}
      <nav style={{ background: "#0d1b2a" }} className="sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img
              src="https://media.base44.com/images/public/69d8fb5b8dde510755b29a7e/7fe9f4d4d_Logo1HUWA.png"
              alt="Vertriebo Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-white font-bold text-xl tracking-tight">Vertriebo</span>
          </div>
          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogin}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white border border-white/40 hover:border-white/70 hover:bg-white/5 transition-all"
            >
              Login
            </button>
            <button
              onClick={handleRegister}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-900 hover:opacity-90 transition-all"
              style={{ background: "#f5c542" }}
            >
              Registrieren
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/10" style={{ background: "#0d1b2a" }}>
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6" style={{ background: "rgba(99,179,237,0.12)", color: "#63b3ed" }}>
            <Zap className="w-3.5 h-3.5" /> KI-gestütztes Vertriebs-CRM
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-white">
            Mehr Kunden.<br />Weniger Aufwand.
          </h1>
          <p className="text-lg max-w-xl mx-auto mb-10" style={{ color: "rgba(255,255,255,0.65)" }}>
            Das All-in-One Vertriebssystem für Dienstleister – mit automatischer Lead-Generierung,
            KI-Morgenreport und vollständigem CRM.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3.5 rounded-xl text-base font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #38d9a9, #20c997)" }}
            >
              Jetzt starten
            </button>
          </div>
        </div>
      </div>

      {/* Branchen */}
      <div className="max-w-5xl mx-auto px-6 py-14">
        <p className="text-center text-sm font-semibold uppercase tracking-wider mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Für alle Dienstleistungsbranchen</p>
        <div className="flex flex-wrap justify-center gap-3">
          {INDUSTRIES.map(ind => (
            <span key={ind.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
              {ind.icon} {ind.name}
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="border-y py-14" style={{ background: "#111827", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10 text-white">Was ist drin?</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { icon: <Zap className="w-5 h-5" style={{ color: "#63b3ed" }} />, title: "Automatische Leads", desc: "Google Places generiert täglich neue Firmenkontakte in deinem Umkreis." },
              { icon: <Phone className="w-5 h-5" style={{ color: "#63b3ed" }} />, title: "\"Heute anrufen\"", desc: "Das System schlägt täglich die beste Firma zum Anrufen vor." },
              { icon: <Star className="w-5 h-5" style={{ color: "#63b3ed" }} />, title: "KI-Morgenreport", desc: "Jeder Vertriebler bekommt täglich seine Aufgaben und Rückrufe per E-Mail." },
              { icon: <Users className="w-5 h-5" style={{ color: "#63b3ed" }} />, title: "Team-Management", desc: "Aufgaben zuweisen, Fortschritt verfolgen, Teamziele setzen." },
              { icon: <Building2 className="w-5 h-5" style={{ color: "#63b3ed" }} />, title: "Vollständiges CRM", desc: "Pipeline, Kontakthistorie, Notizen, Dokumente – alles an einem Ort." },
              { icon: <ArrowRight className="w-5 h-5" style={{ color: "#63b3ed" }} />, title: "Branchen-Templates", desc: "Vorkonfiguriert für deine Branche – sofort startklar in Minuten." },
            ].map(f => (
              <div key={f.title} className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-1 text-white">{f.title}</h3>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2 text-white">Einfache Preise</h2>
        <p className="text-center mb-10" style={{ color: "rgba(255,255,255,0.5)" }}>Monatlich kündbar. Keine versteckten Kosten.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className="rounded-2xl p-6 relative flex flex-col"
              style={{
                background: plan.popular ? "rgba(99,179,237,0.1)" : "rgba(255,255,255,0.04)",
                border: plan.popular ? "2px solid #63b3ed" : "1px solid rgba(255,255,255,0.1)"
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: "#63b3ed" }}>
                  Beliebtester Plan
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">{plan.price}€</span>
                <span className="text-sm ml-1" style={{ color: "rgba(255,255,255,0.5)" }}>/Monat</span>
              </div>
              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#38d9a9" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(plan)}
                disabled={loading === plan.name}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
                style={plan.popular
                  ? { background: "#63b3ed", color: "#0d1117" }
                  : { background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }
                }
              >
                {loading === plan.name ? "Wird geladen..." : "Jetzt starten"}
              </button>
            </div>
          ))}
        </div>
        <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.35)" }}>
          Monatlich kündbar · Keine versteckten Kosten
        </p>
      </div>

      {/* Footer */}
      <div className="py-8 text-center text-sm" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
        <p className="mb-3">© 2026 Vertriebo · Ein Produkt der Huwa Gebäudereinigung & Hausmeisterdienste GmbH</p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/impressum" className="hover:text-white transition-colors">Impressum</a>
          <a href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</a>
          <a href="/agb" className="hover:text-white transition-colors">AGB</a>
          <a href="mailto:info@huwa-gebaeudedienste.de" className="hover:text-white transition-colors">Kontakt</a>
        </div>
      </div>
    </div>
  );
}