import { useState, useEffect } from "react";
import { Check, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import HowItWorks from "@/components/landing/HowItWorks";
import TargetIndustriesCompact from "@/components/landing/TargetIndustriesCompact";
import ProductShowcase from "@/components/landing/ProductShowcase";
import PricingFAQ from "@/components/landing/PricingFAQ";

const PLANS = [
  {
    name: "Starter",
    planId: "69fb1b37d7433caf98c34ff9",
    price: "99",
    description: "Für Einzelkämpfer",
    popular: false,
    features: [
      "2 Vertriebler",
      "300 gespeicherte Firmenkontakte",
      "100 Recherche-Credits",
      "CRM & Pipeline",
      "Basis-Reports",
      "500 E-Mails/Monat",
    ],
  },
  {
    name: "Professional",
    planId: "69fb1b37d7433caf98c34ffa",
    price: "199",
    description: "Für wachsende Teams",
    popular: true,
    features: [
      "5 Vertriebler",
      "1.500 gespeicherte Firmenkontakte",
      "750 Recherche-Credits",
      "Alle Starter-Features",
      "KI-Morgenreport + Team-Auswertung",
      "Eigene E-Mail-Vorlagen",
      "2.000 E-Mails/Monat",
    ],
  },
  {
    name: "Gold",
    planId: "69fb7de571a0504da10ef985",
    price: "349",
    description: "Für ambitionierte Teams",
    popular: false,
    features: [
      "10 Vertriebler",
      "5.000 gespeicherte Firmenkontakte",
      "2.000 Recherche-Credits",
      "Alle Professional-Features",
      "1.000 KI-Aktionen",
      "5.000 E-Mails/Monat",
      "Priority Support",
    ],
  },
  {
    name: "Agency",
    planId: "69fb1b37d7433caf98c34ffb",
    price: "599",
    description: "Für größere Teams & Agenturen",
    popular: false,
    features: [
      "Individuelle Vertriebler-Anzahl",
      "15.000 gespeicherte Firmenkontakte",
      "5.000 Recherche-Credits",
      "Alle Gold-Features",
      "3.000 KI-Aktionen",
      "10.000 E-Mails/Monat",
      "Persönliches Onboarding",
    ],
  },
];

export default function Landing() {
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      window.location.href = "/onboarding?checkout=success";
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
      base44.auth.redirectToLogin(`${window.location.origin}/onboarding?plan_id=${plan.planId}&plan_name=${encodeURIComponent(plan.name)}`);
      return;
    }
    try {
      const orgs = await base44.entities.Organization.filter({ owner_email: user.email });
      const org = orgs?.[0];
      if (!org) {
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
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="https://media.base44.com/images/public/69d8fb5b8dde510755b29a7e/7fe9f4d4d_Logo1HUWA.png" alt="Vertriebo Logo" className="w-8 h-8 object-contain" />
            <span className="text-slate-900 font-bold text-xl tracking-tight">Vertriebo</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogin} className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all">
              Login
            </button>
            <button onClick={handleRegister} className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">
              14 Tage testen
            </button>
          </div>
        </div>
      </nav>

      {/* A) Hero mit starkem Nutzenversprechen */}
      <div className="relative overflow-hidden bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Linke Seite: Headline + CTA */}
            <div className="text-left">
              <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-5 bg-blue-600 text-white">
                <Zap className="w-3.5 h-3.5 fill-white" /> Für lokale Dienstleister
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 text-slate-900 leading-tight">
                Ihr Vertriebssystem für<br />mehr Firmenkunden.
              </h1>
              <p className="text-lg mb-3 text-slate-600 leading-relaxed font-medium">
                Vertriebo zeigt Ihrem Team jeden Tag, welche Firmen es anrufen sollte – priorisiert, organisiert, nachverfolgbar.
              </p>
              <p className="text-sm mb-8 text-slate-500 font-medium">
                Für Gebäudereinigung, Hausmeister, Handwerk & lokale B2B-Dienstleister.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <button
                  onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
                  className="px-7 py-3.5 rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/25"
                >
                  14 Tage kostenlos testen
                </button>
                <a
                  href="#how-it-works"
                  className="px-7 py-3.5 rounded-xl text-base font-bold text-slate-700 border-2 border-slate-300 bg-white hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  Wie es funktioniert
                </a>
              </div>
              
              {/* Trust Badges */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" /> 14 Tage kostenlos
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" /> Monatlich kündbar
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" /> DSGVO-orientiert
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" /> Deutsches Produkt
                </div>
              </div>
            </div>

            {/* Rechte Seite: Dashboard-Mockup */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500" />
                  </div>
                  <div className="text-[10px] font-bold text-slate-600">app.vertriebo.de/dashboard</div>
                  <div className="w-12" />
                </div>
                <div className="p-5">
                  {/* Mini Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <p className="text-[10px] font-bold text-blue-700 uppercase">Heute fällig</p>
                      <p className="text-xl font-black text-blue-900">12</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase">Offene Leads</p>
                      <p className="text-xl font-black text-emerald-900">47</p>
                    </div>
                  </div>
                  {/* Prioritized Lead */}
                  <div className="bg-white rounded-lg p-3 border-2 border-red-200 bg-red-50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-red-700 uppercase">Priorität: Hoch</p>
                      <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Rückruf</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mb-1">Schmidt Gebäudereinigung GmbH</p>
                    <p className="text-[10px] text-slate-600 mb-2">Berlin · Zuletzt: Gestern</p>
                    <button className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded">
                      Jetzt anrufen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* B) Problem → Lösung (kompakt) */}
      <div className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3 text-slate-900">Schluss mit chaotischem Vertrieb</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Die meisten Dienstleister verlieren jeden Tag Chancen – nicht wegen schlechter Arbeit, sondern wegen fehlender Struktur.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              { emoji: "📊", title: "Manuelle Suche", desc: "Firmen werden mühsam in Excel oder Google Maps gesucht" },
              { emoji: "❌", title: "Vergessene Rückrufe", desc: "Wichtige Follow-ups gehen im Alltag unter" },
              { emoji: "🎯", title: "Keine Prioritäten", desc: "Vertriebler wissen nicht, wen sie zuerst anrufen sollten" },
            ].map((item, i) => (
              <div key={i} className="bg-white border border-red-200 rounded-xl p-5">
                <div className="text-3xl mb-3">{item.emoji}</div>
                <h3 className="font-bold text-red-900 mb-2">{item.title}</h3>
                <p className="text-sm text-red-800">{item.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="bg-blue-600 rounded-2xl p-6 md:p-8 text-white">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Mit Vertriebo anders:</h3>
                <p className="text-blue-100">
                  Ihr Team sieht jeden Morgen die priorisierten Leads, alle Kontakte sind dokumentiert, und Follow-ups entstehen automatisch.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* C) So funktioniert Vertriebo (3 Schritte) */}
      <div id="how-it-works">
        <HowItWorks />
      </div>

      {/* D) Produkt-Screenshots mit echtem UI */}
      <ProductShowcase />

      {/* E) Zielgruppen (kompakt als Tags) */}
      <TargetIndustriesCompact />

      {/* G) Preise */}
      <div id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4 text-slate-900">Einfache, transparente Preise</h2>
        <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
          Monatlich kündbar. Keine versteckten Kosten. 14 Tage kostenlos testen.
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 relative flex flex-col border-2 bg-white ${
                plan.popular ? "ring-2 ring-blue-600 ring-offset-2" : ""
              }`}
              style={{
                borderColor: plan.popular ? "#2563EB" : "#E2E8F0",
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white bg-blue-600">
                  Beliebtester Plan
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <p className="text-sm text-slate-600">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-slate-900">{plan.price}€</span>
                <span className="text-sm ml-1 text-slate-500">/Monat</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(plan)}
                disabled={loading === plan.name}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                  plan.popular
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                }`}
              >
                {loading === plan.name ? "Wird geladen..." : "Jetzt starten"}
              </button>
            </div>
          ))}
        </div>
        
        {/* FAQ unter den Preisen */}
        <PricingFAQ />
        
        <p className="text-center text-xs text-slate-500 mt-8">
          Alle Preise zzgl. MwSt. · Monatlich kündbar · Fair-Use für Agency-Plan
        </p>
      </div>

      {/* H) Abschluss-CTA */}
      <div className="bg-blue-600 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Starten Sie mit Vertriebo und bringen Sie Struktur in Ihre Neukundengewinnung.
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Keine Excel-Listen mehr. Keine vergessenen Rückrufe. Ein klares System für Ihren Vertriebserfolg.
          </p>
          <button
            onClick={handleRegister}
            className="px-8 py-4 rounded-xl text-base font-bold text-blue-600 bg-white hover:bg-blue-50 transition-all shadow-lg"
          >
            14 Tage kostenlos testen →
          </button>
          <p className="text-blue-200 text-sm mt-4">
            Ohne langfristige Bindung · Monatlich kündbar
          </p>
        </div>
      </div>

      {/* I) Footer */}
      <div className="py-10 text-center text-sm text-slate-500 border-t border-slate-200 bg-white">
        <p className="mb-4">© 2026 Vertriebo</p>
        <div className="flex flex-wrap justify-center gap-6">
          <a href="/impressum" className="hover:text-slate-900 transition-colors">Impressum</a>
          <a href="/datenschutz" className="hover:text-slate-900 transition-colors">Datenschutz</a>
          <a href="/agb" className="hover:text-slate-900 transition-colors">AGB</a>
          <a href="mailto:info@huwa-gebaeudedienste.de" className="hover:text-slate-900 transition-colors">Kontakt</a>
        </div>
      </div>
    </div>
  );
}