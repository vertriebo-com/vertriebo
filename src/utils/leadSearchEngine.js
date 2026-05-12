/**
 * ============================================================
 * VERTRIEBO LEAD SEARCH ENGINE
 * ============================================================
 * Kernmodul der intelligenten B2B-Lead-Suchmaschine.
 *
 * Wichtig:
 * - searchableBusinessCategories werden für Suchanfragen genutzt
 * - idealCustomerProfiles NICHT als rohe Suchanfragen
 * - targetCustomerTypes nur für Scoring + UI
 * - queryBudget strikt nach Trial-/Plan-Stufe
 * ============================================================
 */

import {
  getIndustrySearchProfile,
  normalizeIndustryId,
} from "./leadSearchTaxonomy.js";

// ──────────────────────────────────────────────
// HILFSFUNKTIONEN
// ──────────────────────────────────────────────

function norm(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .trim();
}

/**
 * Normalisiert Suchkategorie-Begriffe für konsistenten Vergleich.
 */
export function normalizeSearchCategory(category) {
  return norm(category);
}

// ──────────────────────────────────────────────
// QUERY BUDGET NACH TRIAL-STUFE
// ──────────────────────────────────────────────

const QUERY_BUDGETS = {
  free_preview: (remainingLeadBudget) => {
    if (!remainingLeadBudget || remainingLeadBudget <= 0) {
      return {
        blocked: true,
        reason: "preview_limit_reached",
        maxLeadsToSave: 0,
        maxSearchQueries: 0,
        maxPlaceDetails: 0,
        stopWhenEnoughLeadsFound: true,
      };
    }
    return {
      blocked: false,
      maxLeadsToSave: Math.min(remainingLeadBudget, 3),
      maxSearchQueries: 6,
      maxPlaceDetails: 15,
      stopWhenEnoughLeadsFound: true,
    };
  },
  verified_trial: () => ({
    blocked: false,
    maxLeadsToSave: 25,
    maxSearchQueries: 20,
    maxPlaceDetails: 50,
    stopWhenEnoughLeadsFound: true,
  }),
  paid: () => ({
    blocked: false,
    maxLeadsToSave: null, // via Plan-Limits
    maxSearchQueries: 40,
    maxPlaceDetails: 80,
    stopWhenEnoughLeadsFound: true,
  }),
  agency: () => ({
    blocked: false,
    maxLeadsToSave: null,
    maxSearchQueries: 60,
    maxPlaceDetails: 120,
    stopWhenEnoughLeadsFound: true,
    agencyAware: true,
  }),
};

// ──────────────────────────────────────────────
// RADIUS-STRATEGIE
// ──────────────────────────────────────────────

function getCityLimit(radiusKm) {
  if (radiusKm <= 10) return 1;
  if (radiusKm <= 25) return 3;
  if (radiusKm <= 60) return 5;
  return 7;
}

function getRadiusDescription(radiusKm) {
  if (radiusKm <= 10) return "micro";    // 1 Stadt, präzise Kategorien
  if (radiusKm <= 25) return "local";    // Hauptort + nahe Orte
  if (radiusKm <= 60) return "regional"; // Cluster mehrerer Orte
  return "wide";                          // Großflächig, Budget beachten
}

// ──────────────────────────────────────────────
// SEARCH QUERIES GENERIEREN
// ──────────────────────────────────────────────

/**
 * Generiert Suchanfragen NUR aus:
 * - searchableBusinessCategories
 * - searchKeywordVariants
 * - optional googlePlaceTypes
 *
 * NICHT aus: idealCustomerProfiles, targetCustomerTypes (als rohe Queries)
 */
