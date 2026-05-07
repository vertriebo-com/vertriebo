import { Building2, Phone, Mail, Calendar, User, TrendingUp, Star, Check, X, PhoneCall, MessageSquare, FileText, Clock, MapPin, Briefcase } from "lucide-react";

const PRIORITIZED_LEADS = [
  { 
    name: "Schmidt Gebäudereinigung GmbH", 
    branche: "Gebäudereinigung", 
    ort: "Berlin", 
    prio: "Hoch", 
    status: "Rückruf",
    contact: "Herr Schmidt",
    lastContact: "Gestern",
    tasks: 2
  },
  { 
    name: "Hausmeisterdienst Müller", 
    branche: "Hausmeister", 
    ort: "Potsdam", 
    prio: "Hoch", 
    status: "Erstkontakt",
    contact: "Frau Müller",
    lastContact: "Nie",
    tasks: 1
  },
  { 
    name: "Security Services Nord", 
    branche: "Sicherheitsdienst", 
    ort: "Hamburg", 
    prio: "Mittel", 
    status: "Angebot",
    contact: "Herr König",
    lastContact: "Vor 3 Tagen",
    tasks: 3
  },
  { 
    name: "Gartenbau Schmidt GmbH", 
    branche: "Garten- und Landschaftsbau", 
    ort: "Berlin", 
    prio: "Mittel", 
    status: "Termin",
    contact: "Herr Schmidt",
    lastContact: "Heute",
    tasks: 1
  },
];

const TODAY_TASKS = [
  { time: "09:00", type: "Rückruf", company: "Schmidt GmbH", status: "offen" },
  { time: "11:30", type: "Angebot senden", company: "Müller KG", status: "offen" },
  { time: "14:00", type: "Termin", company: "Nord GmbH", status: "bestätigt" },
  { time: "16:00", type: "Nachfassen", company: "Meier GmbH", status: "offen" },
];

export default function ProductShowcase() {
  return (
    <div className="bg-white py-16">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
            So arbeitet Ihr Team mit Vertriebo
          </h2>
          <p className="text-slate-600 max-w-3xl mx-auto text-lg">
            Vertriebo führt Ihr Team durch den Vertriebsalltag – von neuen Firmenkontakten über Rückrufe bis zum Nachfassen.
          </p>
        </div>

        {/* Haupt-Mockup: Dashboard mit echtem UI */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mb-10">
          {/* Browser Header */}
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500" />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-600 font-medium">app.vertriebo.de</div>
            </div>
            <div className="w-16" />
          </div>

          {/* App Header */}
          <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <span className="text-white font-bold text-xs">V</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Vertriebo</p>
                <p className="text-[10px] text-slate-500">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-600">
                <User className="w-3.5 h-3.5" />
                <span>Max Mustermann</span>
              </div>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="p-6">
            {/* Stats Row */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Heute fällig</span>
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-900">12</p>
                <p className="text-[10px] text-blue-600 mt-0.5">Rückrufe & Aufgaben</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Offene Leads</span>
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-900">47</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Firmen im Pipeline</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">Diese Woche</span>
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-900">23</p>
                <p className="text-[10px] text-purple-600 mt-0.5">Anrufe durchgeführt</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Konversionsrate</span>
                  <Star className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-amber-900">18%</p>
                <p className="text-[10px] text-amber-600 mt-0.5">Von Lead zu Kunde</p>
              </div>
            </div>

            {/* Main Content: 2 Columns */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left: Prioritized Leads (2 columns) */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    Priorisierte Leads für heute
                  </h3>
                  <button className="text-xs font-semibold text-blue-600 hover:underline">Alle anzeigen →</button>
                </div>
                
                <div className="space-y-2">
                  {PRIORITIZED_LEADS.map((lead, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate">{lead.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="truncate">{lead.branche}</span>
                            <span>·</span>
                            <span className="truncate">{lead.ort}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          lead.prio === "Hoch" ? "bg-red-100 text-red-700 border border-red-200" : "bg-amber-100 text-amber-700 border border-amber-200"
                        }`}>
                          {lead.prio}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          lead.status === "Rückruf" ? "bg-amber-100 text-amber-700 border border-amber-200" :
                          lead.status === "Termin" ? "bg-purple-100 text-purple-700 border border-purple-200" :
                          lead.status === "Angebot" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                          "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {lead.status}
                        </span>
                        <button className="p-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 transition-colors group-hover:opacity-100">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Today's Tasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Heute
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500">4 Aufgaben</span>
                </div>
                
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-2">
                  {TODAY_TASKS.map((task, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="text-[10px] font-bold text-slate-600 w-10 flex-shrink-0">{task.time}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-slate-900 truncate">{task.type}</p>
                        <p className="text-[10px] text-slate-600 truncate">{task.company}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
                        task.status === "bestätigt" ? "bg-emerald-500" : "bg-amber-500"
                      }`} />
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="mt-4 space-y-2">
                  <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">
                    <PhoneCall className="w-3.5 h-3.5" />
                    Nächsten anrufen
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Kontakt loggen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Feature-Punkte mit UI-Ausschnitten */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900">Tagesprioritäten statt Chaos</h3>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Ihr Team sieht jeden Morgen, welche Firmen heute angerufen werden sollten. Priorisiert nach Potenzial.
            </p>
            <ul className="space-y-1.5 mb-4">
              {["Heute fällige Rückrufe", "Priorisierte Neuleads", "Offene Angebote"].map((item, j) => (
                <li key={j} className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            
            {/* Mini UI: Task List */}
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-1.5 bg-red-50 rounded border border-red-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-[10px] font-semibold text-red-800">09:00 Rückruf</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-blue-50 rounded border border-blue-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-semibold text-blue-800">11:30 Angebot</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900">Komplette Kontakthistorie</h3>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Alle Gespräche, E-Mails und Notizen zu jeder Firma an einem Ort. Nichts geht verloren.
            </p>
            <ul className="space-y-1.5 mb-4">
              {["Alle Anrufe dokumentiert", "E-Mail-Verlauf", "Gespeicherte Notizen"].map((item, j) => (
                <li key={j} className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            
            {/* Mini UI: Contact Log */}
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <div className="space-y-2">
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-semibold text-slate-700">Anruf gestern</span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-tight">"Interesse an Angebot bekundet, möchte Vergleich..."</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Mail className="w-3 h-3" />
                  <span>3 E-Mails gesendet</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Mail className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900">E-Mails & Follow-ups</h3>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Von der Erstansprache bis zum Nachfassen – alles organisiert und nachverfolgbar.
            </p>
            <ul className="space-y-1.5 mb-4">
              {["E-Mail-Vorlagen", "Automatische Aufgaben", "Follow-up-Erinnerungen"].map((item, j) => (
                <li key={j} className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            
            {/* Mini UI: Email Template */}
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-blue-50 rounded p-2 border border-blue-200">
                  <p className="text-[10px] font-semibold text-blue-700">Vorlage: Erstkontakt</p>
                  <p className="text-[9px] text-blue-600 mt-0.5">"Guten Tag, hier ist..."</p>
                </div>
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}