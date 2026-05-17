/**
 * industryTargetPresets.js
 * ========================
 * SINGLE SOURCE OF TRUTH: Leitet direkt aus leadSearchTaxonomy.js ab.
 * 
 * Alle Komponenten (Onboarding, CompanySettings, TargetingStep)
 * verwenden diese Datei. Sie importiert und re-exportiert aus der
 * zentralen Taxonomie, sodass es KEINE doppelte Preset-Logik gibt.
 * 
 * Frühere hardcodierte INDUSTRY_PRESETS wurden entfernt.
 * Die Taxonomy (leadSearchTaxonomy.js) ist die einzige Quelle.
 */

import { LEAD_SEARCH_TAXONOMY, normalizeIndustryId } from "./leadSearchTaxonomy.js";

/**
 * INDUSTRY_PRESETS: Aus der zentralen Taxonomy abgeleitet.
 * Format kompatibel mit dem alten Format (id, label, ownServices, targetCustomerTypes,
 * excludedCustomerTypes, searchKeywordVariants).
 */
export const INDUSTRY_PRESETS = Object.values(LEAD_SEARCH_TAXONOMY).map(entry => ({
  id: entry.id,
  label: entry.label,
  ownServices: entry.ownServices || [],
  targetCustomerTypes: entry.targetCustomerTypes || [],
  excludedCustomerTypes: entry.excludedCustomerTypes || [],
  searchKeywordVariants: entry.searchKeywordVariants || {},
  // Erweiterte Felder aus der Taxonomy
  searchableBusinessCategories: entry.searchableBusinessCategories || [],
  idealCustomerProfiles: entry.idealCustomerProfiles || [],
  negativeKeywords: entry.negativeKeywords || [],
  scoringSignals: entry.scoringSignals || [],
  badFitSignals: entry.badFitSignals || [],
  queryPriority: entry.queryPriority || [],
  googlePlaceTypes: entry.googlePlaceTypes || [],
}));

/**
 * Preset für eine bestimmte Branche abrufen.
 * Unterstützt sowohl neue Taxonomy-IDs als auch Legacy-Bezeichnungen.
 */
export function getIndustryPreset(industryId) {
  if (!industryId) return null;
  const normalizedId = normalizeIndustryId(industryId);
  return INDUSTRY_PRESETS.find(p => p.id === normalizedId) || null;
}

/**
 * Alle verfügbaren Branchen-Labels.
 */
export function getIndustryLabels() {
  return INDUSTRY_PRESETS.map(p => p.label);
}

/**
 * ID aus Label auflösen — nutzt normalizeIndustryId aus der Taxonomy.
 */
export function getIndustryIdByLabel(label) {
  if (!label) return undefined;
  return normalizeIndustryId(label) || undefined;
}

// Re-exporte aus der zentralen Taxonomie für direkten Zugriff
export { LEAD_SEARCH_TAXONOMY, normalizeIndustryId } from "./leadSearchTaxonomy.js";