import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getIndustryIdByLabel } from "@/utils/industryTargetPresets";
import { useTaxonomy } from "@/hooks/useTaxonomy";
import { SERVICES } from "@/utils/onboardingConfig";

export default function TargetingStep({ onBack, onNext, loading, industry, initialData }) {
  const { getPreset } = useTaxonomy();
  const [targetCustomers, setTargetCustomers] = useState(initialData?.targetCustomers || []);
  const [excluded, setExcluded] = useState(initialData?.excluded || []);
  const [services, setServices] = useState(initialData?.services || []);
  const [suggestedTargets, setSuggestedTargets] = useState([]);
  const [suggestedServices, setSuggestedServices] = useState([]);
  const [customServiceInput, setCustomServiceInput] = useState("");

  // Auto-populate from taxonomy based on industry (DB-Quelle via useTaxonomy)
  useEffect(() => {
    if (industry) {
      const industryId = getIndustryIdByLabel(industry.name);
      const preset = getPreset(industryId) || getPreset(industry.name);
      
      if (preset?.targetCustomerTypes) {
        setSuggestedTargets(preset.targetCustomerTypes);
        // Nur vorausfüllen wenn noch keine Auswahl getroffen
        if (targetCustomers.length === 0) {
          setTargetCustomers(preset.targetCustomerTypes);
        }
      }
      
      if (preset?.ownServices) {
        setSuggestedServices(preset.ownServices);
      } else {
        setSuggestedServices(SERVICES);
      }

      // Ausschlüsse aus Preset vorausfüllen
      if (preset?.excludedCustomerTypes && excluded.length === 0) {
        setExcluded(preset.excludedCustomerTypes);
      }
    }
  }, [industry]);

  const toggleTarget = (type) => {
    setTargetCustomers(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleExcluded = (type) => {
    setExcluded(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleService = (service) => {
    setServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const addCustomService = () => {
    if (!customServiceInput.trim()) return;
    if (!services.includes(customServiceInput.trim())) {
      setServices([...services, customServiceInput.trim()]);
    }
    setCustomServiceInput("");
  };

  const removeCustomService = (service) => {
    setServices(services.filter(s => s !== service));
  };

  const handleNext = () => {
    if (targetCustomers.length === 0) {
      alert("Bitte wählen Sie mindestens eine Zielkundengruppe aus.");
      return;
    }
    onNext({
      targetCustomers,
      excluded,
      services,
    });
  };

  return (
    <div className="space-y-6">
      {/* Zielkunden */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Welche B2B-Kunden möchten Sie gewinnen?</h2>
        <p className="text-sm font-medium text-slate-600 mb-4">Basierend auf Ihrer Branche vorausgefüllt.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {suggestedTargets.map(type => (
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
      </div>

      {/* Ausschlüsse (optional) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Welche Firmen ausschließen? (optional)</h2>
        <p className="text-sm font-medium text-slate-600 mb-4">Diese Zielgruppen werden bei der Lead-Generierung nicht berücksichtigt.</p>

        <div className="flex flex-wrap gap-2">
          {(suggestedTargets.length > 0 ? suggestedTargets : ["Privathaushalte", "Kleinanzeigen", "Jobsuchende"]).map(type => (
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
      </div>

      {/* Dienstleistungen (optional) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Ihre Dienstleistungen (optional)</h2>
        <p className="text-sm font-medium text-slate-600 mb-4">Für E-Mail-Vorlagen und Gesprächshilfen.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {suggestedServices.map(service => (
            <button
              key={service}
              type="button"
              onClick={() => toggleService(service)}
              className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${
                services.includes(service)
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
            value={customServiceInput}
            onChange={e => setCustomServiceInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCustomService()}
            placeholder="Weitere Dienstleistung..."
            className="text-sm bg-white text-slate-900 border-slate-300"
          />
          <Button variant="outline" size="sm" onClick={addCustomService}>Hinzufügen</Button>
        </div>

        {services.filter(s => !suggestedServices.includes(s)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {services.filter(s => !suggestedServices.includes(s)).map(service => (
              <span key={service} className="text-xs px-3 py-1.5 rounded-full border-2 border-blue-600 bg-blue-50 text-blue-700 font-semibold flex items-center gap-1">
                {service}
                <button onClick={() => removeCustomService(service)} className="ml-0.5 hover:text-red-600">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={loading}>Zurück</Button>
        <Button onClick={handleNext} disabled={loading || targetCustomers.length === 0} className="flex-1 gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Weiter
        </Button>
      </div>
    </div>
  );
}