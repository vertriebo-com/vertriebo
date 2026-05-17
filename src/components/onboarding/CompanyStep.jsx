import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import IndustryAutocompleteInput from "@/components/IndustryAutocompleteInput";

export default function CompanyStep({ onNext, loading, initialData }) {
  const [firmenname, setFirmenname] = useState(initialData?.firmenname || "");
  // selectedIndustry: { id, label, isFallback?, fallbackLabel? } | null
  const [selectedIndustry, setSelectedIndustry] = useState(
    initialData?.selectedIndustry
      ? { id: initialData.selectedIndustry.industry_id || initialData.selectedIndustry.id, label: initialData.selectedIndustry.name || initialData.selectedIndustry.label }
      : null
  );
  const [location, setLocation] = useState(initialData?.location || null);
  const [radius, setRadius] = useState(initialData?.radius || 25);

  const handleNext = () => {
    if (!firmenname.trim()) {
      alert("Bitte geben Sie Ihren Firmennamen ein.");
      return;
    }
    if (!selectedIndustry?.id) {
      alert("Bitte wählen Sie Ihre Branche aus.");
      return;
    }
    if (!location?.city) {
      alert("Bitte geben Sie Ihren Standort ein und wählen Sie ihn aus der Liste aus.");
      return;
    }
    // Mapping ins alte Format für Kompatibilität mit Onboarding-Flow
    const finalIndustry = {
      name: selectedIndustry.label,
      industry_id: selectedIndustry.id,
      isFallback: selectedIndustry.isFallback || false,
      fallbackLabel: selectedIndustry.fallbackLabel || undefined,
    };
    onNext({
      firmenname,
      selectedIndustry: finalIndustry,
      location,
      radius,
      customIndustry: selectedIndustry.isFallback ? selectedIndustry.fallbackLabel : undefined,
    });
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

      {/* Branche – Autocomplete */}
      <div>
        <Label className="text-xs font-semibold text-slate-900 mb-2 block">Ihre Branche *</Label>
        <IndustryAutocompleteInput
          value={selectedIndustry}
          onChange={setSelectedIndustry}
          placeholder="Branche suchen, z.B. Gebäudereinigung…"
        />
        {selectedIndustry?.id && !selectedIndustry.isFallback && (
          <p className="text-[11px] text-green-700 mt-1 font-medium">
            ✓ Profil gefunden – Zielkunden und Suchbegriffe werden automatisch geladen.
          </p>
        )}
        {selectedIndustry?.isFallback && (
          <p className="text-[11px] text-slate-500 mt-1">
            Generisches Profil wird verwendet. Wir nehmen Ihre Branche in unsere Erweiterung auf.
          </p>
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
        disabled={loading || !firmenname.trim() || !selectedIndustry?.id || !location?.city}
        className="w-full gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Weiter
      </Button>
    </div>
  );
}