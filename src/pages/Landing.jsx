import { useState, useEffect, useMemo, useRef } from "react";
import { Check, Zap, ArrowRight, ChevronDown, Star, MapPin, Target, Phone, Mail, Users, TrendingUp, Shield, Brain, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import AgencyDemoModal from "@/components/AgencyDemoModal";
import HowItWorks from "@/components/landing/HowItWorks";
import TargetIndustriesCompact from "@/components/landing/TargetIndustriesCompact";
import ProductShowcase from "@/components/landing/ProductShowcase";
import PricingFAQ from "@/components/landing/PricingFAQ";

const PLANS = [
  {
    name: "Starter",
    slug: "starter",
    planId: "69fb1b37d7433caf98c34ff9",
    price: "99",
    description: "Für kleine Dienstleister, die regelmäßig neue Firmenkunden gewinnen möchten.",
    popular: false,
    features: ["300 Firmenkontakte/Monat", "KI-Recherche inklusive", "2 Nutzer", "CRM & Pipeline", "Basis-Reports"],
    cta: "14 Tage kostenlos testen"
  },
  {
    name: "Professional",
    slug: "professional",
    planId: "69fb1b37d7433caf98c34ffa",
    price: "199",
    description: "Für Teams, die regelmäßig aktiv Vertrieb machen",
    popular: true,
    features: ["1.500 Firmenkontakte/Monat", "KI-Recherche inklusive", "5 Nutzer", "KI-Priorisierung für heiße Leads", "Eigene E-Mail-Vorlagen", "Erweiterte Reports"],
    cta: "Professional buchen"
  },
  {
    name: "Gold",
    slug: "gold",
    planId: "69fb7de571a0504da10ef985",
    price: "349",
    description: "Für wachsende Vertriebsteams mit hohem Kontaktvolumen",
    popular: false,
    features: ["5.000 Firmenkontakte/Monat", "KI-Recherche inklusive", "10 Nutzer", "Erweiterte Automationen / Professional-Features", "Priority Support"],
    cta: "Gold buchen"
  },
  {
    name: "Agency",
    slug: "agency",
    planId: "69fb1b37d7433caf98c34ffb",
    price: null,
    description: "Für Agenturen & größere Teams",
    popular: false,
    isAgency: true,
    features: ["Mehrere Kundenorganisationen", "Hohes Kontaktvolumen / Fair-Use", "Unbegrenzte Nutzer oder individuelle Nutzeranzahl", "Persönliches Onboarding", "Eigene Kundenverwaltung"],
    cta: "Demo anfragen"
  }
];

const FAQS = [
  { q: "Was sind gespeicherte Firmenkontakte?", a: "Das sind alle Firmen, die Sie mit Vertriebo recherchieren oder manuell erfassen. Die monatlichen Limits zeigen, wie viele neue Kontakte Sie pro Monat speichern können. Alle Ihre Kontakte bleiben unbegrenzt abrufbar." },
  { q: "Wie funktionieren Recherche-Läufe?", a: "Mit einem Recherche-Lauf starten Sie eine automatische Firmensuche in Ihrer Region. Die Anzahl der Recherche-Läufe selbst ist nicht begrenzt – nur die Kontakte, die Sie speichern, werden gezählt." },
  { q: "Was sind KI-Aktionen?", a: "KI-Aktionen umfassen Lead-Bewertung, E-Mail-Entwürfe, Gesprächseinstiege, Follow-up-Vorschläge und Vertriebs-Coaching. Jede KI-gestützte Funktion verbraucht eine Aktion." },
  { q: "Kann ich monatlich kündigen?", a: "Ja, alle Self-Service-Pläne (Starter, Professional, Gold) sind monatlich kündbar. Keine langfristigen Verträge, keine versteckten Kosten." },
  { q: "Was passiert mit meinen Daten nach Kündigung?", a: "Ihre Firmenkontakte und Dokumentation bleiben 30 Tage nach Kündigung einsehbar. Alle Daten sind DSGVO-konform und können exportiert werden." },
];

const FEATURES = [
  { icon: "🔍", title: "Automatische Firmenkontakt-Recherche", desc: "Legen Sie Zielgebiet, Branche und Kundentyp fest – Vertriebo findet passende Firmenkontakte für Ihren Vertrieb.", color: "border-blue-500/20 bg-blue-500/5" },
  { icon: "🗺️", title: "Lückenlose Gebiets-Abdeckung", desc: "Nicht nur die Kreisstadt — Vertriebo durchsucht alle Orte in Ihrem Radius automatisch.", color: "border-teal-500/20 bg-teal-500/5" },
  { icon: "⭐", title: "Priorisierte Tagesliste", desc: "Tagesprioritäten statt Chaos. Heute fällige Rückrufe, priorisierte Neuleads und offene Angebote – Ihr Team sieht auf einen Blick, wer heute angerufen werden sollte.", color: "border-amber-500/20 bg-amber-500/5" },
  { icon: "📞", title: "Komplette Kontakthistorie", desc: "Alle Gespräche, E-Mails und Notizen zu jeder Firma an einem Ort. Anrufe dokumentiert, E-Mail-Verlauf, gespeicherte Notizen – nichts geht verloren.", color: "border-emerald-500/20 bg-emerald-500/5" },
  { icon: "✉️", title: "E-Mails & Follow-ups", desc: "E-Mail-Vorlagen mit Ihrem Logo und Signatur, automatische Aufgaben und Follow-up-Erinnerungen – von Erstansprache bis Nachfassen alles organisiert.", color: "border-purple-500/20 bg-purple-500/5" },
  { icon: "👥", title: "Vertriebssteuerung für Teams", desc: "Admins sehen Fortschritt, offene Aufgaben, Aktivität und Ergebnisse. Vertriebler sehen nur ihre eigenen Leads.", color: "border-indigo-500/20 bg-indigo-500/5" },
  { icon: "✅", title: "Alles leicht bedienbar", desc: "Keine komplizierte CRM-Einrichtung. Zielgebiet festlegen, Kontakte recherchieren, losarbeiten.", color: "border-slate-500/20 bg-slate-500/5" },
  { icon: "🧠", title: "System das mitlernt", desc: "Je mehr Sie nutzen, desto besser wird Vertriebo. Erfolgreiche Branchen werden automatisch priorisiert.", color: "border-orange-500/20 bg-orange-500/5" },
  { icon: "📊", title: "Echtzeit-Erfolgsquoten", desc: "Sehen Sie sofort, wie Ihr Team performt: Quote pro Vertriebler, beste Branchen, ROI der Recherche.", color: "border-rose-500/20 bg-rose-500/5" },
];

// Stable Particles Component
const Particles = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 5 + Math.random() * 10,
      delay: Math.random() * 5
    }));
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute", width: 4, height: 4, background: "rgba(37,99,235,0.3)", borderRadius: "50%",
          left: `${p.left}%`, top: `${p.top}%`,
          animation: `float ${p.duration}s ease-in-out infinite`,
          animationDelay: `${p.delay}s`,
          filter: "blur(1px)"
        }} />
      ))}
    </div>
  );
};

