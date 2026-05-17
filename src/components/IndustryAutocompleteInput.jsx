/**
 * IndustryAutocompleteInput
 * =========================
 * Zentrale Branchenauswahl-Komponente – wie PLZ/Stadt-Autocomplete, aber für Branchen.
 *
 * Features:
 * - Suche über label, aliases, own_services, target_customer_types
 * - Tolerant gegenüber Umlauten und Tippfehlern (normalisierte Suche)
 * - Zeigt Profil-Gruppe (z.B. "Gebäude / Handwerk") und Status-Badge
 * - Bei keinem Treffer: "Andere Branche" → Fallback-Profil + Tracking
 * - Gibt canonical industry_id + label zurück (onSelect)
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, ChevronDown, X, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { useTaxonomy } from "@/hooks/useTaxonomy";

function normStr(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s]/g, "").trim();
}

function scoreMatch(profile, query) {
  const q = normStr(query);
  if (!q) return 0;
  const label = normStr(profile.label || "");
  const aliases = (profile.aliases || []).map(normStr);
  const services = (profile.ownServices || []).map(normStr);
  const customers = (profile.targetCustomerTypes || []).map(normStr);

  // Exakter Label-Match: höchste Priorität
  if (label === q) return 100;
  if (label.startsWith(q)) return 90;
  if (label.includes(q)) return 80;
  // Alias-Match
  if (aliases.some(a => a === q)) return 75;
  if (aliases.some(a => a.startsWith(q))) return 65;
  if (aliases.some(a => a.includes(q))) return 55;
  // Services
  if (services.some(s => s.includes(q))) return 45;
  // Zielkunden
  if (customers.some(c => c.includes(q))) return 35;
  return 0;
}

const STATUS_CONFIG = {
  production_ready: { label: "✓ Fertig", className: "text-green-700 bg-green-50 border-green-200" },
  reviewed: { label: "~ Geprüft", className: "text-blue-700 bg-blue-50 border-blue-200" },
  draft: { label: "Entwurf", className: "text-slate-500 bg-slate-50 border-slate-200" },
};

const GROUP_ICONS = {
  "Gebäude": "🏢",
  "Handwerk": "🔨",
  "IT / Beratung": "💻",
  "Transport / Logistik": "🚚",
  "Gesundheit": "🏥",
  "Industrie": "⚙️",
  "Marketing / Werbung": "📣",
  "Sicherheit": "🔒",
  "Fallback": "🔧",
};

export default function IndustryAutocompleteInput({
  value,       // { id, label } oder null
  onChange,    // (result: { id, label, isFallback?, fallbackLabel? } | null) => void
  placeholder = "Branche suchen, z.B. Gebäudereinigung…",
  showStatus = false,
  className = "",
}) {
  const { profiles, loading: taxonomyLoading } = useTaxonomy();
  const [inputValue, setInputValue] = useState(value?.label || "");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Input mit externem value synchron halten
  useEffect(() => {
    if (value?.label && value.label !== inputValue) {
      setInputValue(value.label);
    }
  }, [value?.label]);

  // Klick außerhalb → schließen
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = useCallback((query) => {
    if (!query.trim() || !profiles.length) {
      // Zeige alle production_ready + reviewed Profile (ohne Fallbacks)
      const visible = profiles
        .filter(p => p.id && !p.id.startsWith("fallback_"))
        .filter(p => !p.status || p.status !== "draft")
        .sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99))
        .slice(0, 10);
      setResults(visible);
      return;
    }
    const q = normStr(query);
    const scored = profiles
      .filter(p => p.id && !p.id.startsWith("fallback_"))
      .map(p => ({ profile: p, score: scoreMatch(p, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ profile }) => profile);
    setResults(scored);
  }, [profiles]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);
    doSearch(val);
    // Wenn Nutzer tippt → Auswahl aufheben bis neu ausgewählt wird
    if (value && val !== value.label) {
      onChange(null);
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    doSearch(inputValue);
  };

  const handleSelect = (profile) => {
    setInputValue(profile.label);
    setIsOpen(false);
    onChange({ id: profile.id, label: profile.label });
  };

  const handleClear = () => {
    setInputValue("");
    onChange(null);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleOtherIndustry = () => {
    setIsOpen(false);
    onChange({
      id: "fallback_lokaler_dienstleister",
      label: inputValue.trim() || "Andere Branche",
      isFallback: true,
      fallbackLabel: inputValue.trim(),
    });
  };

  const isConfirmed = !!(value?.id && value.label === inputValue);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className={`flex items-center gap-2 h-10 px-3 rounded-lg border-2 bg-white transition-all ${
        isOpen
          ? "border-blue-500 ring-2 ring-blue-100"
          : isConfirmed
          ? "border-green-400 bg-green-50"
          : "border-slate-300 hover:border-slate-400"
      }`}>
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="flex-1 text-sm text-slate-900 bg-transparent outline-none placeholder:text-slate-400"
        />
        {isConfirmed && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
        {inputValue && (
          <button type="button" onClick={handleClear} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {taxonomyLoading ? (
            <div className="px-3 py-4 text-sm text-slate-500 text-center">Branchen werden geladen…</div>
          ) : (
            <>
              {results.length === 0 && inputValue.trim() ? (
                <div className="px-3 py-3 text-sm text-slate-500">
                  Keine passende Branche gefunden.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {results.map(profile => {
                    const statusCfg = STATUS_CONFIG[profile.status] || STATUS_CONFIG.production_ready;
                    const groupIcon = GROUP_ICONS[profile.profile_group] || "";
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => handleSelect(profile)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 text-left transition-colors border-b border-slate-100 last:border-0"
                      >
                        <span className="text-lg shrink-0">{groupIcon || "🏭"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-900 leading-tight">{profile.label}</div>
                          {profile.profile_group && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{profile.profile_group}</div>
                          )}
                        </div>
                        {showStatus && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${statusCfg.className}`}>
                            {statusCfg.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* "Andere Branche" Option immer am Ende */}
              <div className="border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleOtherIndustry}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors"
                >
                  <span className="text-lg">🔧</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700">
                      {inputValue.trim() ? `"${inputValue.trim()}" – Andere Branche` : "Andere Branche / Sonstiges"}
                    </div>
                    <div className="text-[11px] text-slate-500">Wir verwenden ein generisches Profil und lernen Ihre Branche kennen</div>
                  </div>
                  <Pencil className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}