import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { TARGET_CUSTOMER_TYPES, EXCLUDED_CUSTOMER_TYPES } from "@/utils/onboardingConfig";

export default function LeadTargetingStep({ onBack, onNext, loading }) {
  const [targetCustomers, setTargetCustomers] = useState([]);
  const [customTargets, setCustomTargets] = useState([]);
  const [customTargetInput, setCustomTargetInput] = useState("");
  const [excluded, setExcluded] = useState([]);
  const [customExcluded, setCustomExcluded] = useState([]);
  const [customExcludedInput, setCustomExcludedInput] = useState("");

  const toggleTarget = (type) => {
    setTargetCustomers(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const addCustomTarget = () => {
    if (!customTargetInput.trim()) return;
    if (!customTargets.includes(customTargetInput.trim())) {
      setCustomTargets([...customTargets, customTargetInput.trim()]);
    }
    setCustomTargetInput("");
  };

  const removeCustomTarget = (target) => {
    setCustomTargets(customTargets.filter(t => t !== target));
  };

  const toggleExcluded = (type) => {
    setExcluded(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const addCustomExcluded = () => {
    if (!customExcludedInput.trim()) return;
    if (!customExcluded.includes(customExcludedInput.trim())) {
      setCustomExcluded([...customExcluded, customExcludedInput.trim()]);
    }
    setCustomExcludedInput("");
  };

  const removeCustomExcluded = (item) => {
    setCustomExcluded(customExcluded.filter(t => t !== item));
  };

  const handleNext = () => {
    if (targetCustomers.length === 0 && customTargets.length === 0) {
      alert("Bitte wählen Sie mindestens eine Wunschkundengruppe aus.");
      return;
    }
    onNext({
      target_customer_types: targetCustomers,
      custom_target_customer_types: customTargets,
      excluded_customer_types: excluded,
      custom_excluded_customer_types: customExcluded,
    });
  };

  return (
    <div className="space-y-6">
      {/* Wunschkunden */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Welche B2B-Kunden möchten Sie gewinnen?</h2>
        <p className="text-sm font-medium text-slate-600 mb-4">Diese Auswahl steuert, welche Firmen Vertriebo für Sie recherchiert.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {TARGET_CUSTOMER_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => toggleTarget(type)}
              className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${
                targetCustomers.includes(type)
                  ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                  : "border-slate-300 text-slate-700 hover:border-blue-300 hover:bg-slate-50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-2">
          <Input
            value={customTargetInput}
            onChange={e => setCustomTargetInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCustomTarget()}
            placeholder="Eigene Zielgruppe eingeben..."
            className="text-sm bg-white text-slate-900 border-slate-300"
          />
          <Button variant="outline" size="sm" onClick={addCustomTarget}>Hinzufügen</Button>
        </div>

        {customTargets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customTargets.map(target => (
              <span key={target} className="text-xs px-3 py-1.5 rounded-full border-2 border-blue-600 bg-blue-50 text-blue-700 font-semibold flex items-center gap-1">
                {target}
                <button onClick={() => removeCustomTarget(target)} className="ml-0.5 hover:text-red-600">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ausschlüsse */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Welche Firmen sollen nicht gesucht werden?</h2>
        <p className="text-sm font-medium text-slate-600 mb-4">So vermeiden Sie unpassende Leads.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {EXCLUDED_CUSTOMER_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => toggleExcluded(type)}
              className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${
                excluded.includes(type)
                  ? "border-red-600 bg-red-50 text-red-700 font-semibold"
                  : "border-slate-300 text-slate-700 hover:border-red-300 hover:bg-slate-50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-2">
          <Input
            value={customExcludedInput}
            onChange={e => setCustomExcludedInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCustomExcluded()}
            placeholder="Weitere Ausschlüsse..."
            className="text-sm bg-white text-slate-900 border-slate-300"
          />
          <Button variant="outline" size="sm" onClick={addCustomExcluded}>Hinzufügen</Button>
        </div>

        {customExcluded.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customExcluded.map(item => (
              <span key={item} className="text-xs px-3 py-1.5 rounded-full border-2 border-red-600 bg-red-50 text-red-700 font-semibold flex items-center gap-1">
                {item}
                <button onClick={() => removeCustomExcluded(item)} className="ml-0.5 hover:text-slate-700">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
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