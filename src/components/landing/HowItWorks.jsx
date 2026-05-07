import { Building2, Target, Phone, Mail, TrendingUp, Users, Calendar, FileText, Shield, Search, CheckCircle, BarChart3, ArrowRight } from "lucide-react";

const HOW_IT_WORKS = [
  {
    step: "Schritt 1",
    icon: Search,
    title: "Zielgebiet und Zielkunden festlegen",
    desc: "Definieren Sie PLZ-Gebiete, Branchen und Umkreis. Vertriebo sucht automatisch passende Firmen in Ihrem Zielgebiet.",
    color: "blue",
  },
  {
    step: "Schritt 2",
    icon: Target,
    title: "Firmenkontakte recherchieren und priorisieren",
    desc: "Das System findet Firmenkontakte und bewertet sie nach Potenzial. Heiße Leads werden zuerst angezeigt.",
    color: "emerald",
  },
  {
    step: "Schritt 3",
    icon: Phone,
    title: "Anrufen, nachfassen, dokumentieren und Abschlüsse messen",
    desc: "Ihr Team arbeitet die täglichen Prioritäten ab. Alle Kontakte werden dokumentiert, Erfolge gemessen.",
    color: "purple",
  },
];

const FEATURES = [
  {
    icon: Building2,
    title: "Firmenkontakte automatisch finden",
    desc: "Ihr Team sieht täglich neue, passende Firmenkontakte – ohne manuelle Suche.",
  },
  {
    icon: Target,
    title: "Ihr Team weiß, wen es zuerst anrufen sollte",
    desc: "KI-basiertes Scoring zeigt die vielversprechendsten Leads priorisiert an.",
  },
  {
    icon: Phone,
    title: "Rückrufe und Follow-ups landen automatisch als Aufgabe",
    desc: "Nichts geht mehr verloren. Das System erinnert an jeden wichtigen Kontakt.",
  },
  {
    icon: Mail,
    title: "Professionelle E-Mails mit Ihrem Logo",
    desc: "Vorgefertigte Vorlagen für Erstkontakt, Angebote und Nachfassen.",
  },
  {
    icon: TrendingUp,
    title: "Sie sehen genau, was Ihr Team leistet",
    desc: "Reports zeigen Anrufe, gewonnene Leads und Conversion-Raten auf einen Blick.",
  },
  {
    icon: Users,
    title: "Jeder sieht nur seine Leads",
    desc: "Mandantentrennung und rollenbasierte Zugriffe schützen Ihre Daten.",
  },
];

export default function HowItWorks() {
  return (
    <div className="bg-white py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-4 text-slate-900">So funktioniert Vertriebo in 3 Schritten</h2>
        <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
          Einfach, klar, effektiv. Ohne komplizierte Einrichtung.
        </p>
        
        <div className="grid md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((item, i) => {
            const Icon = item.icon;
            const bgColor = item.color === "blue" ? "bg-blue-50" : item.color === "emerald" ? "bg-emerald-50" : "bg-purple-50";
            const iconColor = item.color === "blue" ? "text-blue-600" : item.color === "emerald" ? "text-emerald-600" : "text-purple-600";
            const borderColor = item.color === "blue" ? "border-blue-200" : item.color === "emerald" ? "border-emerald-200" : "border-purple-200";
            
            return (
              <div key={i} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-slate-200 to-transparent -translate-x-1/2 z-0" />
                )}
                <div className={`relative z-10 bg-white border-2 ${borderColor} rounded-xl p-6 text-center hover:shadow-lg transition-shadow`}>
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${bgColor} flex items-center justify-center`}>
                    <Icon className={`w-8 h-8 ${iconColor}`} />
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{item.step}</p>
                  <h3 className="font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}