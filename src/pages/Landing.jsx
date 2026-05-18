import { useState, useEffect } from "react";
import { Check, Zap, ArrowRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import AgencyDemoModal from "@/components/AgencyDemoModal";

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
    description: "Für Teams, die regelmäßig aktiv Vertrieb machen.",
    popular: true,
    features: ["1.500 Firmenkontakte/Monat", "KI-Recherche inklusive", "5 Nutzer", "KI-Priorisierung für heiße Leads", "Eigene E-Mail-Vorlagen", "Erweiterte Reports"],
    cta: "Professional buchen"
  },
  {
    name: "Gold",
    slug: "gold",
    planId: "69fb7de571a0504da10ef985",
    price: "349",
    description: "Für wachsende Vertriebsteams mit hohem Kontaktvolumen.",
    popular: false,
    features: ["5.000 Firmenkontakte/Monat", "KI-Recherche inklusive", "10 Nutzer", "Erweiterte Automationen", "Priority Support"],
    cta: "Gold buchen"
  },
  {
    name: "Agency",
    slug: "agency",
    planId: "69fb1b37d7433caf98c34ffb",
    price: null,
    description: "Für Agenturen & größere Teams.",
    popular: false,
    isAgency: true,
    features: ["Mehrere Kundenorganisationen", "Hohes Kontaktvolumen / Fair-Use", "Unbegrenzte Nutzer", "Persönliches Onboarding", "Eigene Kundenverwaltung"],
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
  { icon: "🔍", title: "Automatische Lead-Recherche", desc: "Vertriebo findet täglich passende Firmenkontakte in Ihrem Zielgebiet – vollautomatisch.", color: "border-blue-500/20 bg-blue-500/5" },
  { icon: "🔥", title: "KI-Temperatur-Scoring", desc: "Heiß, Warm oder Kalt? Priorisierung nach echten Verhaltenssignalen, nicht Bauchgefühl.", color: "border-red-500/20 bg-red-500/5" },
  { icon: "⚡", title: "KI-Aktionen", desc: "Lead-Bewertung, E-Mail-Entwürfe, Gesprächseinstiege und Follow-up-Vorschläge auf Knopfdruck.", color: "border-amber-500/20 bg-amber-500/5" },
  { icon: "📞", title: "Komplette Kontakthistorie", desc: "Alle Gespräche, E-Mails und Notizen zu jeder Firma an einem Ort – nichts geht verloren.", color: "border-emerald-500/20 bg-emerald-500/5" },
  { icon: "✉️", title: "E-Mails & Follow-ups", desc: "Professionelle E-Mail-Vorlagen mit Logo und automatische Follow-up-Erinnerungen.", color: "border-purple-500/20 bg-purple-500/5" },
  { icon: "📊", title: "Reports & Analytics", desc: "Anrufe, Abschlüsse, Conversion-Rate – alles auf einen Blick für Sie und Ihre Führungsebene.", color: "border-cyan-500/20 bg-cyan-500/5" },
];

