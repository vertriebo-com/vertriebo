import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { SERVICES } from "@/utils/onboardingConfig";

export default function ServicesStep({ onBack, onNext, loading }) {
  const [selected, setSelected] = useState([]);
  const [customInput, setCustomInput] = useState("");
  const [custom, setCustom] = useState([]);

  const toggle = (service) => {
    setSelected(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const addCustom = () => {
    if (!customInput.trim()) return;
    if (!custom.includes(customInput.trim())) {
      setCustom([...custom, customInput.trim()]);
    }
    setCustomInput("");
  };

  const removeCustom = (service) => {
    setCustom(custom.filter(s => s !== service));
  };

  const handleNext = () => {
    const all = [...selected, ...custom];
    if (all.length === 0) {
      alert("Bitte wählen Sie mindestens eine Leistung aus.");
      return;
    }
    onNext({
      services: all,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Welche Leistungen bieten Sie an?</h2>
      <p className="text-sm font-medium text-slate-600 mb-4">Diese Leistungen verwendet Vertriebo für E-Mail-Vorlagen, Gesprächshilfen und Follow-up-Texte.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {SERVICES.map(service => (
          <button
            key={service}
            type="button"
            onClick={() => toggle(service)}
            className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${
              selected.includes(service)
                ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                : "border-slate-300 text-slate-700 hover:border-blue-300 hover:bg-slate-50"
            }`}
          >
            {service}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <Input
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addCustom()}
          placeholder="Sonstige Leistung eingeben..."
          className="text-sm bg-white text-slate-900 border-slate-300"
        />
        <Button variant="outline" size="sm" onClick={addCustom}>Hinzufügen</Button>
      </div>

      {custom.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {custom.map(service => (
            <span key={service} className="text-xs px-3 py-1.5 rounded-full border-2 border-blue-600 bg-blue-50 text-blue-700 font-semibold flex items-center gap-1">
              {service}
              <button onClick={() => removeCustom(service)} className="ml-0.5 hover:text-red-600">×</button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={loading}>Zurück</Button>
        <Button onClick={handleNext} disabled={loading} className="flex-1 gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Weiter
        </Button>
      </div>
    </div>
  );
}