export function generateSearchQueries(searchPlan, industryProfile) {
  if (!industryProfile) return [];
  if (searchPlan?.queryBudget?.blocked) return [];

  const queries = [];
  const seenQueries = new Set();
  const {
    searchableBusinessCategories = [],
    searchKeywordVariants = {},
    queryPriority = [],
  } = industryProfile;

  const { searchCities = [], queryBudget, trialStage } = searchPlan;
  const maxQueries = queryBudget?.maxSearchQueries ?? 40;

  // QUERY DIVERSITY LIMIT: max Varianten pro Kategorie
  const maxVariantsPerCategory = 
    trialStage === 'free_preview' ? 2 :
    trialStage === 'verified_trial' ? 3 : 999;

  // Priorisierte Kategorien zuerst
  const orderedCategories = [
    ...queryPriority.filter((c) =>
      searchableBusinessCategories.includes(c)
    ),
    ...searchableBusinessCategories.filter((c) => !queryPriority.includes(c)),
  ];

  for (const city of searchCities) {
    for (const category of orderedCategories) {
      if (queries.length >= maxQueries) break;

      // Aus searchKeywordVariants Varianten nutzen, sonst direkt
      const variants = searchKeywordVariants[category]
        ? searchKeywordVariants[category].slice(0, maxVariantsPerCategory)
        : [category];

      for (const variant of variants) {
        if (queries.length >= maxQueries) break;
        const q = `${variant} ${city}`;
        if (!seenQueries.has(q)) {
          seenQueries.add(q);
          queries.push({
            query: q,
            city,
            category,
            variant,
            source: searchKeywordVariants[category]
              ? "searchKeywordVariants"
              : "searchableBusinessCategories",
          });
        }
      }
    }
    if (queries.length >= maxQueries) break;
  }

  return queries;
}

// ──────────────────────────────────────────────
// BUILD SEARCH PLAN
// ──────────────────────────────────────────────

/**
 * Erstellt einen vollständigen Suchplan für einen Recherche-Lauf.
 *
 * WICHTIG: idealCustomerProfiles werden NICHT als Suchanfragen verwendet.
 * targetCustomerTypes werden NICHT blind als Queries genutzt.
 * 
 * Query Diversity Limit: Verhindert, dass eine Kategorie zu viele Varianten verbraucht:
 * - free_preview: max. 2 Varianten pro Kategorie
 * - verified_trial: max. 3-4 Varianten
 * - paid: unbegrenzt
 */
export function buildSearchPlan({
  industry,
  services = [],
  targetCustomerTypes = [],
  excludedCustomerTypes = [],
  location,
  radiusKm = 25,
  trialStage = "free_preview",
  remainingLeadBudget = 3,
  additionalCities = [],
}) {
  const industryId = normalizeIndustryId(industry);
  const industryProfile = getIndustrySearchProfile(industryId);

  if (!industryProfile) {
    return {
      error: `Unbekannte Branche: ${industry}`,
      industryProfile: null,
      searchCities: [],
      searchQueries: [],
      placeTypes: [],
      queryBudget: { blocked: true, reason: "unknown_industry" },
      expectedCostLevel: "unknown",
      debug: {},
    };
  }

  // Query Budget nach Stufe
  const budgetFn =
    QUERY_BUDGETS[trialStage] || QUERY_BUDGETS["free_preview"];
  const queryBudget = budgetFn(remainingLeadBudget);

  if (queryBudget.blocked) {
    return {
      error: queryBudget.reason,
      industryProfile,
      searchCities: [],
      searchQueries: [],
      placeTypes: industryProfile.googlePlaceTypes || [],
      queryBudget,
      expectedCostLevel: "none",
      debug: {
        usedSearchableCategories: [],
        ignoredIdealProfiles: industryProfile.idealCustomerProfiles || [],
        selectedTargetCustomers: [],
        selectedServices: services,
        blockedReason: queryBudget.reason,
      },
    };
  }

  // Suchstädte berechnen
  const cityLimit = getCityLimit(radiusKm);
  const searchCities = [
    location,
    ...additionalCities.slice(0, cityLimit - 1),
  ].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i);

  // Für free_preview: maximal 1 Stadt (Kostenschutz)
  const effectiveCities =
    trialStage === "free_preview" ? searchCities.slice(0, 1) : searchCities.slice(0, cityLimit);

  // Suchkategorien filtern (excludedCustomerTypes berücksichtigen)
  const usedSearchableCategories =
    industryProfile.searchableBusinessCategories.filter(
      (cat) => !excludedCustomerTypes.includes(cat)
    );

  // Idealprofile werden NICHT als Queries verwendet
  const ignoredIdealProfiles = industryProfile.idealCustomerProfiles || [];

  // targetCustomerTypes: werden für Scoring verwendet, nicht als rohe Queries
  const selectedTargetCustomers =
    targetCustomerTypes.length > 0
      ? targetCustomerTypes
      : industryProfile.targetCustomerTypes;

  // SearchPlan ohne Queries (Queries werden separat generiert)
  const partialPlan = {
    industryProfile,
    searchCities: effectiveCities,
    placeTypes: industryProfile.googlePlaceTypes || [],
    queryBudget,
    radiusDescription: getRadiusDescription(radiusKm),
    radiusKm,
    debug: {
      usedSearchableCategories,
      ignoredIdealProfiles,
      selectedTargetCustomers,
      selectedServices: services,
      excludedCustomerTypes,
      cityLimit,
      effectiveCityCount: effectiveCities.length,
      trialStage,
      remainingLeadBudget,
    },
  };

  // Queries generieren (mit Diversity Limit)
  const searchQueries = generateSearchQueries(
    { ...partialPlan, trialStage },
    {
      ...industryProfile,
      searchableBusinessCategories: usedSearchableCategories,
    }
  );

  // Kostenlevel schätzen
  const queryCount = searchQueries.length;
  let expectedCostLevel = "low";
  if (queryCount > 20) expectedCostLevel = "medium";
  if (queryCount > 40) expectedCostLevel = "high";
  if (trialStage === "free_preview") expectedCostLevel = "minimal";

  return {
    industryProfile,
    searchCities: effectiveCities,
    searchQueries,
    placeTypes: industryProfile.googlePlaceTypes || [],
    queryBudget,
    radiusDescription: getRadiusDescription(radiusKm),
    radiusKm,
    expectedCostLevel,
    debug: {
      ...partialPlan.debug,
      totalQueriesGenerated: searchQueries.length,
      idealProfilesNotUsedAsRawQueries: true,
      searchableBusinessCategoriesUsed: usedSearchableCategories,
    },
  };
}

