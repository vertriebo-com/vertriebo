import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SettingsSection from "./SettingsSection";

const FIELDS = [
  { key: "company_name",    label: "Firmenname",    placeholder: "Huwa Gebäudereinigung & Hausmeisterdienste" },
  { key: "company_address", label: "Straße & Nr.",  placeholder: "Mittelweg 24" },
  { key: "company_plz",     label: "PLZ",           placeholder: "56566" },
  { key: "company_city",    label: "Ort",           placeholder: "Neuwied" },
  { key: "company_phone",   label: "Telefon",       placeholder: "02601/9131820" },
  { key: "company_email",   label: "E-Mail",        placeholder: "info@huwa-gebaeudedienste.de" },
  { key: "company_website", label: "Website",       placeholder: "www.huwa-gebaeudedienste.de" },
];

export default function CompanySettings() {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await base44.entities.AppSettings.list();
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    setValues(map);
  };

  const handleSave = async () => {
    setSaving(true);
    const existing = await base44.entities.AppSettings.list();
    const existingMap = {};
    existing.forEach(s => { existingMap[s.key] = s.id; });

    await Promise.all(
      FIELDS.map(f => {
        const val = values[f.key] || "";
        if (existingMap[f.key]) {
          return base44.entities.AppSettings.update(existingMap[f.key], { value: val });
        } else {
          return base44.entities.AppSettings.create({ key: f.key, value: val });
        }
      })
    );
    toast.success("Firmendaten gespeichert!");
    setSaving(false);
  };

  return (
    <SettingsSection
      icon={Building2}
      title="Firmendaten"
      description="Werden in alle PDFs und E-Mail-Vorlagen übernommen"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        {FIELDS.map(f => (
          <div key={f.key} className={f.key === "company_name" ? "sm:col-span-2" : ""}>
            <Label className="text-xs mb-1 block">{f.label}</Label>
            <Input
              placeholder={f.placeholder}
              value={values[f.key] || ""}
              onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Speichern..." : "Speichern"}
        </Button>
      </div>
    </SettingsSection>
  );
}