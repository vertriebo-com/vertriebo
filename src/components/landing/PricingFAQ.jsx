import { Info, HelpCircle } from "lucide-react";

const FAQS = [
  {
    question: "Was sind gespeicherte Firmenkontakte?",
    answer: "Das sind alle Firmen, die Sie mit Vertriebo recherchieren oder manuell erfassen. Sie behalten alle Kontakte dauerhaft in Ihrer Datenbank – es gibt kein 'Leads pro Monat'-Limit. Blacklisted Kontakte zählen nicht auf Ihr Limit.",
  },
  {
    question: "Wie funktionieren Recherche-Läufe?",
    answer: "Mit einem Recherche-Lauf starten Sie eine automatische Firmensuche in Ihrer Region. Pro Lauf wählen Sie 25, 50 oder 100 Kontakte. Gespeicherte Kontakte zählen zu Ihrem monatlichen Limit (z.B. 300 beim Starter-Plan). Läufe selbst sind unbegrenzt — nur die gespeicherten Kontakte werden gezählt.",
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