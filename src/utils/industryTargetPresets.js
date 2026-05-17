/**
 * industryTargetPresets.js
 * ========================
 * ADAPTER — enthält KEINE eigenen Preset-Daten.
 * Einzige Quelle: utils/leadSearchTaxonomy.js
 *
 * Alle Komponenten (Onboarding, CompanySettings, TargetingStep)
 * importieren von hier. Diese Datei leitet ausschließlich weiter.
 */

import { LEAD_SEARCH_TAXONOMY, normalizeIndustryId } from "./leadSearchTaxonomy";

/**
 * INDUSTRY_PRESETS — abgeleitet aus der zentralen Taxonomy.
 * Format ist kompatibel mit dem alten hardcodierten Format.
 * Keine eigenen Daten hier.
 */
export const INDUSTRY_PRESETS = Object.values(LEAD_SEARCH_TAXONOMY).map(entry => ({
  id: entry.id,
  label: entry.label,
  ownServices: entry.ownServices || [],
  targetCustomerTypes: entry.targetCustomerTypes || [],
  excludedCustomerTypes: entry.excludedCustomerTypes || [],
  searchKeywordVariants: entry.searchKeywordVariants || {},
  searchableBusinessCategories: entry.searchableBusinessCategories || [],
  idealCustomerProfiles: entry.idealCustomerProfiles || [],
  negativeKeywords: entry.negativeKeywords || [],
  scoringSignals: entry.scoringSignals || [],
  badFitSignals: entry.badFitSignals || [],
  queryPriority: entry.queryPriority || [],
  googlePlaceTypes: entry.googlePlaceTypes || [],
}));

/**
 * Preset für eine Branche abrufen.
 * Unterstützt Taxonomy-IDs ("gebaeudereinigung") und Labels ("Gebäudereinigung").
 */
export function getIndustryPreset(industryId) {
  if (!industryId) return null;
  const normalizedId = normalizeIndustryId(industryId);
  return INDUSTRY_PRESETS.find(p => p.id === normalizedId) || null;
}

/**
 * Alle Branchen-Labels.
 */
export function getIndustryLabels() {
  return INDUSTRY_PRESETS.map(p => p.label);
}

/**
 * ID aus Label auflösen.
 * "Gebäudereinigung" → "gebaeudereinigung"
 */
export function getIndustryIdByLabel(label) {
  if (!label) return undefined;
  return normalizeIndustryId(label) || undefined;
}

// Direkt-Zugriff auf Taxonomy-Kern
export { LEAD_SEARCH_TAXONOMY, normalizeIndustryId } from "./leadSearchTaxonomy";