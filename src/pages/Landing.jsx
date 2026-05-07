import { useState, useEffect } from "react";
import { Check, Zap, Building2, Phone, ArrowRight, Info, Target, Mail, TrendingUp, Users, Shield, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import TargetIndustries from "@/components/landing/TargetIndustries";
import AppScreenshots from "@/components/landing/AppScreenshots";

const PLANS = [
  {
    name: "Starter",
    planId: "69fb1b37d7433caf98c34ff9",
    price: "99",
    description: "Für Einzelkämpfer",
    color: "border-border",
    features: [
      "2 Vertriebler",
      "300 gespeicherte Firmenkontakte",
      "100 Recherche-Credits",
      "CRM & Pipeline",
      "Basis-Reports",
      "500 E-Mails/Monat",
    ],
    footnotes: {
      leads: "Gespeicherte Kontakte in Ihrem CRM – Blacklist ausgenommen",
      credits: "Recherche-Credits werden für recherchierte oder angereicherte Firmenkontakte verwendet. Ein recherchierter Firmenkontakt verbraucht in der Regel einen Recherche-Credit.",
      emails: "E-Mail-Versand über angebundenen Versanddienstleister, mit eigener Reply-To-Adresse.",
    },
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
      "1.500 gespeicherte Firmenkontakte",
      "750 Recherche-Credits",
      "Alle Starter-Features",
      "KI-Morgenreport + Team-Auswertung",
      "Eigene E-Mail-Vorlagen",
      "2.000 E-Mails/Monat",
    ],
    footnotes: {
      leads: "Gespeicherte Kontakte in Ihrem CRM – Blacklist ausgenommen",
      credits: "Recherche-Credits werden für recherchierte oder angereicherte Firmenkontakte verwendet. Ein recherchierter Firmenkontakt verbraucht in der Regel einen Recherche-Credit.",
      emails: "E-Mail-Versand über angebundenen Versanddienstleister, mit eigener Reply-To-Adresse.",
    },
  },
  {
    name: "Gold",
    planId: "69fb7de571a0504da10ef985",
    price: "349",
    description: "Für ambitionierte Teams",
    color: "border-border",
    features: [
      "10 Vertriebler",
      "5.000 gespeicherte Firmenkontakte",
      "2.000 Recherche-Credits",
      "Alle Professional-Features",
      "1.000 KI-Aktionen",
      "5.000 E-Mails/Monat",
      "Priority Support",
    ],
    footnotes: {
      leads: "Gespeicherte Kontakte in Ihrem CRM",
      credits: "Recherche-Credits werden für recherchierte oder angereicherte Firmenkontakte verwendet. Ein recherchierter Firmenkontakt verbraucht in der Regel einen Recherche-Credit.",
      emails: "E-Mail-Versand über angebundenen Versanddienstleister, mit eigener Reply-To-Adresse.",
      ai: "KI-Aktionen umfassen z. B. Lead-Bewertung, E-Mail-Entwürfe, Gesprächseinstiege, Follow-up-Vorschläge und Vertriebs-Coaching.",
    },
  },
  {
    name: "Agency",
    planId: "69fb1b37d7433caf98c34ffb",
    price: "599",
    description: "Für größere Teams & Agenturen",
    color: "border-border",
    features: [
      "Individuelle Vertriebler-Anzahl",
      "15.000 gespeicherte Firmenkontakte",
      "5.000 Recherche-Credits",
      "Alle Gold-Features",
      "3.000 KI-Aktionen",
      "10.000 E-Mails/Monat",
      "Persönliches Onboarding",
    ],
    footnotes: {
      leads: "Gespeicherte Kontakte in Ihrem CRM",
      credits: "Recherche-Credits werden für recherchierte oder angereicherte Firmenkontakte verwendet. Ein recherchierter Firmenkontakt verbraucht in der Regel einen Recherche-Credit.",
      emails: "E-Mail-Versand über angebundenen Versanddienstleister, mit eigener Reply-To-Adresse.",
      ai: "KI-Aktionen umfassen z. B. Lead-Bewertung, E-Mail-Entwürfe, Gesprächseinstiege, Follow-up-Vorschläge und Vertriebs-Coaching.",
      fairuse: "Agency-Plan unterliegt Fair-Use-Richtlinien. Individuelle Limits nach Absprache.",
    },
  },
];