const INDUSTRIES = [
  { icon: "🏢", name: "Gebäudereinigung" }, { icon: "🛡️", name: "Sicherheitsdienst" }, { icon: "🏠", name: "Facility Service" }, { icon: "📦", name: "Entrümpelung" },
  { icon: "🔨", name: "Handwerk" }, { icon: "💻", name: "IT-Service" }, { icon: "🌿", name: "Gartenbau" }, { icon: "🚚", name: "Spedition" },
  { icon: "🔧", name: "SHK / Heizung" }, { icon: "⚡", name: "Elektro" }, { icon: "🍽️", name: "Catering" }, { icon: "👥", name: "Personal / Zeitarbeit" },
  { icon: "⚙️", name: "Industrieservice" }, { icon: "🧹", name: "Maler / Renovierung" }, { icon: "💰", name: "Buchhaltung" }, { icon: "🏥", name: "Gesundheit / Pflege" }
];

// Reveal Animation Component
const RevealOnScroll = ({ children, delay = 0 }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`,
        willChange: "opacity, transform"
      }}
    >
      {children}
    </div>
  );
};

export default function Landing() {
  const [loading, setLoading] = useState(null);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      window.location.href = "/onboarding?checkout=success";
    }
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogin = () => base44.auth.redirectToLogin(window.location.origin + "/dashboard");
  const handleRegister = () => base44.auth.redirectToLogin(window.location.origin + "/onboarding");

  const handleCheckout = async (plan) => {
    if (plan.slug === "agency") { setShowAgencyModal(true); return; }
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
      if (!org) { window.location.href = `/onboarding?plan_id=${plan.planId}&plan_name=${encodeURIComponent(plan.name)}`; return; }
      const res = await base44.functions.invoke("createCheckoutSession", { organization_id: org.id, plan_id: plan.planId });
      if (res.data?.url) window.location.href = res.data.url;
      else toast.error(res.data?.error || "Kein Checkout-Link erhalten.");
    } catch (e) {
      toast.error("Fehler beim Starten des Checkouts: " + e.message);
    }
    setLoading(null);
  };

  return (
    <div style={{ background: "#020617", minHeight: "100vh", fontFamily: "'Inter', sans-serif", overflowX: "hidden", position: "relative" }}>

      {/* NOISE TEXTURE OVERLAY */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        mixBlendMode: "overlay"
      }} />

      {/* FLOATING PARTICLES */}
      <Particles />
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); opacity: 0.3; }
          25% { transform: translate(30px, -40px); opacity: 0.6; }
          50% { transform: translate(-25px, -70px); opacity: 0.4; }
          75% { transform: translate(35px, -35px); opacity: 0.6; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      {/* GLOW ORBS - Animated */}
      <div style={{
        position: "fixed", width: 600, height: 600, background: "rgba(37,99,235,0.12)", borderRadius: "50%",
        filter: "blur(100px)", top: -200, left: -200, pointerEvents: "none", zIndex: 0,
        animation: "pulse-glow 8s ease-in-out infinite"
      }} />
      <div style={{
        position: "fixed", width: 500, height: 500, background: "rgba(124,58,237,0.1)", borderRadius: "50%",
        filter: "blur(100px)", bottom: -150, right: -150, pointerEvents: "none", zIndex: 0,
        animation: "pulse-glow 10s ease-in-out infinite reverse"
      }} />

      {/* NAVBAR */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? "rgba(2,6,23,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none",
        transition: "all 0.4s"
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontWeight: 900, fontSize: 14 }}>V</span>
            </div>
            <span style={{ color: "white", fontWeight: 900, fontSize: 18, letterSpacing: -0.5 }}>VERTRIEBO</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={handleLogin} style={{ color: "rgba(148,163,184,1)", fontSize: 14, padding: "8px 16px", background: "none", border: "none", cursor: "pointer", fontWeight: 500, fontFamily: "inherit" }}>
              Login
            </button>
            <button onClick={handleRegister} style={{
              background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "white", fontWeight: 700, fontSize: 14,
              padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 0 30px rgba(37,99,235,0.4)",
              transition: "all 0.3s"
            }}>
              🚀 14 Tage testen
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "radial-gradient(ellipse 80% 60% at 50% -10%,rgba(37,99,235,0.25),transparent),radial-gradient(ellipse 60% 40% at 80% 80%,rgba(124,58,237,0.15),transparent)",
        position: "relative", overflow: "hidden", paddingTop: 80
      }}>
        {/* Grid background */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
          backgroundSize: "48px 48px"
        }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          {/* Responsive Grid: 1 column mobile, 2 columns tablet+ */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 48, alignItems: "center" }}>
            {/* Left: Content */}
            <div>
            {/* Badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999,
              background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.4)",
              color: "#93c5fd", fontSize: 13, fontWeight: 600, marginBottom: 24
            }}>
              <Zap size={14} color="#3b82f6" fill="white" /> Für lokale Dienstleister
            </div>

            {/* Headline - Original Text */}
            <h1 style={{
              fontSize: "clamp(40px,5vw,64px)", fontWeight: 900, color: "white",
              lineHeight: 1.1, letterSpacing: -2, marginBottom: 20
            }}>
              Neue Firmenkunden finden.{" "}
              <span style={{
                background: "linear-gradient(135deg,#60a5fa 0%,#a78bfa 50%,#60a5fa 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                animation: "shimmer 4s linear infinite"
              }}>
                Leads priorisieren.
              </span>{" "}
              Vertrieb einfacher steuern.
            </h1>

            {/* Subheadline - Original Text */}
            <p style={{ fontSize: "clamp(16px,2vw,18px)", color: "rgba(148,163,184,1)", lineHeight: 1.7, marginBottom: 32 }}>
              Vertriebo findet passende B2B-Kontakte, priorisiert heiße Leads und zeigt Ihrem Team, wen es als Nächstes kontaktieren sollte.
            </p>

            {/* Context line - Original */}
            <p style={{ fontSize: 14, color: "rgba(100,116,139,1)", marginBottom: 32 }}>
              Für B2B-Dienstleister in ganz Deutschland – z. B. Gebäudereinigung, IT-Service, Handwerk, Logistik, Pflege, Catering und viele weitere Branchen.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
              <button
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                style={{
                  background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "white", fontWeight: 800,
                  fontSize: 15, padding: "14px 28px", borderRadius: 12, border: "none", cursor: "pointer",
                  fontFamily: "inherit", boxShadow: "0 0 40px rgba(37,99,235,0.5)",
                  transition: "all 0.3s"
                }}
              >
                14 Tage kostenlos testen
              </button>
              <a
                href="#how-it-works"
                style={{
                  color: "rgba(148,163,184,1)", fontSize: 15, fontWeight: 600, padding: "14px 24px",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
                  textDecoration: "none", fontFamily: "inherit", transition: "all 0.2s"
                }}
              >
                So funktioniert Vertriebo
              </a>
            </div>

            {/* Trust Box */}
            <div style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd", marginBottom: 10 }}>Kostenlos starten:</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "rgba(148,163,184,1)" }}>
                <span>→ 10 Firmenkontakte ohne Kreditkarte testen</span>
                <span>→ 14 Tage vollen Zugang mit Zahlungsart aktivieren</span>
                <span>→ Danach monatlich kündbar</span>
              </div>
            </div>

            {/* Trust Badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "rgba(100,116,139,1)" }}>
              {["14 Tage kostenlos testen", "Monatlich kündbar", "DSGVO-orientiert", "Für deutsche B2B-Dienstleister"].map(t => (
                <span key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Check size={14} color="#22c55e" strokeWidth={2.5} />{t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: App Mockup */}
          <div style={{ position: "relative" }}>
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
              overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.8),0 0 0 1px rgba(37,99,235,0.2)"
            }}>
              {/* Browser Chrome */}
              <div style={{ background: "#0f172a", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(239,68,68,0.6)" }} />
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(245,158,11,0.6)" }} />
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(34,197,94,0.6)" }} />
                </div>
                <div style={{ fontSize: 11, color: "rgba(100,116,139,1)", fontFamily: "monospace" }}>app.vertriebo.de/dashboard</div>
                <div style={{ width: 40 }} />
              </div>

              {/* App Content */}
              <div style={{ background: "#0c1428", display: "flex", minHeight: 400 }}>
                {/* Mini Sidebar */}
                <div style={{ width: 56, background: "#080e1e", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 16 }}>
                  <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "white", fontWeight: 900, fontSize: 14 }}>V</span>
                  </div>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ width: 20, height: 20, background: i === 1 ? "rgba(37,99,235,0.15)" : "transparent", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", border: i === 1 ? "1px solid rgba(37,99,235,0.3)" : "none" }}>
                      <div style={{ width: 10, height: 10, background: i === 1 ? "#3b82f6" : "rgba(71,85,105,0.5)", borderRadius: 2 }} />
                    </div>
                  ))}
                </div>

                {/* Main Dashboard */}
                <div style={{ flex: 1, padding: 16 }}>
                  {/* Stats Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
                    <div style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 10, padding: 12 }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", marginBottom: 4 }}>Heute fällig</p>
                      <p style={{ fontSize: 24, fontWeight: 900, color: "#60a5fa" }}>12</p>
                      <p style={{ fontSize: 9, color: "rgba(100,116,139,1)" }}>Rückrufe</p>
                    </div>
                    <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: 12 }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: "#86efac", textTransform: "uppercase", marginBottom: 4 }}>Offen</p>
                      <p style={{ fontSize: 24, fontWeight: 900, color: "#4ade80" }}>47</p>
                      <p style={{ fontSize: 9, color: "rgba(100,116,139,1)" }}>Leads</p>
                    </div>
                    <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: 12 }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: "#c4b5fd", textTransform: "uppercase", marginBottom: 4 }}>Woche</p>
                      <p style={{ fontSize: 24, fontWeight: 900, color: "#a78bfa" }}>23</p>
                      <p style={{ fontSize: 9, color: "rgba(100,116,139,1)" }}>Anrufe</p>
                    </div>
                  </div>

                  {/* Prioritized Leads */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(148,163,184,1)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Star size={10} fill="#fbbf24" color="#fbbf24" /> Priorisierte Leads
                      </p>
                      <button style={{ fontSize: 9, fontWeight: 700, color: "#60a5fa", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Alle →</button>
                    </div>

                    {/* Lead 1 - High Priority */}
                    <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#f87171", textTransform: "uppercase" }}>Priorität: Hoch</p>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#f87171", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", padding: "2px 8px", borderRadius: 999 }}>Rückruf</span>
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "white", marginBottom: 4 }}>Schmidt Gebäudereinigung GmbH</p>
                      <p style={{ fontSize: 10, color: "rgba(100,116,139,1)", marginBottom: 8 }}>Berlin · Gebäudereinigung</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 9, color: "rgba(100,116,139,1)" }}>Letzter Kontakt: Gestern</span>
                      </div>
                      <button style={{ width: "100%", padding: "8px", background: "linear-gradient(135deg,#22c55e,#16a34a)", border: "none", borderRadius: 8, color: "white", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
                        <Phone size={10} /> Nächsten anrufen
                      </button>
                    </div>

                    {/* Lead 2 */}
                    <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", borderRadius: 10, padding: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#fbbf24", textTransform: "uppercase" }}>Priorität: Hoch</p>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#60a5fa", background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.2)", padding: "2px 8px", borderRadius: 999 }}>Erstkontakt</span>
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "white" }}>Hausmeisterdienst Müller</p>
                      <p style={{ fontSize: 9, color: "rgba(100,116,139,1)" }}>Potsdam · Noch nie kontaktiert</p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <button style={{ padding: "8px", background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)", borderRadius: 8, color: "#93c5fd", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      📞 Anrufen
                    </button>
                    <button style={{ padding: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(148,163,184,1)", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      📝 Kontakt loggen
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: App Mockup */}
            <div style={{ position: "relative" }}>
              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
                overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.8),0 0 0 1px rgba(37,99,235,0.2)"
              }}>
                {/* Browser Chrome */}
                <div style={{ background: "#0f172a", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(239,68,68,0.6)" }} />
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(245,158,11,0.6)" }} />
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(34,197,94,0.6)" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(100,116,139,1)", fontFamily: "monospace" }}>app.vertriebo.de/dashboard</div>
                  <div style={{ width: 40 }} />
                </div>

                {/* App Content */}
                <div style={{ background: "#0c1428", display: "flex", minHeight: 400 }}>
                  {/* Mini Sidebar */}
                  <div style={{ width: 56, background: "#080e1e", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 16 }}>
                    <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "white", fontWeight: 900, fontSize: 14 }}>V</span>
                    </div>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ width: 20, height: 20, background: i === 1 ? "rgba(37,99,235,0.15)" : "transparent", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", border: i === 1 ? "1px solid rgba(37,99,235,0.3)" : "none" }}>
                        <div style={{ width: 10, height: 10, background: i === 1 ? "#3b82f6" : "rgba(71,85,105,0.5)", borderRadius: 2 }} />
                      </div>
                    ))}
                  </div>

                  {/* Main Dashboard */}
                  <div style={{ flex: 1, padding: 16 }}>
                    {/* Stats Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
                      <div style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 10, padding: 12 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", marginBottom: 4 }}>Heute fällig</p>
                        <p style={{ fontSize: 24, fontWeight: 900, color: "#60a5fa" }}>12</p>
                        <p style={{ fontSize: 9, color: "rgba(100,116,139,1)" }}>Rückrufe</p>
                      </div>
                      <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: 12 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#86efac", textTransform: "uppercase", marginBottom: 4 }}>Offen</p>
                        <p style={{ fontSize: 24, fontWeight: 900, color: "#4ade80" }}>47</p>
                        <p style={{ fontSize: 9, color: "rgba(100,116,139,1)" }}>Leads</p>
                      </div>
                      <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: 12 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: "#c4b5fd", textTransform: "uppercase", marginBottom: 4 }}>Woche</p>
                        <p style={{ fontSize: 24, fontWeight: 900, color: "#a78bfa" }}>23</p>
                        <p style={{ fontSize: 9, color: "rgba(100,116,139,1)" }}>Anrufe</p>
                      </div>
                    </div>

                    {/* Prioritized Leads */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(148,163,184,1)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Star size={10} fill="#fbbf24" color="#fbbf24" /> Priorisierte Leads
                        </p>
                        <button style={{ fontSize: 9, fontWeight: 700, color: "#60a5fa", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Alle →</button>
                      </div>

                      {/* Lead 1 - High Priority */}
                      <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <p style={{ fontSize: 9, fontWeight: 700, color: "#f87171", textTransform: "uppercase" }}>Priorität: Hoch</p>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#f87171", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", padding: "2px 8px", borderRadius: 999 }}>Rückruf</span>
                        </div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "white", marginBottom: 4 }}>Schmidt Gebäudereinigung GmbH</p>
                        <p style={{ fontSize: 10, color: "rgba(100,116,139,1)", marginBottom: 8 }}>Berlin · Gebäudereinigung</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 9, color: "rgba(100,116,139,1)" }}>Letzter Kontakt: Gestern</span>
                        </div>
                        <button style={{ width: "100%", padding: "8px", background: "linear-gradient(135deg,#22c55e,#16a34a)", border: "none", borderRadius: 8, color: "white", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
                          <Phone size={10} /> Nächsten anrufen
                        </button>
                      </div>

                      {/* Lead 2 */}
                      <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", borderRadius: 10, padding: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <p style={{ fontSize: 9, fontWeight: 700, color: "#fbbf24", textTransform: "uppercase" }}>Priorität: Hoch</p>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#60a5fa", background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.2)", padding: "2px 8px", borderRadius: 999 }}>Erstkontakt</span>
                        </div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "white" }}>Hausmeisterdienst Müller</p>
                        <p style={{ fontSize: 9, color: "rgba(100,116,139,1)" }}>Potsdam · Noch nie kontaktiert</p>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <button style={{ padding: "8px", background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)", borderRadius: 8, color: "#93c5fd", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        📞 Anrufen
                      </button>
                      <button style={{ padding: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(148,163,184,1)", fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        📝 Kontakt loggen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div style={{ background: "#080e1e", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "14px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", animation: "marquee 25s linear infinite", width: "max-content" }}>
          {[...Array(2)].map((_, di) => (
            <div key={di} style={{ display: "flex", gap: 48, padding: "0 24px", alignItems: "center" }}>
              {["⭐⭐⭐⭐⭐ \"3 Terminanfragen in der ersten Woche\"", "🔥 Gebäudereinigung · Sicherheit · IT · Handwerk · Logistik", "⭐⭐⭐⭐⭐ \"Endlich weiß mein Team, wen es anrufen soll\"", "📈 Mehr Struktur im Vertrieb", "🇩🇪 DSGVO-konform · Made for Germany", "⭐⭐⭐⭐⭐ \"Erste Leads nach 5 Minuten\""].map((t, i) => (
                <span key={i} style={{ color: "rgba(71,85,105,1)", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {t}
                  {i < 5 && <span style={{ color: "rgba(37,99,235,0.4)", fontSize: 20, marginLeft: 48 }}>·</span>}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES - Original Text */}
      <section id="features" style={{ padding: "96px 24px", background: "#020617" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <RevealOnScroll delay={0}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <h2 style={{ fontSize: "clamp(28px,5vw,40px)", fontWeight: 900, color: "white", lineHeight: 1.2, marginBottom: 16 }}>
                Mehr Struktur im B2B-Vertrieb
              </h2>
              <p style={{ fontSize: 16, color: "rgba(148,163,184,1)", maxWidth: 700, margin: "0 auto" }}>
                Vertriebo ist kein normales CRM. Es hilft Ihnen aktiv, neue Firmenkunden zu finden und Ihren Vertrieb jeden Tag zu steuern – von der Recherche bis zum Nachfassen.
              </p>
            </div>
          </RevealOnScroll>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
            {FEATURES.map((f, i) => (
              <RevealOnScroll key={i} delay={i * 100}>
                <div style={{
                  background: "rgba(255,255,255,0.03)", border: `1px solid ${f.color.split(" ")[0].replace("border-", "").replace("-500/20", "")}`,
                  borderColor: f.color.includes("blue") ? "rgba(37,99,235,0.2)" : f.color.includes("teal") ? "rgba(20,184,166,0.2)" : f.color.includes("amber") ? "rgba(245,158,11,0.2)" : f.color.includes("emerald") ? "rgba(16,185,129,0.2)" : f.color.includes("purple") ? "rgba(139,92,246,0.2)" : f.color.includes("indigo") ? "rgba(99,102,241,0.2)" : f.color.includes("orange") ? "rgba(249,115,22,0.2)" : f.color.includes("rose") ? "rgba(244,63,94,0.2)" : "rgba(100,116,139,0.2)",
                  borderRadius: 20, padding: 28, transition: "all 0.3s", cursor: "default"
                }}>
                  <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 10 }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(148,163,184,1)", lineHeight: 1.7 }}>{f.desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - Original Component */}
      <HowItWorks />

      {/* PRODUCT SHOWCASE - Original Component */}
      <ProductShowcase />

      {/* INDUSTRIES - Original Text */}
      <section style={{ background: "#080e1e", padding: "72px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <RevealOnScroll delay={0}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: "white", marginBottom: 12 }}>Für lokale Dienstleister</h2>
              <p style={{ color: "rgba(148,163,184,1)", maxWidth: 700, margin: "0 auto" }}>
                Vertriebo wurde von Vertriebsprofis entwickelt – für Betriebe, die aktiv neue Firmenkunden gewinnen wollen. Gebäudereinigung, IT-Service, Handwerk, Facility Service, Spedition, Pflege, Catering und 20+ weitere Branchen nutzen Vertriebo bereits.
              </p>
            </div>
          </RevealOnScroll>

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
            {INDUSTRIES.map((ind) => (
              <div key={ind.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 999, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", cursor: "default" }}>
                <span style={{ fontSize: 16 }}>{ind.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(148,163,184,1)" }}>{ind.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING - Original Text */}
      <section id="pricing" style={{ background: "#020617", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <RevealOnScroll delay={0}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <h2 style={{ fontSize: "clamp(28px,5vw,40px)", fontWeight: 900, color: "white", marginBottom: 16 }}>Wählen Sie den passenden Vertriebo-Plan</h2>
              <p style={{ fontSize: 16, color: "rgba(148,163,184,1)", maxWidth: 600, margin: "0 auto" }}>
                Starter können Sie 14 Tage kostenlos testen. Alle Pläne monatlich kündbar. Keine versteckten Kosten.
              </p>
            </div>
          </RevealOnScroll>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, alignItems: "start" }}>
            {PLANS.map((plan) => (
              <RevealOnScroll key={plan.name} delay={100}>
                <div style={{
                  background: plan.popular ? "linear-gradient(135deg,#1d4ed8,#2563eb)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${plan.popular ? "rgba(37,99,235,0.6)" : plan.isAgency ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 20, padding: 28, position: "relative",
                  transform: plan.popular ? "scale(1.03)" : "none",
                  boxShadow: plan.popular ? "0 30px 80px rgba(37,99,235,0.3)" : "none"
                }}>
                  {plan.popular && (
                    <div style={{
                      position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                      background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#1c1917",
                      fontSize: 11, fontWeight: 900, padding: "4px 14px", borderRadius: 999, whiteSpace: "nowrap"
                    }}>Beliebtester Plan</div>
                  )}
                  <div style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 4 }}>{plan.name}</div>
                  <div style={{ fontSize: 13, color: plan.popular ? "rgba(147,197,253,0.8)" : "rgba(148,163,184,1)", marginBottom: 20, lineHeight: 1.5 }}>{plan.description}</div>
                  <div style={{ marginBottom: 24 }}>
                    {plan.isAgency ? (
                      <span style={{ fontSize: 20, fontWeight: 800, color: "white" }}>Individuelle Preisgestaltung</span>
                    ) : (
                      <><span style={{ fontSize: 40, fontWeight: 900, color: "white" }}>€{plan.price}</span><span style={{ fontSize: 13, color: plan.popular ? "rgba(147,197,253,0.7)" : "rgba(148,163,184,1)", marginLeft: 4 }}>/Monat</span></>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: plan.popular ? "rgba(191,219,254,1)" : "rgba(148,163,184,1)" }}>
                        <Check size={14} color={plan.popular ? "rgba(147,197,253,0.8)" : "#22c55e"} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
                        {f}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleCheckout(plan)}
                    disabled={loading === plan.name}
                    style={{
                      width: "100%", padding: "13px", borderRadius: 12,
                      background: plan.popular ? "white" : plan.isAgency ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.06)",
                      border: plan.popular ? "none" : plan.isAgency ? "1px solid rgba(124,58,237,0.25)" : "1px solid rgba(255,255,255,0.1)",
                      color: plan.popular ? "#1d4ed8" : plan.isAgency ? "#a78bfa" : "white",
                      fontWeight: plan.popular ? 800 : 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                      opacity: loading === plan.name ? 0.5 : 1, transition: "all 0.2s"
                    }}
                  >
                    {loading === plan.name ? "Wird geladen..." : plan.cta}
                  </button>
                </div>
              </RevealOnScroll>
            ))}
          </div>

          <RevealOnScroll delay={200}>
            <PricingFAQ />
          </RevealOnScroll>

          <p style={{ textAlign: "center", color: "rgba(71,85,105,1)", fontSize: 13, marginTop: 28 }}>
            Alle Preise zzgl. MwSt. · Monatlich kündbar · Fair-Use für Agency-Plan
          </p>
        </div>
      </section>

      {/* FINAL CTA - Original Text */}
      <section style={{
        padding: "96px 24px", position: "relative", overflow: "hidden",
        background: "radial-gradient(ellipse 80% 60% at 50% 50%,rgba(37,99,235,0.2),rgba(124,58,237,0.1),#020617)"
      }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, background: "rgba(37,99,235,0.08)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none", animation: "pulse-glow 8s ease-in-out infinite" }} />
        <div style={{ position: "relative", zIndex: 2, maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <RevealOnScroll delay={0}>
            <h2 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, color: "white", lineHeight: 1.2, marginBottom: 16 }}>
              Starten Sie mit Vertriebo und bringen Sie Struktur in Ihre Neukundengewinnung.
            </h2>
            <p style={{ fontSize: 18, color: "rgba(148,163,184,1)", marginBottom: 40, lineHeight: 1.6 }}>
              Keine Excel-Listen mehr. Keine vergessenen Rückrufe. Ein klares System für Ihren Vertriebserfolg.
            </p>
            <button
              onClick={handleRegister}
              style={{
                background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "white", fontWeight: 800,
                fontSize: 17, padding: "18px 40px", borderRadius: 14, border: "none", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "inherit",
                boxShadow: "0 0 40px rgba(37,99,235,0.5)", transition: "all 0.3s"
              }}
            >
              14 Tage kostenlos testen →
            </button>
            <p style={{ color: "rgba(100,116,139,1)", fontSize: 14, marginTop: 20 }}>
              Ohne langfristige Bindung · Monatlich kündbar
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* FOOTER - Original Text */}
      <footer style={{ background: "#020617", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "48px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "rgba(71,85,105,1)", fontSize: 13, marginBottom: 16 }}>© 2026 Vertriebo</p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, marginBottom: 16 }}>
            <a href="/impressum" style={{ color: "rgba(71,85,105,1)", fontSize: 13, textDecoration: "none" }}>Impressum</a>
            <a href="/datenschutz" style={{ color: "rgba(71,85,105,1)", fontSize: 13, textDecoration: "none" }}>Datenschutz</a>
            <a href="/agb" style={{ color: "rgba(71,85,105,1)", fontSize: 13, textDecoration: "none" }}>AGB</a>
            <a href="mailto:info@huwa-gebaeudedienste.de" style={{ color: "rgba(71,85,105,1)", fontSize: 13, textDecoration: "none" }}>Kontakt</a>
          </div>
          <p style={{ color: "rgba(51,65,85,1)", fontSize: 12 }}>
            Ein Produkt der Huwa Gebäudereinigung & Hausmeisterdienste
          </p>
        </div>
      </footer>

      <AgencyDemoModal isOpen={showAgencyModal} onClose={() => setShowAgencyModal(false)} />
    </div>
  );
}