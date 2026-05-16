/**
 * CityAutocomplete – Google Places Autocomplete für Ortseingabe.
 * Speichert nicht nur den Städtenamen, sondern auch place_id, lat, lng.
 *
 * Props:
 *   value: { city, label, place_id, lat, lng } | null
 *   onChange: (cityObj) => void
 *   placeholder?: string
 *   className?: string
 */
import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Loader2, X } from "lucide-react";

export default function CityAutocomplete({ value, onChange, placeholder = "Stadt oder PLZ eingeben…", className = "" }) {
  const [inputText, setInputText] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Wenn ein value gesetzt ist, zeige dessen Label im Input
  useEffect(() => {
    if (value?.city) {
      setInputText(value.label || value.city);
    }
  }, []);

  // Klick außerhalb schließt Dropdown
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    // Wenn Nutzer tippt → clear value (noch nicht bestätigt)
    if (value && val !== (value.label || value.city)) {
      onChange(null);
    }

    clearTimeout(debounceRef.current);
    if (val.length < 2) {
      setPredictions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke("geocodeCity", { action: "autocomplete", input: val });
        setPredictions(res.data?.predictions || []);
        setOpen(true);
      } catch (err) {
        console.error("[CityAutocomplete] autocomplete error:", err);
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = async (prediction) => {
    setInputText(prediction.label);
    setOpen(false);
    setPredictions([]);
    setLoading(true);
    try {
      const res = await base44.functions.invoke("geocodeCity", { action: "details", place_id: prediction.place_id });
      const detail = res.data;
      if (detail && !detail.error) {
        onChange({
          city: detail.city || prediction.city,
          label: detail.label || prediction.label,
          place_id: detail.place_id || prediction.place_id,
          lat: detail.lat,
          lng: detail.lng,
          country: "DE",
        });
        setInputText(detail.city || prediction.city);
      }
    } catch (err) {
      console.error("[CityAutocomplete] details error:", err);
      // Fallback: nur Text und place_id speichern
      onChange({ city: prediction.city, label: prediction.label, place_id: prediction.place_id, lat: null, lng: null });
      setInputText(prediction.city);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputText("");
    setPredictions([]);
    setOpen(false);
    onChange(null);
  };

  const isConfirmed = value && value.place_id;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isConfirmed ? "text-green-500" : "text-slate-400"}`} />
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={`flex h-11 w-full rounded-xl border px-4 pl-9 pr-8 py-2 text-sm text-slate-900 bg-white shadow-none transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${isConfirmed ? "border-green-400 bg-green-50/30" : "border-slate-300"}`}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          {inputText && !loading && (
            <button type="button" onClick={handleClear} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Confirmed badge */}
      {isConfirmed && (
        <p className="text-[11px] text-green-700 font-medium mt-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          Koordinaten gespeichert ({value.lat?.toFixed(4)}, {value.lng?.toFixed(4)})
        </p>
      )}

      {/* Dropdown */}
      {open && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <span className="text-sm text-slate-800 font-medium">{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}