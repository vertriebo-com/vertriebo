import { Info, HelpCircle } from "lucide-react";

const FAQS = [
  {
    question: "Was sind gespeicherte Firmenkontakte?",
    answer: "Das sind alle Firmen, die Sie in Ihrem CRM erfassen. Blacklisted Kontakte zählen nicht mit. Sie behalten alle Kontakte dauerhaft – es gibt kein 'Leads pro Monat'-Limit.",
  },
  {
    question: "Wie funktionieren Recherche-Credits?",
    answer: "Recherche-Credits werden für recherchierte oder angereicherte Firmenkontakte verwendet. Ein recherchierter Firmenkontakt verbraucht in der Regel einen Credit. Recherche-Läufe sind gestartete Suchvorgänge – je nach Ergebnis können dabei mehrere Credits verbraucht werden.",
  },
  {
    question: "Sind Recherche-Credits garantierte Kundenanfragen?",
    answer: "Nein. Recherche-Credits beziehen sich auf recherchierte oder angereicherte Firmenkontakte. Vertriebo liefert Kontakte und Struktur für Ihren Vertrieb, garantiert aber keine Kundenanfragen oder Abschlüsse.",
  },
  {
    question: "Was sind KI-Aktionen?",
    answer: "KI-Aktionen umfassen z. B. Lead-Bewertung, E-Mail-Entwürfe, Gesprächseinstiege, Follow-up-Vorschläge und Vertriebs-Coaching. Jede KI-gestützte Funktion verbraucht eine KI-Aktion.",
  },
  {
    question: "Wie funktioniert der E-Mail-Versand?",
    answer: "Der E-Mail-Versand erfolgt über einen angebundenen Versanddienstleister (Brevo/SMTP). Antworten gehen direkt an Ihre hinterlegte Reply-To-Adresse. SPF/DKIM-Einrichtung wird unterstützt.",
  },
  {
    question: "Kann ich monatlich kündigen?",
    answer: "Ja, alle Pläne sind monatlich kündbar. Keine langfristigen Verträge, keine versteckten Kosten.",
  },
  {
    question: "Was passiert, wenn ich mein Limit überschreite?",
    answer: "Sie erhalten eine Benachrichtigung, wenn Sie sich Ihrem Limit nähern. Im Agency-Plan passen wir die Limits individuell an Ihre Bedürfnisse an.",
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