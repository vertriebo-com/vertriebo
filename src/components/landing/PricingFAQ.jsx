import { HelpCircle } from "lucide-react";

const FAQS = [
  { question: "Was sind gespeicherte Firmenkontakte?", answer: "Das sind alle Firmen, die Sie mit Vertriebo recherchieren oder manuell erfassen. Sie behalten alle Kontakte dauerhaft in Ihrer Datenbank. Die monatlichen Limits (z.B. 300 beim Starter-Plan) zeigen, wie viele neue Kontakte Sie pro Monat speichern können. Alle Ihre Kontakte bleiben unbegrenzt abrufbar." },
  { question: "Wie funktionieren Recherche-Läufe?", answer: "Mit einem Recherche-Lauf starten Sie eine automatische Firmensuche in Ihrer Region. Pro Lauf wählen Sie die Anzahl der zu recherchierenden Kontakte. Gespeicherte Kontakte zählen zu Ihrem monatlichen Limit (z.B. 300 beim Starter-Plan). Die Anzahl der Recherche-Läufe selbst ist nicht begrenzt – nur die Kontakte, die Sie speichern, werden gezählt." },
  { question: "Was beinhalten die Research-Läufe?", answer: "Ein Research-Lauf ist eine automatische Suche nach Firmenkontakten in Ihrem definierten Zielgebiet, Branche und Kundentyp. Vertriebo findet passende Firmen, priorisiert sie nach Potenzial und speichert sie in Ihrem CRM – bereit zum Anrufen." },
  { question: "Was sind KI-Aktionen?", answer: "KI-Aktionen umfassen Lead-Bewertung, E-Mail-Entwürfe, Gesprächseinstiege, Follow-up-Vorschläge und Vertriebs-Coaching. Der KI-Morgenreport (Professional+) nutzt auch KI-Aktionen. Jede KI-gestützte Funktion verbraucht eine Aktion." },
  { question: "Was ist im KI-Morgenreport enthalten?", answer: "Der KI-Morgenreport (Professional & Gold) erstellt täglich automatisch einen Brief für Ihr Team mit Top-Prioritäten des Tages, offenen Aufgaben, besprochenen Leads und Erfolgsquoten. Spart Zeit und fokussiert Ihr Team." },
  { question: "Was ist der Agency-Plan?", answer: "Der Agency-Plan ist für Agenturen und größere Teams mit Bedarf für mehrere Kundenorganisationen und hohem Kontaktvolumen. Dieser Plan ist kein Self-Service-Produkt – wir arbeiten mit Ihnen zusammen, um eine maßgeschneiderte Lösung zu schaffen. Kontaktieren Sie uns für ein Gespräch und ein individuelles Angebot." },
  { question: "Gibt es eine Testphase?", answer: "Ja – beim Starter-Plan erhalten Sie 14 Tage kostenlos zum Testen (Zahlungsmethode erforderlich, kein Abzug während des Testzeitraums). Professional und Gold starten direkt ohne Testphase. Alle Pläne sind monatlich kündbar." },
  { question: "Kann ich monatlich kündigen?", answer: "Ja, alle Self-Service-Pläne (Starter, Professional, Gold) sind monatlich kündbar. Keine langfristigen Verträge, keine versteckten Kosten. Sie können jederzeit über Ihr Konto kündigen. Der Agency-Plan wird individuell vereinbart." },
  { question: "Was passiert mit meinen Daten nach Kündigung?", answer: "Ihre Firmenkontakte und Dokumentation bleiben 30 Tage nach Kündigung einsehbar. Im Agency-Plan unterstützen wir Sie bei einem sanften Offboarding. Alle Daten sind DSGVO-konform und können exportiert werden." },
  { question: "Wie viele Vertriebler kann ich im Starter-Plan haben?", answer: "Der Starter-Plan ist für bis zu 2 Vertriebler ausgelegt. Jeder sieht nur seine zugeordneten Leads. Der Professional-Plan unterstützt bis zu 5 Vertriebler, der Gold-Plan 10." },
];

export default function PricingFAQ() {
  return (
    <div style={{ background: "#080e1e", padding: "80px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: "white", textAlign: "center", marginBottom: 40 }}>
          Häufige Fragen zu den Preisen
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <HelpCircle size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "white" }}>{faq.question}</h3>
              </div>
              <p style={{ fontSize: 13, color: "rgba(148,163,184,1)", lineHeight: 1.7, marginLeft: 28 }}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}