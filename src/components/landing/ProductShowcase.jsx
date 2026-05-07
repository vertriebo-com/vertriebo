import { Check, Building2, Phone, Mail, Calendar, User, TrendingUp, Star, FileText } from "lucide-react";

const PRODUCT_FEATURES = [
  {
    title: "Tagesprioritäten statt Chaos",
    desc: "Ihr Team sieht jeden Morgen, welche Firmen heute angerufen werden sollten. Priorisiert nach Potenzial.",
    items: ["Heute fällige Rückrufe", "Priorisierte Neuleads", "Offene Angebote"],
  },
  {
    title: "Komplette Kontakthistorie je Firma",
    desc: "Alle Gespräche, E-Mails und Notizen zu jeder Firma an einem Ort. Nichts geht verloren.",
    items: ["Alle Anrufe dokumentiert", "E-Mail-Verlauf", "Gespeicherte Notizen"],
  },
  {
    title: "E-Mails, Aufgaben & Follow-ups zentral",
    desc: "Von der Erstansprache bis zum Nachfassen – alles organisiert und nachverfolgbar.",
    items: ["E-Mail-Vorlagen", "Automatische Aufgaben", "Follow-up-Erinnerungen"],
  },
];

export default function ProductShowcase() {
  return (
    <div className="bg-white py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-slate-900">So arbeitet Ihr Team mit Vertriebo</h2>
          <p className="text-slate-600 max-w-3xl mx-auto text-lg">
            Vertriebo führt Ihr Team durch den Vertriebsalltag – von neuen Firmenkontakten über Rückrufe bis zum Nachfassen.
          </p>
        </div>

        {/* Großes Haupt-Mockup: Dashboard/Leads-Übersicht */}
        <div className="mb-16">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Browser Header */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="text-xs text-slate-500 font-medium">Vertriebo – Dashboard</div>
              <div className="w-16" />
            </div>

            {/* Dashboard Content */}
            <div className="p-6 md:p-8">
              {/* Header Stats */}
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-700 uppercase">Heute fällig</span>
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-blue-900">12</p>
                  <p className="text-xs text-blue-600 mt-1">Rückrufe & Aufgaben</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-700 uppercase">Offene Leads</span>
                    <Building2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-3xl font-bold text-emerald-900">47</p>
                  <p className="text-xs text-emerald-600 mt-1">Firmen im Pipeline</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-purple-700 uppercase">Diese Woche</span>
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-3xl font-bold text-purple-900">23</p>
                  <p className="text-xs text-purple-600 mt-1">Anrufe durchgeführt</p>
                </div>
              </div>

              {/* Prioritized Leads Table */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Priorisierte Leads für heute
                </h3>
                <div className="space-y-2">
                  {[
                    { name: "Schmidt Gebäudereinigung GmbH", branche: "Gebäudereinigung", ort: "Berlin", prio: "Hoch", status: "Rückruf" },
                    { name: "Hausmeisterdienst Müller", branche: "Hausmeister", ort: "Potsdam", prio: "Hoch", status: "Erstkontakt" },
                    { name: "Security Services Nord", branche: "Sicherheitsdienst", ort: "Hamburg", prio: "Mittel", status: "Angebot" },
                  ].map((lead, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{lead.name}</p>
                          <p className="text-xs text-slate-500">{lead.branche} · {lead.ort}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          lead.prio === "Hoch" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {lead.prio}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                          {lead.status}
                        </span>
                        <button className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors">
                          <Phone className="w-4 h-4 text-emerald-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Feature-Punkte mit kleineren Screenshots */}
        <div className="grid md:grid-cols-3 gap-8">
          {PRODUCT_FEATURES.map((feature, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-600 mb-4">{feature.desc}</p>
              <ul className="space-y-2 mb-4">
                {feature.items.map((item, j) => (
                  <li key={j} className="flex items-center gap-2 text-xs text-slate-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              
              {/* Kleiner UI-Ausschnitt */}
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                {i === 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-xs text-slate-500">09:00 Rückruf Schmidt GmbH</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-xs text-slate-500">11:30 Angebot Müller KG</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs text-slate-500">14:00 Termin Nord GmbH</span>
                    </div>
                  </div>
                )}
                {i === 1 && (
                  <div className="space-y-2">
                    <div className="bg-slate-50 rounded p-2 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-700 mb-1">Letzter Anruf</p>
                      <p className="text-[10px] text-slate-500">"Interesse an Angebot bekundet..."</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <Mail className="w-3 h-3" />
                      <span>3 E-Mails gesendet</span>
                    </div>
                  </div>
                )}
                {i === 2 && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-blue-50 rounded p-2 border border-blue-200">
                      <p className="text-[10px] font-semibold text-blue-700">Vorlage: Erstkontakt</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}