import { Info, HelpCircle } from "lucide-react";

const FAQS = [
  {
    question: "Was sind gespeicherte Firmenkontakte?",
    answer: "Das sind alle Firmen, die Sie mit Vertriebo recherchieren oder manuell erfassen. Sie behalten alle Kontakte dauerhaft in Ihrer Datenbank – es gibt kein 'Leads pro Monat'-Limit. Blacklisted Kontakte zählen nicht auf Ihr Limit.",
  },
  {
    question: "Wie funktionieren Recherche-Credits?",
    answer: "Mit Recherche-Credits starten Sie automatische Firmensuchen in Ihrer Region. Ein Credit deckt typisch 25 recherchierte Kontakte ab (je nach Zielgebiet und Branche). Die Kontakte sind danach dauerhaft gespeichert – Credits regenerieren sich nicht, sind aber monatlich neu enthalten.",
  },
  {
    question: "Was beinhalten die Research-Läufe?",
    answer: "Ein Research-Lauf ist eine automatische Suche nach Firmenkontakten in Ihrem definierten Zielgebiet, Branche und Kundentyp. Vertriebo findet passende Firmen, priorisiert sie nach Potenzial und speichert sie in Ihrem CRM – bereit zum Anrufen.",
  },
  {
    question: "Was sind KI-Aktionen?",
    answer: "KI-Aktionen umfassen Lead-Bewertung, E-Mail-Entwürfe, Gesprächseinstiege, Follow-up-Vorschläge und Vertriebs-Coaching. Der KI-Morgenreport (Professional+) nutzt auch KI-Aktionen. Jede KI-gestützte Funktion verbraucht eine Aktion.",
  },
  {
    question: "Wie funktioniert der E-Mail-Versand?",
    answer: "E-Mails werden über Brevo oder SMTP versendet. Sie können vorgefertigte Vorlagen mit Ihrem Logo und Signatur nutzen. Antworten gehen direkt an Ihre hinterlegte Reply-To-Adresse. SPF/DKIM-Einrichtung wird unterstützt.",
  },
  {
    question: "Was ist im KI-Morgenreport enthalten?",
    answer: "Der KI-Morgenreport (Professional & Gold) erstellt täglich automatisch einen Brief für Ihr Team mit Top-Prioritäten des Tages, offenen Aufgaben, besprochenen Leads und Erfolgsquoten. Spart Zeit und fokussiert Ihr Team.",
  },
  {
    question: "Kann ich monatlich kündigen?",
    answer: "Ja, alle Pläne sind monatlich kündbar. Keine langfristigen Verträge, keine versteckten Kosten. Sie können jederzeit über Ihr Konto kündigen.",
  },
  {
    question: "Was passiert mit meinen Daten nach Kündigung?",
    answer: "Ihre Firmenkontakte und Dokumentation bleiben 30 Tage nach Kündigung einsehbar. Im Agency-Plan unterstützen wir Sie bei einem sanften Offboarding. Alle Daten sind DSGVO-konform und können exportiert werden.",
  },
  {
    question: "Wie viele Vertriebler kann ich im Starter-Plan haben?",
    answer: "Der Starter-Plan ist für bis zu 2 Vertriebler ausgelegt. Jeder sieht nur seine zugeordneten Leads. Der Professional-Plan unterstützt bis zu 5 Vertriebler, der Gold-Plan 10.",
  },
];

export default function PricingFAQ() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h2 className="text-2xl font-bold text-center mb-8 text-slate-900">Häufige Fragen zu den Preisen</h2>
      <div className="space-y-4">
        {FAQS.map((faq, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-2">
              <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <h3 className="font-bold text-slate-900">{faq.question}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed ml-8">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}