function Footnote({ text }) {
  return (
    <div className="flex items-start gap-1.5 mt-1.5 text-[10px] text-slate-500">
      <Info className="w-3 h-3 shrink-0 mt-0.5 opacity-60" />
      <span className="leading-relaxed opacity-80">{text}</span>
    </div>
  );
}

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
              Kostenlos testen
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 bg-blue-50 text-blue-700 border border-blue-200">
            <Zap className="w-3.5 h-3.5" /> Vertriebsmaschine für lokale Dienstleister
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-slate-900 leading-tight">
            Mehr Firmenkunden gewinnen –<br />ohne chaotische Listen und vergessene Rückrufe.
          </h1>
          <p className="text-lg max-w-3xl mx-auto mb-3 text-slate-600 leading-relaxed">
            Vertriebo findet passende Firmenkontakte, organisiert Ihre Vertriebsarbeit und zeigt Ihrem Team jeden Tag, 
            welche Leads als Nächstes dran sind.
          </p>
          <p className="text-sm max-w-2xl mx-auto text-slate-500 font-medium">
            Ideal für Gebäudereinigung, Hausmeisterdienste, Handwerk, Entrümpelung und lokale B2B-Dienstleister.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3.5 rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
            >
              Jetzt starten
            </button>
            <a
              href="#features"
              className="px-8 py-3.5 rounded-xl text-base font-bold text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 transition-all"
            >
              Wie es funktioniert
            </a>
          </div>
          
          {/* Trust Elements */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
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
      </div>

      {/* Problem → Lösung */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Problem */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Kenn Sie das?</h2>
            <div className="space-y-4">
              {[
                { text: "Firmenkontakte werden manuell in Excel gesucht", icon: "✕" },
                { text: "Rückrufe gehen im Tagesgeschäft unter", icon: "✕" },
                { text: "Vertriebler arbeiten ohne klare Prioritäten", icon: "✕" },
                { text: "E-Mail-Vorlagen fehlen oder sind veraltet", icon: "✕" },
                { text: "Follow-ups werden vergessen", icon: "✕" },
                { text: "Niemand sieht, was wirklich im Vertrieb passiert", icon: "✕" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs font-bold">{item.icon}</span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lösung */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Mit Vertriebo anders:</h2>
            <div className="space-y-4">
              {[
                { text: "Automatische Firmenkontakte-Recherche via Google Places", icon: <Check className="w-3 h-3" /> },
                { text: "KI-priorisierte Leads – Sie wissen, wen Sie zuerst anrufen", icon: <Check className="w-3 h-3" /> },
                { text: "Tägliche Aufgaben & Rückrufe – klar und verbindlich", icon: <Check className="w-3 h-3" /> },
                { text: "E-Mail-Vorlagen & Signaturen – professionell & konsistent", icon: <Check className="w-3 h-3" /> },
                { text: "Automatische Follow-ups – kein Lead geht verloren", icon: <Check className="w-3 h-3" /> },
                { text: "Vertriebs-Reports – sehen Sie, was Ihr Team leistet", icon: <Check className="w-3 h-3" /> },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-emerald-600">{item.icon}</span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="bg-slate-50 border-y border-slate-200 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-900">Ihr komplettes Vertriebssystem</h2>
          <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
            Alles, was Sie für systematische Neukundengewinnung brauchen – in einer Plattform.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Building2 className="w-6 h-6 text-blue-600" />,
                title: "Firmenkontakte recherchieren",
                desc: "Google Places Integration findet automatisch passende Firmen in Ihrem Zielgebiet. Branche, PLZ, Umkreis – alles konfigurierbar.",
              },
              {
                icon: <Target className="w-6 h-6 text-blue-600" />,
                title: "Leads priorisieren",
                desc: "KI-basiertes Scoring zeigt Ihnen, welche Firmen am vielversprechendsten sind. Heiße Leads zuerst, Kalte später.",
              },
              {
                icon: <Phone className="w-6 h-6 text-blue-600" />,
                title: "Rückrufe organisieren",
                desc: "Das System erstellt automatisch Rückruf-Aufgaben. Mit Fristen, Erinnerungen und Eskalation bei Nicht-Erledigung.",
              },
              {
                icon: <Mail className="w-6 h-6 text-blue-600" />,
                title: "E-Mail-Vorlagen & Signaturen",
                desc: "Professionelle Vorlagen für Erstkontakt, Angebote, Nachfassen. Mit Ihrem Logo, Ihrer Signatur, Ihrem Branding.",
              },
              {
                icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
                title: "Vertrieb messbar machen",
                desc: "Reports zeigen: Anrufe pro Tag, gewonnene Leads, Conversion-Raten. Sie sehen genau, was Ihr Team leistet.",
              },
              {
                icon: <Users className="w-6 h-6 text-blue-600" />,
                title: "Team & Rollen",
                desc: "Vertriebler, Admins, Organisation-Admins. Jeder sieht nur seine Leads. Mandantentrennung garantiert Datenschutz.",
              },
              {
                icon: <Calendar className="w-6 h-6 text-blue-600" />,
                title: "Pipeline-Management",
                desc: "7 Stufen von 'Neu' bis 'Gewonnen'. Sie sehen jederzeit, wo jeder Lead steht und was als Nächstes zu tun ist.",
              },
              {
                icon: <FileText className="w-6 h-6 text-blue-600" />,
                title: "Dokumente & Notizen",
                desc: "Alle Informationen zu jedem Lead an einem Ort. Kontaktdetails, Historie, Notizen, Anhänge – sofort griffbereit.",
              },
              {
                icon: <Shield className="w-6 h-6 text-blue-600" />,
                title: "DSGVO-orientierte Mandantentrennung",
                desc: "Jede Organisation hat ihre eigenen Daten. Keine Vermischung. Blacklist-Funktion schützt vor unerwünschten Kontakten.",
              },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zielgruppe */}
      <TargetIndustries />

      {/* App Screenshots */}
      <AppScreenshots />

      {/* Pricing */}
      <div id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4 text-slate-900">Einfache, transparente Preise</h2>
        <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
          Monatlich kündbar. Keine versteckten Kosten. Alle Features inklusive.
        </p>
        
        {/* Legende */}
        <div className="max-w-4xl mx-auto mb-10 p-5 rounded-xl bg-blue-50 border border-blue-200">
          <h3 className="text-sm font-bold text-blue-900 mb-3">Wichtige Begriffe:</h3>
          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <div>
                <strong className="text-blue-900">Gespeicherte Firmenkontakte:</strong>
                <span className="text-slate-700 ml-1">Kontakte in Ihrem CRM (Blacklist ausgenommen). Keine „Leads pro Monat" – Sie behalten alle Kontakte dauerhaft.</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <div>
                <strong className="text-blue-900">Recherche-Credits:</strong>
                <span className="text-slate-700 ml-1">Werden für recherchierte oder angereicherte Firmenkontakte verwendet. Ein recherchierter Firmenkontakt verbraucht in der Regel einen Recherche-Credit. Recherche-Läufe sind gestartete Suchvorgänge – je nach Ergebnis können dabei mehrere Credits verbraucht werden.</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <div>
                <strong className="text-blue-900">KI-Aktionen:</strong>
                <span className="text-slate-700 ml-1">Umfassen z. B. Lead-Bewertung, E-Mail-Entwürfe, Gesprächseinstiege, Follow-up-Vorschläge und Vertriebs-Coaching.</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <div>
                <strong className="text-blue-900">E-Mail-Versand:</strong>
                <span className="text-slate-700 ml-1">Über angebundenen Versanddienstleister (Brevo/SMTP). Antworten gehen an Ihre hinterlegte Reply-To-Adresse.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className="rounded-2xl p-6 relative flex flex-col border-2 bg-white"
              style={{
                borderColor: plan.popular ? "#2563EB" : "#E2E8F0",
                boxShadow: plan.popular ? "0 4px 24px rgba(37,99,235,0.15)" : "none"
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
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              
              {/* Footnotes */}
              <div className="mb-6 space-y-1">
                {plan.footnotes.leads && <Footnote text={plan.footnotes.leads} />}
                {plan.footnotes.credits && <Footnote text={plan.footnotes.credits} />}
                {plan.footnotes.emails && <Footnote text={plan.footnotes.emails} />}
                {plan.footnotes.ai && <Footnote text={plan.footnotes.ai} />}
                {plan.footnotes.fairuse && <Footnote text={plan.footnotes.fairuse} />}
              </div>

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
        
        <p className="text-center text-xs text-slate-500 mt-8">
          Alle Preise zzgl. MwSt. · Monatlich kündbar · Fair-Use für Agency-Plan
        </p>
      </div>

      {/* Final CTA */}
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
        </div>
      </div>

      {/* Footer */}
      <div className="py-10 text-center text-sm text-slate-500 border-t border-slate-200 bg-white">
        <p className="mb-4">© 2026 Vertriebo · Ein Produkt der Huwa Gebäudereinigung & Hausmeisterdienste GmbH</p>
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