// ──────────────────────────────────────────────
// BAD FIT CHECK
// ──────────────────────────────────────────────

/**
 * Prüft, ob ein Kandidat ein schlechter Fit ist.
 * Gibt { isBadFit, reason } zurück.
 */
export function isBadFit(candidate, industryProfile) {
  if (!candidate || !industryProfile) return { isBadFit: false, reason: null };

  const text = norm(
    [
      candidate.name,
      candidate.types?.join(" "),
      candidate.vicinity,
      candidate.editorial_summary?.overview,
    ].join(" ")
  );

  const negativeKeywords = industryProfile.negativeKeywords || [];
  const badFitSignals = industryProfile.badFitSignals || [];

  // Job/Karriere/Ausbildung: hartes Ausschlusssignal
  const jobSignals = ["job", "karriere", "ausbildung", "stellenangebot", "bewerber", "bewerbung", "praktikum"];
  for (const signal of jobSignals) {
    if (text.includes(norm(signal))) {
      return {
        isBadFit: true,
        reason: `Job/Karriere-Signal erkannt: "${signal}"`,
        signalType: "job",
      };
    }
  }

  // Privat/Kleinanzeigen: hartes Ausschlusssignal
  const privatSignals = ["privat", "kleinanzeigen", "mietgesuch", "wohnung gesucht", "zu verschenken"];
  for (const signal of privatSignals) {
    if (text.includes(norm(signal))) {
      return {
        isBadFit: true,
        reason: `Privat/Kleinanzeigen-Signal erkannt: "${signal}"`,
        signalType: "private",
      };
    }
  }

  // Negative Keywords der Branche
  for (const kw of negativeKeywords) {
    if (text.includes(norm(kw))) {
      return {
        isBadFit: true,
        reason: `Negatives Branchenkeyword: "${kw}"`,
        signalType: "negativeKeyword",
      };
    }
  }

  // Bad Fit Signals der Branche
  for (const signal of badFitSignals) {
    if (text.includes(norm(signal))) {
      return {
        isBadFit: true,
        reason: `BadFit-Signal: "${signal}"`,
        signalType: "badFitSignal",
      };
    }
  }

  return { isBadFit: false, reason: null };
}

// ──────────────────────────────────────────────
// LEAD KANDIDAT BEWERTEN
// ──────────────────────────────────────────────

/**
 * Bewertet einen Lead-Kandidaten und gibt ein strukturiertes Scoring zurück.
 *
 * Score-System (MVP):
 * Start: 50
 * +20  Kategorie / Suchbegriff passt
 * +15  positives Scoring Signal im Namen/Beschreibung
 * +10  Telefonnummer vorhanden
 * +10  Website vorhanden
 * +10  im Radius
 * -30  negativeKeywords gefunden
 * -30  badFitSignals gefunden
 * -50  Job/Karriere/Ausbildung erkannt
 * -50  Privat/Kleinanzeigen erkannt
 *
 * shouldSave = score >= 55 && !badFit
 */
