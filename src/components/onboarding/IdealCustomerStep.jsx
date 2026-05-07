import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMPANY_SIZES, OBJECT_TYPES, CONTACT_ROLES, PRIORITY_FOCUS } from "@/utils/onboardingConfig";

export default function IdealCustomerStep({ onBack, onNext, loading }) {
  const [companySize, setCompanySize] = useState("any");
  const [objectTypes, setObjectTypes] = useState([]);
  const [contactRoles, setContactRoles] = useState([]);
  const [priorityFocus, setPriorityFocus] = useState([]);

  const toggleArray = (arr, setArr, item) => {
    setArr(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const handleNext = () => {
    onNext({
      ideal_customer_profile: {
        company_size: companySize,
        object_types: objectTypes,
        contact_roles: contactRoles,
        priority_focus: priorityFocus,
      },
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Welche Firmen passen besonders gut?</h2>
      <p className="text-sm font-medium text-slate-600 mb-6">Definieren Sie Ihr ideales Kundenprofil.</p>

      <div className="space-y-6">
        {/* Unternehmensgröße */}
        <div>
          <Label className="text-xs font-semibold text-slate-900 mb-2 block">Unternehmensgröße</Label>
          <Select value={companySize} onValueChange={setCompanySize}>
            <SelectTrigger className="bg-white text-slate-900 border-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map(size => (
                <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Objekt-/Betriebsart */}
        <div>
          <Label className="text-xs font-semibold text-slate-900 mb-2 block">Objekt-/Betriebsart (Mehrfachauswahl)</Label>
          <div className="flex flex-wrap gap-2">
            {OBJECT_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => toggleArray(objectTypes, setObjectTypes, type)}
                className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${
                  objectTypes.includes(type)
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                    : "border-slate-300 text-slate-700 hover:border-blue-300 hover:bg-slate-50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Ansprechpartner */}
        <div>
          <Label className="text-xs font-semibold text-slate-900 mb-2 block">Ansprechpartner (Mehrfachauswahl)</Label>
          <div className="flex flex-wrap gap-2">
            {CONTACT_ROLES.map(role => (
              <button
                key={role}
                type="button"
                onClick={() => toggleArray(contactRoles, setContactRoles, role)}
                className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${
                  contactRoles.includes(role)
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                    : "border-slate-300 text-slate-700 hover:border-blue-300 hover:bg-slate-50"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Priorität */}
        <div>
          <Label className="text-xs font-semibold text-slate-900 mb-2 block">Priorität (Mehrfachauswahl)</Label>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_FOCUS.map(focus => (
              <button
                key={focus}
                type="button"
                onClick={() => toggleArray(priorityFocus, setPriorityFocus, focus)}
                className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all ${
                  priorityFocus.includes(focus)
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                    : "border-slate-300 text-slate-700 hover:border-blue-300 hover:bg-slate-50"
                }`}
              >
                {focus}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <Button variant="outline" onClick={onBack} disabled={loading}>Zurück</Button>
        <Button onClick={handleNext} disabled={loading} className="flex-1 gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Weiter
        </Button>
      </div>
    </div>
  );
}