import { useState, useEffect } from "react";
import { Check, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import HowItWorks from "@/components/landing/HowItWorks";
import FeaturesCompact from "@/components/landing/FeaturesCompact";
import TargetIndustriesCompact from "@/components/landing/TargetIndustriesCompact";
import AppScreenshotsRealistic from "@/components/landing/AppScreenshotsRealistic";
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

      {/* A) Hero mit Produktmockup */}
      <div className="relative overflow-hidden bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Linke Seite: Text + CTA */}
            <div className="text-left">
              <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 bg-blue-50 text-blue-700 border border-blue-200">
                <Zap className="w-3.5 h-3.5" /> Vertriebsmaschine für lokale Dienstleister
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-slate-900 leading-tight">
                Mehr Firmenkunden gewinnen –<br />ohne chaotische Listen und vergessene Rückrufe.
              </h1>
              <p className="text-lg mb-4 text-slate-600 leading-relaxed">
                Vertriebo findet passende Firmenkontakte, organisiert Ihre Vertriebsarbeit und zeigt Ihrem Team jeden Tag, 
                welche Leads als Nächstes dran sind.
              </p>
              <p className="text-sm mb-8 text-slate-500 font-medium">
                Ideal für Gebäudereinigung, Hausmeisterdienste, Handwerk, Entrümpelung und lokale B2B-Dienstleister.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <button
                  onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-3.5 rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  14 Tage kostenlos testen
                </button>
                <a
                  href="#how-it-works"
                  className="px-8 py-3.5 rounded-xl text-base font-bold text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  Wie es funktioniert <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              
              {/* Trust Elements */}
              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Monatlich kündbar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Keine versteckten Kosten</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>DSGVO-orientierte Mandantentrennung</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Stripe-Abrechnung</span>
                </div>
              </div>
            </div>

            {/* Rechte Seite: Produkt-Mockup */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="text-xs text-slate-500 ml-2">Vertriebo Dashboard</span>
                </div>
                <div className="p-6 bg-gradient-to-br from-blue-50 to-white">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Heute fällig</p>
                        <p className="text-2xl font-bold text-slate-900">12 Rückrufe</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Check className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-slate-900">Firma {i} GmbH</p>
                              <p className="text-xs text-slate-500">Rückruf heute · Priorität: Hoch</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                              <Check className="w-4 h-4 text-emerald-600" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* B) Problem: Warum Vertrieb heute chaotisch läuft */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-slate-900">Warum Vertrieb heute oft chaotisch läuft</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Die meisten Dienstleister verlieren jeden Tag wertvolle Chancen – nicht wegen schlechter Arbeit, sondern wegen fehlender Struktur.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { emoji: "📊", title: "Manuelle Suche", desc: "Firmenkontakte werden mühsam in Excel oder Google Maps gesucht" },
            { emoji: "❌", title: "Vergessene Rückrufe", desc: "Wichtige Follow-ups gehen im Tagesgeschäft unter" },
            { emoji: "🎯", title: "Keine Prioritäten", desc: "Vertriebler wissen nicht, wen sie zuerst anrufen sollten" },
            { emoji: "📧", title: "Keine Vorlagen", desc: "E-Mails werden jedes Mal neu geschrieben – inkonsistent und zeitaufwändig" },
            { emoji: "📉", title: "Unsichtbarer Erfolg", desc: "Niemand sieht, was wirklich im Vertrieb passiert" },
            { emoji: "🔄", title: "Verlorene Leads", desc: "Follow-ups werden vergessen, potenzielle Kunden gehen verloren" },
          ].map((item, i) => (
            <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="text-3xl mb-3">{item.emoji}</div>
              <h3 className="font-bold text-red-900 mb-2">{item.title}</h3>
              <p className="text-sm text-red-800">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* C) Lösung: Was Vertriebo anders macht */}
      <FeaturesCompact />

      {/* D) So funktioniert Vertriebo in 3 Schritten */}
      <div id="how-it-works">
        <HowItWorks />
      </div>

      {/* E) Produkt-Screenshots / App-Bereiche */}
      <AppScreenshotsRealistic />

      {/* F) Für lokale Dienstleister */}
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