const INDUSTRIES = [
  "🏢 Gebäudereinigung", "🛡️ Sicherheitsdienst", "🏠 Facility Service", "🔨 Handwerk",
  "💻 IT-Service", "🌿 Gartenbau", "🚛 Logistik", "📦 Entrümpelung",
  "🔌 Elektro", "🏗️ Dachdecker", "💧 Heizung & Sanitär", "🍽️ Catering",
  "🧹 Maler / Renovierung", "👥 Personal / Zeitarbeit", "💰 Buchhaltung", "🏥 Pflege"
];

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
    <div style={{ background: "#020617", minHeight: "100vh", fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>

      {/* NAVBAR */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? "rgba(2,6,23,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none",
        transition: "all 0.4s"
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontWeight: 900, fontSize: 14 }}>V</span>
            </div>
            <span style={{ color: "white", fontWeight: 900, fontSize: 18, letterSpacing: -0.5 }}>VERTRIEBO</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={handleLogin} style={{ color: "rgba(148,163,184,1)", fontSize: 14, padding: "8px 16px", background: "none", border: "none", cursor: "pointer", fontWeight: 500, fontFamily: "inherit" }}>
              Anmelden
            </button>
            <button onClick={handleRegister} style={{
              background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "white", fontWeight: 700, fontSize: 14,
              padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 0 30px rgba(37,99,235,0.4)"
            }}>
              Kostenlos testen
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
        {/* Glow orbs */}
        <div style={{ position: "absolute", width: 600, height: 600, background: "rgba(37,99,235,0.12)", borderRadius: "50%", filter: "blur(80px)", top: -100, left: -150, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 400, height: 400, background: "rgba(124,58,237,0.1)", borderRadius: "50%", filter: "blur(80px)", bottom: -50, right: -100, pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 900, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999,
            background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.4)",
            color: "#93c5fd", fontSize: 13, fontWeight: 600, marginBottom: 32
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
            KI-gestützte B2B-Lead-Generierung · Für lokale Dienstleister
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: "clamp(40px,7vw,80px)", fontWeight: 900, color: "white",
            lineHeight: 1.05, letterSpacing: -2, marginBottom: 24
          }}>
            Ihr KI-Vertriebler,{" "}
            <span style={{
              background: "linear-gradient(135deg,#60a5fa 0%,#a78bfa 50%,#60a5fa 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
            }}>
              der nie schläft.
            </span>
          </h1>

          <p style={{ fontSize: "clamp(16px,2.5vw,20px)", color: "rgba(148,163,184,1)", maxWidth: 640, margin: "0 auto 40px", lineHeight: 1.7 }}>
            Vertriebo findet täglich neue Firmenkontakte in Ihrem Zielgebiet, bewertet sie nach Abschlusswahrscheinlichkeit – und sagt Ihrem Team genau, wen es als Nächstes anrufen soll.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 48 }}>
            <button
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              style={{
                background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "white", fontWeight: 800,
                fontSize: 16, padding: "15px 36px", borderRadius: 14, border: "none", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "inherit",
                boxShadow: "0 0 40px rgba(37,99,235,0.5),0 20px 60px rgba(37,99,235,0.2)"
              }}
            >
              Jetzt kostenlos starten
              <ArrowRight size={18} />
            </button>
            <a href="#how-it-works" style={{
              color: "rgba(148,163,184,1)", fontSize: 15, fontWeight: 600, padding: "15px 24px",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
              textDecoration: "none", fontFamily: "inherit", transition: "all 0.2s"
            }}>
              So funktioniert Vertriebo
            </a>
          </div>

          {/* Trust chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center" }}>
            {["Keine Kreditkarte nötig", "Erste Leads in 5 Minuten", "DSGVO-konform", "Monatlich kündbar"].map(t => (
              <span key={t} style={{ color: "rgba(100,116,139,1)", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={14} color="#22c55e" strokeWidth={2.5} />{t}
              </span>
            ))}
          </div>

          {/* App Mockup */}
          <div style={{
            maxWidth: 800, margin: "60px auto 0",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, overflow: "hidden",
            boxShadow: "0 40px 120px rgba(0,0,0,0.8),0 0 0 1px rgba(37,99,235,0.2)"
          }}>
            {/* Browser chrome */}
            <div style={{ background: "#0f172a", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(239,68,68,0.6)" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(245,158,11,0.6)" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(34,197,94,0.6)" }} />
              </div>
              <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "4px 16px", fontSize: 12, color: "rgba(100,116,139,1)", fontFamily: "monospace" }}>
                  app.vertriebo.de/leads
                </div>
              </div>
            </div>
            {/* App UI */}
            <div style={{ background: "#0c1428", display: "flex", minHeight: 320 }}>
              {/* Sidebar */}
              <div style={{ width: 48, background: "#080e1e", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 18 }}>
                <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "white", fontWeight: 900, fontSize: 12 }}>V</span>
                </div>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ width: 16, height: 3, background: "rgba(71,85,105,0.5)", borderRadius: 2 }} />
                ))}
              </div>
              {/* Main */}
              <div style={{ flex: 1, padding: 20 }}>
                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#f87171" }}>12</div>
                    <div style={{ fontSize: 10, color: "rgba(100,116,139,1)" }}>🔥 Heiße Leads</div>
                  </div>
                  <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#fbbf24" }}>34</div>
                    <div style={{ fontSize: 10, color: "rgba(100,116,139,1)" }}>🌡️ Warme Leads</div>
                  </div>
                  <div style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.15)", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#60a5fa" }}>148</div>
                    <div style={{ fontSize: 10, color: "rgba(100,116,139,1)" }}>📋 Gesamt</div>
                  </div>
                </div>
                {/* Lead rows */}
                {[
                  { name: "Schmidt Gebäudereinigung GmbH", loc: "Berlin · Rückruf heute", color: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.15)", badge: "🔥 Heiß", badgeColor: "#f87171", score: 87 },
                  { name: "Hausmeisterdienst Müller", loc: "Potsdam · Erstkontakt", color: "rgba(245,158,11,0.05)", border: "rgba(245,158,11,0.12)", badge: "🌡️ Warm", badgeColor: "#fbbf24", score: 62 },
                  { name: "Security Services Nord", loc: "Hamburg · Angebot läuft", color: "rgba(37,99,235,0.04)", border: "rgba(37,99,235,0.1)", badge: "❄️ Kalt", badgeColor: "#60a5fa", score: 31 },
                ].map((lead, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", background: lead.color, border: `1px solid ${lead.border}`, borderRadius: 9, marginBottom: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</div>
                      <div style={{ fontSize: 10, color: "rgba(100,116,139,1)" }}>{lead.loc}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 48, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${lead.score}%`, background: lead.badgeColor, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: lead.badgeColor }}>{lead.score}</span>
                      <span style={{ padding: "3px 8px", borderRadius: 999, background: `${lead.badgeColor}20`, border: `1px solid ${lead.badgeColor}40`, color: lead.badgeColor, fontSize: 9, fontWeight: 700, whiteSpace: "nowrap" }}>{lead.badge}</span>
                    </div>
                  </div>
                ))}
                {/* KI recommendation */}
                <div style={{ padding: "10px 12px", background: "linear-gradient(135deg,rgba(37,99,235,0.15),rgba(124,58,237,0.1))", border: "1px solid rgba(37,99,235,0.3)", borderRadius: 10, display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <div style={{ width: 22, height: 22, background: "linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Zap size={11} color="white" />
                  </div>
                  <span style={{ fontSize: 10, color: "rgba(203,213,225,1)" }}><span style={{ color: "#93c5fd", fontWeight: 700 }}>KI-Empfehlung: </span>Schmidt heute anrufen – Rückruf seit gestern überfällig.</span>
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
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>

      {/* FEATURES */}
      <section id="features" style={{ padding: "96px 24px", background: "#020617" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>Was Vertriebo kann</p>
            <h2 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, color: "white", lineHeight: 1.1, marginBottom: 16 }}>
              Ihr{" "}
              <span style={{ background: "linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                digitaler Vertriebsleiter.
              </span>
            </h2>
            <p style={{ fontSize: 18, color: "rgba(100,116,139,1)", maxWidth: 500, margin: "0 auto" }}>Nicht nur ein CRM. Ein System das denkt, priorisiert und handelt.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.03)", border: `1px solid ${f.color.split(" ")[0].replace("border-", "").replace("-500/20", "")}`,
                borderColor: f.color.includes("blue") ? "rgba(37,99,235,0.2)" : f.color.includes("red") ? "rgba(239,68,68,0.2)" : f.color.includes("amber") ? "rgba(245,158,11,0.2)" : f.color.includes("emerald") ? "rgba(16,185,129,0.2)" : f.color.includes("purple") ? "rgba(139,92,246,0.2)" : "rgba(6,182,212,0.2)",
                borderRadius: 20, padding: 28, transition: "all 0.3s", cursor: "default"
              }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(100,116,139,1)", lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM / BEFORE-AFTER */}
      <section style={{ padding: "80px 24px", background: "#080e1e", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>Das Problem</p>
            <h2 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, color: "white", lineHeight: 1.1, marginBottom: 16 }}>Klassischer Vertrieb kostet Zeit,<br />die Sie nicht haben.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 20, padding: 32 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 999, padding: "4px 12px", marginBottom: 24 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#f87171", letterSpacing: "0.1em", textTransform: "uppercase" }}>Ohne Vertriebo</span>
              </div>
              {[
                ["😩", "Stunden für Adressrecherche", "Manuelles Suchen in Google und Excel-Listen frisst Ihre Vertriebszeit."],
                ["🎯", "Kein Gefühl für Prioritäten", "Ohne System rufen Sie zuerst die falschen an – und verpassen Abschlüsse."],
                ["📉", "Leads fallen durchs Raster", "Rückrufe vergessen, Follow-ups bleiben aus – Deals sterben still."],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 20, marginTop: 2 }}>{icon}</span>
                  <div><div style={{ fontSize: 14, fontWeight: 700, color: "#fca5a5", marginBottom: 4 }}>{title}</div><div style={{ fontSize: 13, color: "rgba(100,116,139,1)", lineHeight: 1.6 }}>{desc}</div></div>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(37,99,235,0.04)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 20, padding: 32 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)", borderRadius: 999, padding: "4px 12px", marginBottom: 24 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#93c5fd", letterSpacing: "0.1em", textTransform: "uppercase" }}>Mit Vertriebo</span>
              </div>
              {[
                ["⚡", "Leads in 5 Minuten bereit", "Vollautomatische Recherche passender Firmen in Ihrem Zielgebiet – täglich frisch."],
                ["🎯", "KI zeigt, wer kaufbereit ist", "Heiß, Warm, Kalt – priorisiert nach echten Verhaltenssignalen."],
                ["✅", "Nichts geht mehr verloren", "Rückrufe, Follow-ups und Aufgaben automatisch erstellt."],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 20, marginTop: 2 }}>{icon}</span>
                  <div><div style={{ fontSize: 14, fontWeight: 700, color: "#93c5fd", marginBottom: 4 }}>{title}</div><div style={{ fontSize: 13, color: "rgba(100,116,139,1)", lineHeight: 1.6 }}>{desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: "96px 24px", background: "#020617" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>So einfach</p>
            <h2 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, color: "white", marginBottom: 16 }}>In 3 Schritten zu mehr Aufträgen.</h2>
            <p style={{ fontSize: 18, color: "rgba(100,116,139,1)" }}>Keine IT-Kenntnisse. Keine komplizierte Einrichtung.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
            {[
              { num: "01", icon: "🎯", title: "Zielgebiet festlegen", desc: "PLZ, Umkreis, Branchen und Ihren idealen Kundentyp definieren. Vertriebo weiß sofort, wen es suchen soll.", color: "#2563eb" },
              { num: "02", icon: "⚡", title: "KI recherchiert & priorisiert", desc: "Das System findet Firmenkontakte, bewertet jeden Lead nach Abschlusswahrscheinlichkeit und sortiert Heiß vor Kalt.", color: "#7c3aed" },
              { num: "03", icon: "📈", title: "Team handelt, Deals landen", desc: "Ihr Vertrieb arbeitet täglich die Prioritätenliste ab. Mehr Struktur, mehr Gespräche, mehr Abschlüsse.", color: "#059669" },
            ].map((step, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{
                  position: "relative", width: 64, height: 64, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center",
                  background: step.color, margin: "0 auto 20px", boxShadow: `0 0 40px ${step.color}66`
                }}>
                  <span style={{ fontSize: 28 }}>{step.icon}</span>
                  <div style={{
                    position: "absolute", top: -10, right: -10, width: 26, height: 26, borderRadius: "50%",
                    background: "#0f172a", border: `2px solid ${step.color}80`,
                    color: step.color === "#2563eb" ? "#60a5fa" : step.color === "#7c3aed" ? "#a78bfa" : "#34d399",
                    fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center"
                  }}>{step.num}</div>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(100,116,139,1)", lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section style={{ background: "#080e1e", padding: "72px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: "white", marginBottom: 12 }}>Für lokale Dienstleister aller Branchen.</h2>
            <p style={{ color: "rgba(100,116,139,1)" }}>Vertriebo wurde von Vertriebsprofis entwickelt – für Betriebe, die aktiv neue Firmenkunden gewinnen wollen.</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
            {INDUSTRIES.map(ind => (
              <span key={ind} style={{
                padding: "8px 18px", borderRadius: 999, background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)", fontSize: 13, fontWeight: 600,
                color: "rgba(148,163,184,1)", cursor: "default",
                transition: "all 0.25s"
              }}>
                {ind}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ background: "#020617", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>Preise</p>
            <h2 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, color: "white", marginBottom: 16 }}>Transparent. Ohne Überraschungen.</h2>
            <p style={{ fontSize: 18, color: "rgba(100,116,139,1)" }}>Alle Pläne monatlich kündbar. Keine Mindestlaufzeit.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, alignItems: "start" }}>
            {PLANS.map((plan) => (
              <div key={plan.name} style={{
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
                  }}>⭐ BELIEBTESTER PLAN</div>
                )}
                <div style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontSize: 12, color: plan.popular ? "rgba(147,197,253,0.8)" : "rgba(100,116,139,1)", marginBottom: 20, lineHeight: 1.5 }}>{plan.description}</div>
                <div style={{ marginBottom: 24 }}>
                  {plan.isAgency ? (
                    <span style={{ fontSize: 22, fontWeight: 800, color: "white" }}>Auf Anfrage</span>
                  ) : (
                    <><span style={{ fontSize: 40, fontWeight: 900, color: "white" }}>€{plan.price}</span><span style={{ fontSize: 13, color: plan.popular ? "rgba(147,197,253,0.7)" : "rgba(100,116,139,1)", marginLeft: 4 }}>/Monat</span></>
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
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 28, color: "rgba(71,85,105,1)", fontSize: 13 }}>
            Alle Pläne starten mit kostenlosem Trial · Keine Kreditkarte nötig · Jederzeit kündbar
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ background: "#080e1e", padding: "96px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 40, fontWeight: 900, color: "white", marginBottom: 12 }}>Häufige Fragen.</h2>
            <p style={{ color: "rgba(100,116,139,1)" }}>Alles, was Sie vor dem Start wissen sollten.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 16, fontFamily: "inherit" }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{faq.q}</span>
                  <ChevronDown size={18} color="rgba(100,116,139,1)" style={{ flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.25s" }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 22px 18px" }}>
                    <p style={{ fontSize: 14, color: "rgba(100,116,139,1)", lineHeight: 1.75 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{
        padding: "120px 24px", position: "relative", overflow: "hidden",
        background: "radial-gradient(ellipse 80% 60% at 50% 50%,rgba(37,99,235,0.2),rgba(124,58,237,0.1),#020617)"
      }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, background: "rgba(37,99,235,0.08)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 2, maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(32px,6vw,64px)", fontWeight: 900, color: "white", lineHeight: 1.05, marginBottom: 20 }}>
            Mehr Aufträge.<br />
            <span style={{ background: "linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Weniger Aufwand.
            </span>
          </h2>
          <p style={{ fontSize: 20, color: "rgba(100,116,139,1)", marginBottom: 44, lineHeight: 1.6 }}>
            Starten Sie heute kostenfrei – ohne Kreditkarte, ohne Risiko. Erste Leads in unter 5 Minuten.
          </p>
          <button
            onClick={handleRegister}
            style={{
              background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "white", fontWeight: 900,
              fontSize: 18, padding: "20px 48px", borderRadius: 16, border: "none", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 12, fontFamily: "inherit",
              boxShadow: "0 0 40px rgba(37,99,235,0.5),0 20px 60px rgba(37,99,235,0.2)"
            }}
          >
            Jetzt kostenlos starten
            <ArrowRight size={22} />
          </button>
          <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
            {["Keine Kreditkarte", "Kein Risiko", "Jederzeit kündbar"].map(t => (
              <span key={t} style={{ color: "rgba(71,85,105,1)", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={14} color="#22c55e" strokeWidth={2.5} />{t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#020617", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "48px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontWeight: 900, fontSize: 12 }}>V</span>
              </div>
              <span style={{ color: "white", fontWeight: 900, fontSize: 16, letterSpacing: -0.5 }}>VERTRIEBO</span>
            </div>
            <p style={{ color: "rgba(71,85,105,1)", fontSize: 13 }}>KI-gestützte B2B-Lead-Generierung für aktive Vertriebsteams.</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
            {[["Impressum", "/impressum"], ["Datenschutz", "/datenschutz"], ["AGB", "/agb"]].map(([label, href]) => (
              <a key={label} href={href} style={{ color: "rgba(71,85,105,1)", fontSize: 13, textDecoration: "none" }}>{label}</a>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: "32px auto 0", paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center", color: "rgba(51,65,85,1)", fontSize: 12 }}>
          © 2026 Vertriebo · Alle Rechte vorbehalten · Entwickelt für lokale Dienstleister in Deutschland
        </div>
      </footer>

      <AgencyDemoModal isOpen={showAgencyModal} onClose={() => setShowAgencyModal(false)} />
    </div>
  );
}