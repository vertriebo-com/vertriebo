import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Save, Plus, X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SettingsSection from "./SettingsSection";

const DEFAULT_KEYWORDS = [
  "Druckerei", "Metallbau", "Metallverarbeitung", "Spedition", "Logistik",
  "Immobilienverwaltung", "Architekturbüro", "Steuerberatung", "Lagerhaus",
  "IT Unternehmen", "Softwareunternehmen", "IT Dienstleister",
];

export default function LeadGenSettings({ users }) {
  const [radius, setRadius] = useState("40");
  const [leadCount, setLeadCount] = useState("25");
  const [centerLat, setCenterLat] = useState("50.4265");
  const [centerLng, setCenterLng] = useState("7.4620");
  const [assignTo, setAssignTo] = useState("");
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS);
  const [newKeyword, setNewKeyword] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await base44.entities.AppSettings.list();
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    if (map.lead_radius) setRadius(map.lead_radius);
    if (map.lead_count) setLeadCount(map.lead_count);
    if (map.lead_lat) setCenterLat(map.lead_lat);
    if (map.lead_lng) setCenterLng(map.lead_lng);
    if (map.lead_assign_to) setAssignTo(map.lead_assign_to);
    if (map.lead_keywords) {
      try { setKeywords(JSON.parse(map.lead_keywords)); } catch (_) {}
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    const existing = await base44.entities.AppSettings.list();
    const existingMap = {};
    existing.forEach(s => { existingMap[s.key] = s.id; });

    const toSave = {
      lead_radius: radius,
      lead_count: leadCount,
      lead_lat: centerLat,
      lead_lng: centerLng,
      lead_assign_to: assignTo,
      lead_keywords: JSON.stringify(keywords),
    };

    await Promise.all(
      Object.entries(toSave).map(([key, value]) => {
        if (existingMap[key]) {
          return base44.entities.AppSettings.update(existingMap[key], { value });
        } else {
          return base44.entities.AppSettings.create({ key, value });
        }
      })
    );
    toast.success("Lead-Einstellungen gespeichert!");
    setSaving(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generateLeads", {
        count: parseInt(leadCount) || 25,
        assign_to: assignTo || undefined,
      });
      toast.success(`${res.data.created} neue Leads generiert!`);
    } catch (e) {
      toast.error("Fehler: " + e.message);
    }
    setGenerating(false);
  };

  return (
    <SettingsSection
      icon={MapPin}
      title="Lead-Generierung"
      description="Google Places API – Einstellungen für automatische Lead-Suche"
    >
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div>
          <Label className="text-xs mb-1 block">Suchradius (km)</Label>
          <Input type="number" value={radius} onChange={e => setRadius(e.target.value)} placeholder="40" />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Anzahl Leads pro Lauf</Label>
          <Input type="number" value={leadCount} onChange={e => setLeadCount(e.target.value)} placeholder="25" />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Mittelpunkt Breitengrad</Label>
          <Input value={centerLat} onChange={e => setCenterLat(e.target.value)} placeholder="50.4265" />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Mittelpunkt Längengrad</Label>
          <Input value={centerLng} onChange={e => setCenterLng(e.target.value)} placeholder="7.4620" />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs mb-1 block">Standard-Zuweisung (Vertriebler)</Label>
          <select
            value={assignTo}
            onChange={e => setAssignTo(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">Automatisch / Alle</option>
            {users.map(u => (
              <option key={u.id} value={u.email}>{u.full_name || u.email}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <Label className="text-xs mb-2 block">Such-Keywords (Branchen)</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {keywords.map((kw, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {kw}
              <button onClick={() => setKeywords(kws => kws.filter((_, j) => j !== i))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Neues Keyword hinzufügen..."
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && newKeyword.trim()) {
                setKeywords(kws => [...kws, newKeyword.trim()]);
                setNewKeyword("");
              }
            }}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={() => {
            if (newKeyword.trim()) { setKeywords(kws => [...kws, newKeyword.trim()]); setNewKeyword(""); }
          }}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={saveSettings} disabled={saving} variant="outline" className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Speichern..." : "Einstellungen speichern"}
        </Button>
        <Button onClick={handleGenerate} disabled={generating} className="gap-2">
          <Play className="w-4 h-4" />
          {generating ? "Generiere Leads..." : "Jetzt Leads generieren"}
        </Button>
      </div>
    </SettingsSection>
  );
}