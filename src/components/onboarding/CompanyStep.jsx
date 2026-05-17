import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { INDUSTRIES } from "@/utils/onboardingConfig";
import LocationAutocomplete from "@/components/LocationAutocomplete";

const OTHER_INDUSTRY = { icon: "🔧", name: "Andere Branche / Sonstiges" };

export default function CompanyStep({ onNext, loading, initialData }) {
  const [firmenname, setFirmenname] = useState(initialData?.firmenname || "");
  const [selectedIndustry, setSelectedIndustry] = useState(initialData?.selectedIndustry || null);
  const [customIndustry, setCustomIndustry] = useState(initialData?.customIndustry || "");
  const [location, setLocation] = useState(initialData?.location || null);
  const [radius, setRadius] = useState(initialData?.radius || 25);

  const isOtherIndustry = selectedIndustry?.name === OTHER_INDUSTRY.name;

  const handleNext = () => {
    if (!firmenname.trim()) {
      alert("Bitte geben Sie Ihren Firmennamen ein.");
      return;
    }
    if (!selectedIndustry) {
      alert("Bitte wählen Sie Ihre Branche aus.");
      return;
    }
    if (!location?.city) {
      alert("Bitte geben Sie Ihren Standort ein und wählen Sie ihn aus der Liste aus.");
      return;
    }
    // Bei "Andere Branche": customIndustry-Label in selectedIndustry einbauen
    const finalIndustry = isOtherIndustry && customIndustry.trim()
      ? { ...selectedIndustry, name: customIndustry.trim(), isFallback: true, fallbackLabel: customIndustry.trim() }
      : selectedIndustry;
    onNext({ firmenname, selectedIndustry: finalIndustry, location, radius, customIndustry: isOtherIndustry ? customIndustry.trim() : undefined });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Willkommen bei Vertriebo!</h2>
        <p className="text-sm font-medium text-slate-600">Machen Sie sich in 3 Minuten bereit für Ihre ersten Leads.</p>
      </div>

      {/* Firmenname */}
      <div>
        <Label className="text-xs font-semibold text-slate-900 mb-2 block">Firmenname *</Label>
        <Input
          value={firmenname}
          onChange={e => setFirmenname(e.target.value)}
          placeholder="z.B. Muster Gebäudeservice GmbH"
          autoFocus
          className="bg-white text-slate-900 border-slate-300"
        />
      </div>

      {/* Branche */}
      <div>
        <Label className="text-xs font-semibold text-slate-900 mb-2 block">Ihre Branche *</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
          {INDUSTRIES.filter(i => i.name !== OTHER_INDUSTRY.name).map(ind => (
            <button
              key={ind.name}
              type="button"
              onClick={() => { setSelectedIndustry(selectedIndustry?.name === ind.name ? null : ind); setCustomIndustry(""); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm text-left transition-all ${
                selectedIndustry?.name === ind.name
                  ? "border-blue-600 bg-blue-50 font-semibold text-blue-700"
                  : "border-slate-300 hover:border-blue-300 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <span className="text-lg">{ind.icon}</span>
              <span className="text-xs leading-tight">{ind.name}</span>
            </button>
          ))}
          {/* "Andere Branche" immer zuletzt */}
          <button
            type="button"
            onClick={() => setSelectedIndustry(isOtherIndustry ? null : OTHER_INDUSTRY)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm text-left transition-all ${
              isOtherIndustry
                ? "border-slate-500 bg-slate-100 font-semibold text-slate-700"
                : "border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 border-dashed"
            }`}
          >
            <span className="text-lg">🔧</span>
            <span className="text-xs leading-tight">Andere Branche</span>
          </button>
        </div>
        {isOtherIndustry && (
          <div className="mt-2">
            <Input
              value={customIndustry}
              onChange={e => setCustomIndustry(e.target.value)}
              placeholder="Ihre Branche eingeben, z.B. Fassadenreinigung…"
              className="bg-white text-slate-900 border-slate-300"
              autoFocus
            />
            <p className="text-[11px] text-slate-500 mt-1">Wir verwenden ein generisches Profil und nehmen Ihre Branche in unsere Taxonomie-Erweiterung auf.</p>
          </div>
        )}
      </div>

      {/* Standort */}
      <div>
        <Label className="text-xs font-semibold text-slate-900 mb-3 block">Ihr Einzugsgebiet *</Label>
        <div className="mb-3">
          <Label className="text-xs mb-1 block font-medium text-slate-700">Hauptstandort</Label>
          <LocationAutocomplete
            value={location}
            onChange={setLocation}
            placeholder="Stadt eingeben, z.B. Neuwied…"
          />
          <p className="text-[11px] text-slate-500 mt-1">Stadt aus der Liste auswählen – Koordinaten werden automatisch gespeichert.</p>
        </div>

        {/* Radius Slider */}
        <div>
          <Label className="text-xs font-semibold text-slate-900 mb-2 block">
            Suchradius: <span className="text-blue-600 font-bold">{radius} km</span>
          </Label>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={radius}
            onChange={e => setRadius(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>5 km</span>
            <span>50 km</span>
            <span>100 km</span>
          </div>
        </div>
      </div>

      <Button
        onClick={handleNext}
        disabled={loading || !firmenname.trim() || !selectedIndustry || !location?.city || (isOtherIndustry && !customIndustry.trim())}
        className="w-full gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Weiter
      </Button>
    </div>
  );
}