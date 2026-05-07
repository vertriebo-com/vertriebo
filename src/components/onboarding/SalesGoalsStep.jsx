import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2, Target, Users, Phone, Calendar } from "lucide-react";

const ZIELKUNDEN_OPTIONS = [
  "Hausverwaltungen", "Büros", "Arztpraxen", "Restaurants", "Immobilienfirmen",
  "Gewerbekunden", "Industrie", "Logistik", "Schulen / Bildungseinrichtungen", "Krankenhäuser / Kliniken",
];

const DIENSTLEISTUNGEN_OPTIONS = [
  "Gebäudereinigung", "Büroreinigung", "Treppenhausreinigung", "Fensterreinigung",
  "Hausmeisterdienst", "Entrümpelung", "Gartenpflege", "Winterdienst",
  "Sicherheitsdienst", "IT-Service", "Catering", "Logistik / Transport",
];

export default function SalesGoalsStep({ onBack, onNext, industryName }) {
  const [saving, setSaving] = useState(false);

  // Zielkunden
  const [selectedZielkunden, setSelectedZielkunden] = useState([]);
  const [customZielkunde, setCustomZielkunde] = useState("");

  // Dienstleistungen
  const [selectedDienste, setSelectedDienste] = useState([]);
  const [customDienst, setCustomDienst] = useState("");

  // Vertriebsziele
  const [kontakteProWoche, setKontakteProWoche] = useState("20");
  const [anrufeProWoche, setAnrufeProWoche] = useState("30");
  const [termineProWoche, setTermineProWoche] = useState("3");
  const [followUpTage, setFollowUpTage] = useState("3");
  const [standardVertriebler, setStandardVertriebler] = useState("");

  const toggleZielkunde = (v) =>
    setSelectedZielkunden(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const toggleDienst = (v) =>
    setSelectedDienste(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const addCustomZielkunde = () => {
    const v = customZielkunde.trim();
    if (v && !selectedZielkunden.includes(v)) setSelectedZielkunden(prev => [...prev, v]);
    setCustomZielkunde("");
  };

  const addCustomDienst = () => {
    const v = customDienst.trim();
    if (v && !selectedDienste.includes(v)) setSelectedDienste(prev => [...prev, v]);
    setCustomDienst("");
  };

  const handleNext = () => {
    const data = {
      zielkunden: selectedZielkunden,
      dienstleistungen: selectedDienste,
      sales_goal_contacts_per_week: kontakteProWoche,
      sales_goal_calls_per_week: anrufeProWoche,
      sales_goal_appointments_per_week: termineProWoche,
      sales_goal_followup_days: followUpTage,
      sales_default_rep: standardVertriebler,
    };
    onNext(data);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Zielkunden & Vertriebsziele</h2>
      <p className="text-sm font-medium text-slate-600 mb-6">
        Diese Einstellungen konfigurieren das System für Ihre Vertriebsstrategie.
      </p>

      {/* Zielkunden */}
      <div className="mb-6">
        <Label className="text-xs font-semibold mb-3 block flex items-center gap-1.5 text-slate-900">
          <Users className="w-3.5 h-3.5" /> Ihre Zielkunden
        </Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {ZIELKUNDEN_OPTIONS.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => toggleZielkunde(v)}
              className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${
                selectedZielkunden.includes(v)
                  ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                  : "border-slate-300 text-slate-700 hover:border-blue-300 hover:bg-slate-50"
              }`}
            >{v}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={customZielkunde}
            onChange={e => setCustomZielkunde(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCustomZielkunde()}
            placeholder="Eigene Zielgruppe eingeben..."
            className="text-sm h-9 bg-white text-slate-900 placeholder:text-slate-400 border-slate-300"
          />
          <Button variant="outline" size="sm" onClick={addCustomZielkunde} className="shrink-0">Hinzufügen</Button>
        </div>
        {selectedZielkunden.filter(v => !ZIELKUNDEN_OPTIONS.includes(v)).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedZielkunden.filter(v => !ZIELKUNDEN_OPTIONS.includes(v)).map(v => (
              <span key={v} className="text-xs px-3 py-1.5 rounded-full border-2 border-blue-600 bg-blue-50 text-blue-700 font-semibold flex items-center gap-1">
                {v}
                <button onClick={() => toggleZielkunde(v)} className="ml-0.5 hover:text-red-600">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Dienstleistungen */}
      <div className="mb-6">
        <Label className="text-xs font-semibold mb-3 block flex items-center gap-1.5 text-slate-900">
          <Target className="w-3.5 h-3.5" /> Ihre Dienstleistungen
        </Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {DIENSTLEISTUNGEN_OPTIONS.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => toggleDienst(v)}
              className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${
                selectedDienste.includes(v)
                  ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                  : "border-slate-300 text-slate-700 hover:border-blue-300 hover:bg-slate-50"
              }`}
            >{v}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={customDienst}
            onChange={e => setCustomDienst(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCustomDienst()}
            placeholder="Sonstige Leistung eingeben..."
            className="text-sm h-9 bg-white text-slate-900 placeholder:text-slate-400 border-slate-300"
          />
          <Button variant="outline" size="sm" onClick={addCustomDienst} className="shrink-0">Hinzufügen</Button>
        </div>
        {selectedDienste.filter(v => !DIENSTLEISTUNGEN_OPTIONS.includes(v)).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedDienste.filter(v => !DIENSTLEISTUNGEN_OPTIONS.includes(v)).map(v => (
              <span key={v} className="text-xs px-3 py-1.5 rounded-full border-2 border-blue-600 bg-blue-50 text-blue-700 font-semibold flex items-center gap-1">
                {v}
                <button onClick={() => toggleDienst(v)} className="ml-0.5 hover:text-red-600">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Vertriebsziele */}
      <div className="mb-6">
        <Label className="text-xs font-semibold mb-3 block flex items-center gap-1.5 text-slate-900">
          <Phone className="w-3.5 h-3.5" /> Wöchentliche Vertriebsziele
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Neue Kontakte/Woche", value: kontakteProWoche, set: setKontakteProWoche, icon: "👤" },
            { label: "Anrufe/Woche", value: anrufeProWoche, set: setAnrufeProWoche, icon: "📞" },
            { label: "Termine/Woche", value: termineProWoche, set: setTermineProWoche, icon: "📅" },
            { label: "Follow-up nach (Tage)", value: followUpTage, set: setFollowUpTage, icon: "🔄" },
          ].map(item => (
            <div key={item.label}>
              <Label className="text-[11px] text-slate-700 font-semibold mb-1 block">{item.icon} {item.label}</Label>
              <Input
                type="number"
                min="1"
                value={item.value}
                onChange={e => item.set(e.target.value)}
                className="text-sm text-center font-bold bg-white text-slate-900 border-slate-300"
              />
            </div>
          ))}
        </div>
        <div>
          <Label className="text-xs mb-2 block font-semibold text-slate-900">Standard-Vertriebler (E-Mail, optional)</Label>
          <Input
            value={standardVertriebler}
            onChange={e => setStandardVertriebler(e.target.value)}
            placeholder="vertriebler@meinefirma.de"
            className="text-sm bg-white text-slate-900 placeholder:text-slate-400 border-slate-300"
            type="email"
          />
          <p className="text-[11px] text-slate-600 font-medium mt-0.5">Neu generierte Leads werden automatisch zugewiesen</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>Zurück</Button>
        <Button onClick={handleNext} disabled={saving} className="flex-1 gap-2">
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird gespeichert...</>
            : <>Weiter <ArrowRight className="w-4 h-4" /></>
          }
        </Button>
      </div>
    </div>
  );
}