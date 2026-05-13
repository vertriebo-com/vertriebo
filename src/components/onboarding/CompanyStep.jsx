import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { INDUSTRIES } from "@/utils/onboardingConfig";

export default function CompanyStep({ onNext, loading, initialData }) {
  const [firmenname, setFirmenname] = useState(initialData?.firmenname || "");
  const [selectedIndustry, setSelectedIndustry] = useState(initialData?.selectedIndustry || null);
  const [plz, setPlz] = useState(initialData?.plz || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [radius, setRadius] = useState(initialData?.radius || 25);

  const handleNext = () => {
    if (!firmenname.trim()) {
      alert("Bitte geben Sie Ihren Firmennamen ein.");
      return;
    }
    if (!selectedIndustry) {
      alert("Bitte wählen Sie Ihre Branche aus.");
      return;
    }
    if (!plz.trim() || !city.trim()) {
      alert("Bitte geben Sie PLZ und Ort ein.");
      return;
    }
    onNext({ firmenname, selectedIndustry, plz, city, radius });
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {INDUSTRIES.map(ind => (
            <button
              key={ind.name}
              type="button"
              onClick={() => setSelectedIndustry(selectedIndustry?.name === ind.name ? null : ind)}
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
        </div>
      </div>

      {/* Standort */}
      <div>
        <Label className="text-xs font-semibold text-slate-900 mb-3 block">Ihr Einzugsgebiet *</Label>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <div>
            <Label className="text-xs mb-1 block font-medium text-slate-700">PLZ</Label>
            <Input
              value={plz}
              onChange={e => setPlz(e.target.value)}
              placeholder="56566"
              maxLength={5}
              className="bg-white text-slate-900 border-slate-300"
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block font-medium text-slate-700">Ort</Label>
            <Input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Neuwied"
              className="bg-white text-slate-900 border-slate-300"
            />
          </div>
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
        disabled={loading || !firmenname.trim() || !selectedIndustry || !plz.trim() || !city.trim()} 
        className="w-full gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Weiter
      </Button>
    </div>
  );
}