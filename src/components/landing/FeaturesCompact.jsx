import { Building2, Target, Phone, Mail, TrendingUp, Users, Calendar, FileText, Shield, Check } from "lucide-react";

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

export default function FeaturesCompact() {
  return (
    <div className="bg-slate-50 border-y border-slate-200 py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-4 text-slate-900">Was Vertriebo anders macht</h2>
        <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
          Nicht nur ein CRM. Ein System, das Ihrem Team zeigt, was zu tun ist.
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}