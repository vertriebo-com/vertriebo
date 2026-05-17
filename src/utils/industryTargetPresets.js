/**
 * industryTargetPresets.js
 * ========================
 * Frontend-Adapter für die kanonische DB-Taxonomie.
 *
 * ARCHITEKTUR:
 * - Kanonische Quelle: TaxonomyEntry Entitäten in der Datenbank
 * - Backend-Function: getTaxonomy (liest DB, gibt Profile zurück)
 * - Dieser Adapter: lädt Taxonomie von der API, cached im Modul-Scope
 * - Alle UI-Komponenten importieren von hier
 *
 * KEIN Copy-Paste. KEINE inline Datenpflege. EINE Wahrheitsquelle.
 */

import { base44 } from "@/api/base44Client";

// ── Legacy-Mapping (ID-Normalisierung) ──────────────────────────────────────
// Wird lokal gepflegt weil es keine Daten enthält, nur Aliases.
// Muss synchron mit DB-Einträgen sein (industry_id-Werte).
const LEGACY_INDUSTRY_ID_MAP = {
  "Gebäudereinigung": "gebaeudereinigung",
  "Gartenbau / Gartenpflege": "gartenbau",
  "Gartenbau": "gartenbau",
  "Hausmeisterdienst / Facility Service": "facility_service",
  "Facility Service": "facility_service",
  "Hausmeisterdienst": "facility_service",
  "Entrümpelung / Entsorgung": "entruempelung",
  "Entrümpelung": "entruempelung",
  "Buchhaltung / Büroservice": "buchhaltung_steuernahe_dienste",
  "Buchhaltung": "buchhaltung_steuernahe_dienste",
  "Maschinenwartung / Industrieservice": "industrieservice",
  "Industrieservice": "industrieservice",
  "Sicherheitsdienst": "sicherheitsdienst",
  "IT-Service": "it_service",
  "Catering": "catering",
  "Handwerk": "handwerk",
  "Spedition / Logistik": "spedition_logistik",
  "Spedition": "spedition_logistik",
  "Logistik": "spedition_logistik",
  "Gesundheit / Medizin": "gesundheit_medizin",
  "Gesundheit": "gesundheit_medizin",
  "Medizin": "gesundheit_medizin",
  "Immobilien": "immobilien",
  "Lager / Fulfillment": "lager_fulfillment",
  "Fulfillment": "lager_fulfillment",
  "Maler / Renovierung": "maler_renovierung",
  "Maler": "maler_renovierung",
  "Renovierung": "maler_renovierung",
  "Elektro / Gebäudetechnik": "elektro_gebaeudetechnik",
  "Elektro": "elektro_gebaeudetechnik",
  "Gebäudetechnik": "elektro_gebaeudetechnik",
  "SHK / Sanitär / Heizung / Klima": "shk",
  "SHK": "shk",
  "Sanitär": "shk",
  "Heizung": "shk",
  "Eventservice": "eventservice",
  "Marketing / Webdesign / Werbung": "marketing_webdesign_werbung",
  "Marketing": "marketing_webdesign_werbung",
  "Webdesign": "marketing_webdesign_werbung",
  "Personal / Zeitarbeit": "personal_zeitarbeit",
  "Zeitarbeit": "personal_zeitarbeit",
  "Personal": "personal_zeitarbeit",
  "Fuhrparkservice / Fahrzeugpflege": "fuhrparkservice_fahrzeugpflege",
  "Fuhrparkservice": "fuhrparkservice_fahrzeugpflege",
  "Fahrzeugpflege": "fuhrparkservice_fahrzeugpflege",
  "Pflege / Betreuung": "pflege_betreuung",
  "Pflege": "pflege_betreuung",
  "Betreuung": "pflege_betreuung",
  "Schulungen / Weiterbildung": "schulungen_weiterbildung",
  "Schulungen": "schulungen_weiterbildung",
  "Weiterbildung": "schulungen_weiterbildung",
};

