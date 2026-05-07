import { LayoutDashboard, Users, FileText, Mail } from "lucide-react";

const SCREENSHOTS = [
  {
    title: "Dashboard",
    desc: "Tagesaufgaben & Prioritäten auf einen Blick",
    icon: LayoutDashboard,
    gradient: "from-blue-500 to-blue-600",
  },
  {
    title: "Leads-Übersicht",
    desc: "Alle Firmenkontakte mit Status & Priorität",
    icon: Users,
    gradient: "from-emerald-500 to-emerald-600",
  },
  {
    title: "LeadDetail",
    desc: "Komplette Historie, Aufgaben, E-Mails",
    icon: FileText,
    gradient: "from-purple-500 to-purple-600",
  },
  {
    title: "E-Mail-Vorlagen",
    desc: "Professionelle Templates mit Logo",
    icon: Mail,
    gradient: "from-orange-500 to-orange-600",
  },
];

export default function AppScreenshots() {
  return (
    <div className="bg-slate-900 py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-4 text-white">So arbeitet Ihr Team mit Vertriebo</h2>
        <p className="text-center text-slate-400 mb-12 max-w-2xl mx-auto">
          Intuitive Oberfläche, klare Struktur, maximale Effizienz.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {SCREENSHOTS.map((shot, i) => {
            const Icon = shot.icon;
            return (
              <div key={i} className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors">
                <div className={`aspect-video rounded-lg mb-4 flex items-center justify-center bg-gradient-to-br ${shot.gradient}`}>
                  <Icon className="w-16 h-16 text-white opacity-80" />
                </div>
                <h3 className="font-bold text-white mb-1">{shot.title}</h3>
                <p className="text-sm text-slate-400">{shot.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}