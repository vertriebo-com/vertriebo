import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Zap, Users, Building2, Phone, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PLANS = [
  {
    name: "Starter",
    price: "149",
    priceId: "price_1TNsvMBInRzoFM7CIzGEL3xT",
    description: "Perfekt für Einzelkämpfer",
    color: "border-border",
    features: [
      "1 Vertriebler",
      "100 Leads pro Monat",
      "CRM & Pipeline",
      "KI-Morgenreport",
      "Google Maps Integration",
      "E-Mail-Vorlagen",
    ],
  },
  {
    name: "Team",
    price: "349",
    priceId: "price_1TNsvMBInRzoFM7CdarnVM6t",
    description: "Für wachsende Teams",
    color: "border-primary",
    popular: true,
    features: [
      "Bis zu 5 Vertriebler",
      "500 Leads pro Monat",
      "Alle Starter-Features",
      "Teamziele & Statistiken",
      "Wochenberichte",
      "Aufgabenverteilung",
    ],
  },
  {
    name: "Agentur",
    price: "699",
    priceId: "price_1TNsvMBInRzoFM7CFBcAMm4g",
    description: "Für professionelle Agenturen",
    color: "border-border",
    features: [
      "Unbegrenzte Vertriebler",
      "2.000+ Leads pro Monat",
      "Alle Team-Features",
      "Priority Support",
      "Individuelle Anpassungen",
      "Onboarding-Beratung",
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

  const handleCheckout = async (plan) => {
    if (window.self !== window.top) {
      alert("Der Checkout funktioniert nur in der veröffentlichten App, nicht in der Vorschau.");
      return;
    }
    setLoading(plan.name);
    try {
      const res = await base44.functions.invoke("createCheckoutSession", {
        priceId: plan.priceId,
        planName: plan.name,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (e) {
      toast.error("Fehler beim Starten des Checkouts: " + e.message);
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" /> KI-gestütztes Vertriebs-CRM
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Mehr Kunden.<br />
            <span className="text-primary">Weniger Aufwand.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Das All-in-One Vertriebssystem für Dienstleister – mit automatischer Lead-Generierung,
            KI-Morgenreport und vollständigem CRM.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })} className="gap-2">
              Jetzt starten <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Branchen */}
      <div className="max-w-5xl mx-auto px-6 py-14">
        <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Für alle Dienstleistungsbranchen</p>
        <div className="flex flex-wrap justify-center gap-3">
          {INDUSTRIES.map(ind => (
            <span key={ind.name} className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full text-sm font-medium">
              {ind.icon} {ind.name}
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-muted/30 border-y border-border py-14">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">Was ist drin?</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { icon: <Zap className="w-5 h-5 text-primary" />, title: "Automatische Leads", desc: "Google Places generiert täglich neue Firmenkontakte in deinem Umkreis." },
              { icon: <Phone className="w-5 h-5 text-primary" />, title: "\"Heute anrufen\"", desc: "Das System schlägt täglich die beste Firma zum Anrufen vor." },
              { icon: <Star className="w-5 h-5 text-primary" />, title: "KI-Morgenreport", desc: "Jeder Vertriebler bekommt täglich seine Aufgaben und Rückrufe per E-Mail." },
              { icon: <Users className="w-5 h-5 text-primary" />, title: "Team-Management", desc: "Aufgaben zuweisen, Fortschritt verfolgen, Teamziele setzen." },
              { icon: <Building2 className="w-5 h-5 text-primary" />, title: "Vollständiges CRM", desc: "Pipeline, Kontakthistorie, Notizen, Dokumente – alles an einem Ort." },
              { icon: <ArrowRight className="w-5 h-5 text-primary" />, title: "Branchen-Templates", desc: "Vorkonfiguriert für deine Branche – sofort startklar in Minuten." },
            ].map(f => (
              <div key={f.title} className="bg-card border border-border rounded-xl p-5">
                <div className="mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Einfache Preise</h2>
        <p className="text-center text-muted-foreground mb-10">Monatlich kündbar. Keine versteckten Kosten.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div key={plan.name} className={`bg-card border-2 ${plan.color} rounded-2xl p-6 relative flex flex-col`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  Beliebtester Plan
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">{plan.price}€</span>
                <span className="text-muted-foreground text-sm">/Monat</span>
              </div>
              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleCheckout(plan)}
                disabled={loading === plan.name}
                variant={plan.popular ? "default" : "outline"}
                className="w-full"
              >
                {loading === plan.name ? "Wird geladen..." : "Jetzt starten"}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          14 Tage kostenlos testen · Keine Kreditkarte erforderlich für den Test
        </p>
      </div>

      {/* Footer */}
      <div className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p className="mb-3">© 2026 Huwa Gebäudereinigung & Hausmeisterdienste · Mittelweg 24 · 56566 Neuwied</p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/impressum" className="hover:text-foreground transition-colors">Impressum</a>
          <a href="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</a>
          <a href="/agb" className="hover:text-foreground transition-colors">AGB</a>
          <a href="mailto:info@huwa-gebaeudedienste.de" className="hover:text-foreground transition-colors">Kontakt</a>
        </div>
      </div>
    </div>
  );
}