// ── Modul-Cache ──────────────────────────────────────────────────────────────
let _cachedProfiles = null;
let _cachedHash = null;
let _cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 Minuten

/**
 * Lädt alle aktiven Taxonomie-Profile von der DB (via getTaxonomy API).
 * Ergebnis wird 5 Minuten gecacht.
 */
export async function loadTaxonomyProfiles() {
  const now = Date.now();
  if (_cachedProfiles && (now - _cachedAt) < CACHE_TTL_MS) {
    return { profiles: _cachedProfiles, taxonomy_hash: _cachedHash };
  }
  const res = await base44.functions.invoke("getTaxonomy", { action: "list" });
  const data = res?.data;
  if (!data?.success || !Array.isArray(data.profiles)) {
    throw new Error("Taxonomie konnte nicht geladen werden.");
  }
  _cachedProfiles = data.profiles;
  _cachedHash = data.taxonomy_hash;
  _cachedAt = now;
  return { profiles: _cachedProfiles, taxonomy_hash: _cachedHash };
}

/**
 * Synchroner Zugriff auf gecachte Profile (nach loadTaxonomyProfiles() Aufruf).
 * Für Komponenten, die keinen async-Load machen können.
 */
export function getCachedProfiles() {
  return _cachedProfiles || [];
}

/**
 * Alle aktiven Branchen-Labels.
 * Async – lädt bei Bedarf nach.
 */
export async function getIndustryLabels() {
  const { profiles } = await loadTaxonomyProfiles();
  return profiles.map(p => p.label);
}

/**
 * Normalisiert eine Branchen-Bezeichnung (Label oder Legacy-String) auf die kanonische ID.
 * Synchron, da nur Alias-Mapping — kein DB-Zugriff.
 */
export function normalizeIndustryId(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (LEGACY_INDUSTRY_ID_MAP[str]) return LEGACY_INDUSTRY_ID_MAP[str];
  // Direkte ID (lowercase check)
  const lower = str.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const cached = _cachedProfiles;
  if (cached) {
    const direct = cached.find(p => p.id === str || p.id === lower);
    if (direct) return direct.id;
  }
  return str;
}

/**
 * Preset für eine Branche abrufen (async).
 * Unterstützt Taxonomy-IDs und Labels.
 */
export async function getIndustryPresetAsync(industryIdOrLabel) {
  const { profiles } = await loadTaxonomyProfiles();
  const normalizedId = normalizeIndustryId(industryIdOrLabel);
  return profiles.find(p => p.id === normalizedId || p.label === industryIdOrLabel) || null;
}

/**
 * ID aus Label auflösen (synchron nach einem loadTaxonomyProfiles-Call).
 * "Gebäudereinigung" → "gebaeudereinigung"
 */
export function getIndustryIdByLabel(label) {
  if (!label) return undefined;
  const normalized = normalizeIndustryId(label);
  if (normalized) return normalized;
  const cached = _cachedProfiles;
  if (cached) {
    const found = cached.find(p => p.label === label);
    if (found) return found.id;
  }
  return undefined;
}

/**
 * Preset aus Cache abrufen (synchron).
 * Funktioniert nur nach einem loadTaxonomyProfiles()-Aufruf.
 */
export function getIndustryPreset(industryIdOrLabel) {
  const cached = _cachedProfiles;
  if (!cached || cached.length === 0) return null;
  const normalizedId = normalizeIndustryId(industryIdOrLabel);
  return cached.find(p => p.id === normalizedId || p.id === industryIdOrLabel || p.label === industryIdOrLabel) || null;
}

/**
 * INDUSTRY_PRESETS – reaktive Liste aus Cache.
 * Für UI-Komponenten die den Cache bereits befüllt haben.
 */
export function getIndustryPresets() {
  return _cachedProfiles || [];
}

// Re-export für Abwärtskompatibilität
export { normalizeIndustryId as normalizeId };