export function scoreLeadCandidate({
  candidate,
  industryProfile,
  selectedServices = [],
  selectedTargetCustomers = [],
  radiusKm = 25,
  distanceKm = null,
  matchedSearchCategory = null,
}) {
  if (!candidate || !industryProfile) {
    return {
      search_quality_score: 0,
      matched_search_category: null,
      matched_target_customer_type: null,
      matched_service_context: null,
      relevance_reason: "Kein Kandidat oder Branchenprofil",
      bad_fit_reason: null,
      shouldSave: false,
    };
  }

  const text = norm(
    [
      candidate.name,
      candidate.types?.join(" "),
      candidate.vicinity,
      candidate.editorial_summary?.overview,
      candidate.formatted_address,
    ].join(" ")
  );

  const nameNorm = norm(candidate.name || "");

  // Bad Fit Check zuerst
  const badFitResult = isBadFit(candidate, industryProfile);

  let score = 50;
  const reasons = [];
  let matched_search_category = matchedSearchCategory || null;
  let matched_target_customer_type = null;
  let matched_service_context = null;

  // ── POSITIVE PUNKTE ──────────────────────────

  // +20: Kategorie / Suchbegriff passt
  if (matchedSearchCategory) {
    score += 20;
    reasons.push(`Suchkategorie-Match: "${matchedSearchCategory}"`);
  } else {
    // Prüfen ob einer der searchableBusinessCategories im Text vorkommt
    const { searchableBusinessCategories = [], searchKeywordVariants = {} } = industryProfile;
    let categoryHit = null;

    for (const cat of searchableBusinessCategories) {
      const variants = searchKeywordVariants[cat] ? searchKeywordVariants[cat] : [cat];
      for (const variant of variants) {
        if (text.includes(norm(variant))) {
          categoryHit = cat;
          break;
        }
      }
      if (categoryHit) break;
    }

    if (categoryHit) {
      score += 20;
      matched_search_category = categoryHit;
      reasons.push(`Kategorie-Keyword-Match: "${categoryHit}"`);
    }
  }

  // +15: positives Scoring Signal
  const scoringSignals = industryProfile.scoringSignals || [];
  for (const signal of scoringSignals) {
    if (text.includes(norm(signal))) {
      score += 15;
      reasons.push(`Scoring-Signal: "${signal}"`);
      break; // Nur einmal zählen
    }
  }

  // +10: Telefonnummer
  if (candidate.formatted_phone_number || candidate.international_phone_number) {
    score += 10;
    reasons.push("Telefonnummer vorhanden");
  }

  // +10: Website
  if (candidate.website) {
    score += 10;
    reasons.push("Website vorhanden");
  }

  // +10: Im Radius
  if (distanceKm !== null && distanceKm <= radiusKm) {
    score += 10;
    reasons.push(`Im Radius (${distanceKm} km ≤ ${radiusKm} km)`);
  }

  // ── NEGATIVE PUNKTE ──────────────────────────

  if (badFitResult.isBadFit) {
    const signalType = badFitResult.signalType;
    if (signalType === "job") {
      score -= 50;
    } else if (signalType === "private") {
      score -= 50;
    } else if (signalType === "negativeKeyword") {
      score -= 30;
    } else if (signalType === "badFitSignal") {
      score -= 30;
    } else {
      score -= 30;
    }
    reasons.push(`BadFit: ${badFitResult.reason}`);
  }

  // ── TARGET CUSTOMER TYPE MATCH ──────────────
  const targetCustomers =
    selectedTargetCustomers.length > 0
      ? selectedTargetCustomers
      : industryProfile.targetCustomerTypes || [];

  for (const tc of targetCustomers) {
    if (text.includes(norm(tc))) {
      matched_target_customer_type = tc;
      break;
    }
  }

  // ── SERVICE CONTEXT MATCH ───────────────────
  const services =
    selectedServices.length > 0
      ? selectedServices
      : industryProfile.ownServices || [];

  for (const svc of services) {
    if (text.includes(norm(svc))) {
      matched_service_context = svc;
      break;
    }
  }

  // ── ENTSCHEIDUNG ─────────────────────────────
  score = Math.max(0, Math.min(100, score));
  const shouldSave = score >= 55 && !badFitResult.isBadFit;

  return {
    search_quality_score: score,
    matched_search_category,
    matched_target_customer_type,
    matched_service_context,
    relevance_reason: reasons.join(" | ") || "Kein spezifischer Match",
    bad_fit_reason: badFitResult.isBadFit ? badFitResult.reason : null,
    shouldSave,
  };
}

/**
 * Alias für einfachen Zugriff auf Branchenprofil aus der Engine.
 */
export { getIndustrySearchProfile };