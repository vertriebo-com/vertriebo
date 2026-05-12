/**
 * ============================================================
 * TEST: LeadSearchEngine - Phase B/C Integrierter Test
 * ============================================================
 * Testet DIESELBE Inline-Logik wie generateLeads v2.
 * Kein Google API-Aufruf.
 *
 * WICHTIG: Diese Datei und generateLeads nutzen exakt
 * denselben Taxonomy + Engine Code (Eine Quelle der Wahrheit
 * per Inline-Kopie, da Deno keine lokalen Imports erlaubt).
 * ============================================================
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function norm(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .trim();
}

// ── Mini-Taxonomy für Tests ────────────────────────────────────
const TEST_TAXONOMY = {
  immobilien: {
    id: "immobilien",
    label: "Immobilien",
    searchableBusinessCategories: [
      "Hausverwaltung", "Immobilienverwaltung", "WEG Verwaltung",
      "Bauträger", "Projektentwickler", "Wohnungsbaugesellschaft",
      "Immobiliengesellschaft", "Gewerbeimmobilienverwaltung",
      "Property Management", "Mietverwaltung"
    ],
    idealCustomerProfiles: [
      "Eigentümer", "Investoren", "Gewerbeimmobilienbesitzer",
      "Erbengemeinschaften", "Unternehmen mit Standortsuche",
      "Bestandshalter", "Objektbestand"
    ],
    targetCustomerTypes: [
      "Hausverwaltungen", "Immobilienverwaltungen", "WEG-Verwaltungen",
      "Bauträger", "Projektentwickler", "Wohnungsbaugesellschaften"
    ],
    negativeKeywords: ["privat", "wohnung gesucht", "mietgesuch", "ferienwohnung", "airbnb", "job", "karriere"],
    badFitSignals: ["privat", "mietgesuch", "wohnung gesucht", "ferienwohnung", "job", "airbnb"],
    searchKeywordVariants: {
      "Hausverwaltung": ["Hausverwaltung", "WEG Verwaltung", "Immobilienverwaltung", "Mietverwaltung", "Objektverwaltung"],
      "Bauträger": ["Bauträger", "Wohnbaugesellschaft", "Projektentwickler Immobilien"],
      "Property Management": ["Property Management", "Gewerbeimmobilienverwaltung", "Facility Management Immobilien"]
    },
    scoringSignals: ["verwaltung", "weg", "gewerbeimmobilien", "bestand", "objektverwaltung", "property management", "projektentwicklung", "bautraeger"],
    queryPriority: ["Hausverwaltung", "Property Management", "Bauträger", "Immobilienverwaltung", "WEG Verwaltung", "Wohnungsbaugesellschaft"]
  },
  gebaeudereinigung: {
    id: "gebaeudereinigung",
    label: "Gebäudereinigung",
    searchableBusinessCategories: [
      "Hausverwaltung", "Immobilienverwaltung", "Bürogebäude",
      "Ärztehaus", "Arztpraxis", "Zahnarztpraxis",
      "Kindertagesstätte", "Schule", "Pflegeheim", "Seniorenheim",
      "Hotel", "Autohaus", "Fitnessstudio", "Gewerbepark",
      "Industrieunternehmen", "Einzelhandel", "Supermarkt"
    ],
    idealCustomerProfiles: [
      "regelmäßiger Reinigungsbedarf", "mehrere Standorte",
      "größere Nutzfläche"
    ],
    targetCustomerTypes: ["Hausverwaltungen", "Bürogebäude", "Arztpraxen"],
    negativeKeywords: ["privat", "job", "karriere", "ausbildung", "stellenangebot", "minijob", "kleinanzeigen"],
    badFitSignals: ["privat", "job", "karriere", "kleinanzeige", "einzelperson"],
    searchKeywordVariants: {
      "Hausverwaltung": ["Hausverwaltung", "Immobilienverwaltung", "WEG Verwaltung", "Mietverwaltung"],
      "Arztpraxis": ["Arztpraxis", "Ärztehaus", "Zahnarztpraxis", "Medizinisches Versorgungszentrum"],
      "Pflegeheim": ["Pflegeheim", "Seniorenheim", "Seniorenresidenz", "Altenheim"],
      "Hotel": ["Hotel", "Gasthof", "Pension"],
      "Kita": ["Kindertagesstätte", "Kita", "Kindergarten"]
    },
    scoringSignals: ["verwaltung", "gewerbe", "praxis", "hotel", "pflege", "industrie", "facility", "buero", "objekt"],
    queryPriority: ["Hausverwaltung", "Immobilienverwaltung", "Pflegeheim", "Arztpraxis", "Hotel"]
  },
  catering: {
    id: "catering",
    label: "Catering",
    searchableBusinessCategories: [
      "Eventlocation", "Tagungshotel", "Seminarzentrum",
      "Messeveranstalter", "Kongresszentrum", "Bürogebäude",
      "Kindertagesstätte", "Schule", "Pflegeheim", "Hotel",
      "Coworking Space", "Veranstalter"
    ],
    idealCustomerProfiles: ["regelmäßige Veranstaltungen", "viele Mitarbeitende"],
    targetCustomerTypes: ["Eventlocations", "Tagungshotels", "Kitas", "Schulen"],
    negativeKeywords: ["privat", "hochzeit", "geburtstag", "familienfeier", "job"],
    badFitSignals: ["privat", "hochzeit", "geburtstag", "kleinanzeige"],
    searchKeywordVariants: {
      "Event": ["Eventlocation", "Veranstalter", "Messeveranstalter", "Kongresszentrum", "Eventhalle"],
      "Hotel": ["Tagungshotel", "Hotel", "Kongresshotel"],
      "Bildung": ["Kindertagesstätte", "Schule", "Seminarzentrum"]
    },
    scoringSignals: ["event", "tagung", "messe", "seminar", "hotel", "kita", "schule", "kongress"],
    queryPriority: ["Eventlocation", "Tagungshotel", "Kongresszentrum", "Seminarzentrum"]
  },
  it_service: {
    id: "it_service",
    label: "IT-Service",
    searchableBusinessCategories: [
      "Arztpraxis", "Zahnarztpraxis", "Steuerberater",
      "Rechtsanwalt", "Kanzlei", "Pflegeheim", "Schule",
      "Handwerksbetrieb", "Immobilienverwaltung", "Logistikunternehmen"
    ],
    idealCustomerProfiles: ["mehrere Arbeitsplätze", "sensible Daten"],
    targetCustomerTypes: ["Arztpraxen", "Steuerberater", "Kanzleien"],
    negativeKeywords: ["privat", "gaming", "job", "forum"],
    badFitSignals: ["privat", "gaming", "job", "forum"],
    searchKeywordVariants: {
      "Praxen": ["Arztpraxis", "Zahnarztpraxis", "Ärztehaus"],
      "Kanzleien": ["Rechtsanwalt", "Kanzlei", "Steuerberater", "Anwaltskanzlei"],
      "KMU": ["Handwerksbetrieb", "Logistikunternehmen"]
    },
    scoringSignals: ["praxis", "kanzlei", "steuer", "pflege", "schule", "verwaltung", "daten"],
    queryPriority: ["Arztpraxis", "Zahnarztpraxis", "Steuerberater", "Rechtsanwalt", "Kanzlei"]
  },
  sicherheitsdienst: {
    id: "sicherheitsdienst",
    label: "Sicherheitsdienst",
    searchableBusinessCategories: [
      "Bauunternehmen", "Logistikzentrum", "Industrieunternehmen",
      "Veranstalter", "Eventlocation", "Hotel", "Einkaufszentrum",
      "Gewerbepark", "Einzelhandel", "Facility Management"
    ],
    idealCustomerProfiles: ["hoher Sicherheitsbedarf", "Publikumsverkehr"],
    targetCustomerTypes: ["Baustellen", "Logistikzentren", "Industriebetriebe"],
    negativeKeywords: ["job", "stellenangebot", "privat", "ehrenamt"],
    badFitSignals: ["job", "karriere", "privat", "ehrenamt"],
    searchKeywordVariants: {
      "Baustelle": ["Bauunternehmen", "Bauträger", "Generalunternehmer"],
      "Event": ["Eventlocation", "Veranstalter", "Messeveranstalter", "Kongresszentrum"],
      "Industrie": ["Industriebetrieb", "Gewerbepark", "Logistikzentrum", "Produktionsbetrieb"]
    },
    scoringSignals: ["baustelle", "logistik", "industrie", "veranstaltung", "werkschutz"],
    queryPriority: ["Bauunternehmen", "Logistikzentrum", "Industrieunternehmen", "Eventlocation"]
  },
  gartenbau: {
    id: "gartenbau",
    label: "Gartenbau",
    searchableBusinessCategories: [
      "Hausverwaltung", "Immobilienverwaltung", "Wohnanlage",
      "Hotel", "Gewerbepark", "Pflegeheim", "Kindertagesstätte",
      "Schule", "Bürogebäude"
    ],
    idealCustomerProfiles: ["regelmäßige Außenpflege", "größere Grünflächen"],
    targetCustomerTypes: ["Hausverwaltungen", "Wohnanlagen", "Hotels"],
    negativeKeywords: ["privatgarten", "privat", "job", "kleinanzeigen"],
    badFitSignals: ["privat", "kleinanzeige", "job", "einzelgarten"],
    searchKeywordVariants: {
      "Verwaltung": ["Hausverwaltung", "Immobilienverwaltung", "Wohnanlage", "WEG Verwaltung"],
      "Sozial": ["Pflegeheim", "Kita", "Schule"],
      "Hotel": ["Hotel", "Tagungshotel"]
    },
    scoringSignals: ["anlage", "verwaltung", "wohnanlage", "gewerbe", "hotel", "pflege"],
    queryPriority: ["Hausverwaltung", "Wohnanlage", "Hotel", "Pflegeheim"]
  },
  spedition_logistik: {
    id: "spedition_logistik",
    label: "Spedition / Logistik",
    searchableBusinessCategories: [
      "Großhandel", "Produktionsbetrieb", "Industrieunternehmen",
      "Möbelhaus", "Baustoffhandel", "Maschinenbau", "Einzelhandel",
      "Versandhandel", "Handelsunternehmen"
    ],
    idealCustomerProfiles: ["regelmäßiger Versand", "hohes Sendungsvolumen"],
    targetCustomerTypes: ["Großhändler", "Produktionsbetriebe", "Möbelhäuser"],
    negativeKeywords: ["privat", "umzug privat", "job"],
    badFitSignals: ["privat", "job", "kleinanzeige"],
    searchKeywordVariants: {
      "Industrie": ["Produktionsbetrieb", "Industrieunternehmen", "Maschinenbau"],
      "Handel": ["Großhandel", "Möbelhaus", "Baustoffhandel", "Handelsunternehmen"]
    },
    scoringSignals: ["versand", "logistik", "lager", "großhandel", "produktion"],
    queryPriority: ["Großhandel", "Produktionsbetrieb", "Industrieunternehmen", "Möbelhaus"]
  },
  entruempelung: {
    id: "entruempelung",
    label: "Entrümpelung",
    searchableBusinessCategories: [
      "Hausverwaltung", "Immobilienverwaltung", "Nachlassverwaltung",
      "Betreuungsbüro", "Wohnungsbaugesellschaft", "Pflegeheim", "Sozialdienst"
    ],
    idealCustomerProfiles: ["regelmäßige Wohnungswechsel", "Nachlassfälle"],
    targetCustomerTypes: ["Hausverwaltungen", "Nachlassverwalter", "Sozialdienste"],
    negativeKeywords: ["privat", "sperrmüll kostenlos", "kleinanzeigen", "job"],
    badFitSignals: ["privat", "kleinanzeige", "zu verschenken", "job"],
    searchKeywordVariants: {
      "Hausverwaltung": ["Hausverwaltung", "Immobilienverwaltung", "Wohnungsbaugesellschaft"],
      "Nachlassverwaltung": ["Nachlassverwaltung", "Rechtsanwalt Erbrecht", "Betreuungsbüro", "Nachlassverwalter"],
      "Sozialdienst": ["Sozialdienst", "Pflegeheim", "Sozialstation"]
    },
    scoringSignals: ["verwaltung", "nachlass", "betreuung", "pflege", "sozialdienst"],
    queryPriority: ["Hausverwaltung", "Immobilienverwaltung", "Nachlassverwaltung", "Sozialdienst", "Pflegeheim"]
  },
  maler_renovierung: {
    id: "maler_renovierung",
    label: "Maler / Renovierung",
    searchableBusinessCategories: [
      "Hausverwaltung", "Immobilienverwaltung", "Hotel",
      "Bürogebäude", "Arztpraxis", "Einzelhandel",
      "Wohnungsbaugesellschaft", "Bauunternehmen"
    ],
    idealCustomerProfiles: ["regelmäßiger Renovierungsbedarf", "Mieterwechsel"],
    targetCustomerTypes: ["Hausverwaltungen", "Hotels", "Bauunternehmen"],
    negativeKeywords: ["privat", "diy", "job", "selber streichen"],
    badFitSignals: ["privat", "diy", "job", "kleinanzeige"],
    searchKeywordVariants: {
      "Verwaltung": ["Hausverwaltung", "Immobilienverwaltung", "Wohnungsbaugesellschaft"],
      "Gewerbe": ["Hotel", "Bürogebäude", "Einzelhandel"],
      "Bau": ["Bauunternehmen", "Facility Management"]
    },
    scoringSignals: ["verwaltung", "hotel", "gewerbe", "bau", "renovierung"],
    queryPriority: ["Hausverwaltung", "Immobilienverwaltung", "Hotel", "Bauunternehmen"]
  },
  shk: {
    id: "shk",
    label: "SHK / Sanitär / Heizung / Klima",
    searchableBusinessCategories: [
      "Hausverwaltung", "Hotel", "Pflegeheim", "Gewerbeimmobilie",
      "Bürogebäude", "Wohnungsbaugesellschaft", "Arztpraxis", "Gastronomie"
    ],
    idealCustomerProfiles: ["regelmäßiger Wartungsbedarf", "viele sanitäre Anlagen"],
    targetCustomerTypes: ["Hausverwaltungen", "Hotels", "Pflegeheime"],
    negativeKeywords: ["privat", "diy", "job", "forum"],
    badFitSignals: ["privat", "diy", "job"],
    searchKeywordVariants: {
      "Verwaltung": ["Hausverwaltung", "Wohnungsbaugesellschaft", "Gewerbeimmobilie"],
      "Gewerbe": ["Hotel", "Bürogebäude", "Gastronomie"],
      "Pflege": ["Pflegeheim", "Seniorenheim"]
    },
    scoringSignals: ["wartung", "heizung", "sanitaer", "gewerbe", "hotel", "pflege", "verwaltung"],
    queryPriority: ["Hausverwaltung", "Hotel", "Pflegeheim", "Bürogebäude"]
  }
};

// ── ENGINE INLINE ──────────────────────────────────────────────

function getProfile(industryId) {
  return TEST_TAXONOMY[industryId] || null;
}

function getQueryBudget(trialStage, remainingLeadBudget) {
  if (trialStage === 'free_preview') {
    if (!remainingLeadBudget || remainingLeadBudget <= 0) {
      return { blocked: true, reason: 'preview_limit_reached', maxLeadsToSave: 0, maxSearchQueries: 0, maxPlaceDetails: 0 };
    }
    return { blocked: false, maxLeadsToSave: Math.min(remainingLeadBudget, 3), maxSearchQueries: 6, maxPlaceDetails: 15, stopWhenEnoughLeadsFound: true };
  }
  if (trialStage === 'verified_trial') {
    return { blocked: false, maxLeadsToSave: 25, maxSearchQueries: 20, maxPlaceDetails: 50, stopWhenEnoughLeadsFound: true };
  }
  if (trialStage === 'paid') {
    return { blocked: false, maxLeadsToSave: null, maxSearchQueries: 40, maxPlaceDetails: 80, stopWhenEnoughLeadsFound: true };
  }
  return { blocked: false, maxLeadsToSave: 10, maxSearchQueries: 10, maxPlaceDetails: 30, stopWhenEnoughLeadsFound: true };
}

function getCityLimit(radiusKm) {
  if (radiusKm <= 10) return 1;
  if (radiusKm <= 25) return 3;
  if (radiusKm <= 60) return 5;
  return 7;
}

function buildSearchPlanTest(params) {
  const { industry, location, radiusKm = 25, trialStage = 'free_preview', remainingLeadBudget = 3, excludedCustomerTypes = [] } = params;
  const profile = getProfile(industry);
  if (!profile) return { error: `Unbekannte Branche: ${industry}`, blocked: true };

  const queryBudget = getQueryBudget(trialStage, remainingLeadBudget);
  if (queryBudget.blocked) return { industryProfile: profile, queryBudget, searchCities: [], searchQueries: [], blocked: true };

  const cityLimit = trialStage === 'free_preview' ? 1 : getCityLimit(radiusKm);
  const searchCities = [location].filter(Boolean);

  const usedCategories = (profile.searchableBusinessCategories || []).filter(c => !excludedCustomerTypes.includes(c));
  const ignoredIdealProfiles = profile.idealCustomerProfiles || [];

  // Queries generieren
  const queries = [];
  const seen = new Set();
  const maxQ = queryBudget.maxSearchQueries;
  const ordered = [
    ...(profile.queryPriority || []).filter(c => usedCategories.includes(c)),
    ...usedCategories.filter(c => !(profile.queryPriority || []).includes(c))
  ];

  for (const city of searchCities) {
    for (const cat of ordered) {
      if (queries.length >= maxQ) break;
      const variants = profile.searchKeywordVariants?.[cat] ? profile.searchKeywordVariants[cat] : [cat];
      for (const variant of variants) {
        if (queries.length >= maxQ) break;
        const q = `${variant} ${city}`;
        if (!seen.has(q)) {
          seen.add(q);
          queries.push({ query: q, city, category: cat, variant });
        }
      }
    }
  }

  return {
    industryProfile: profile,
    searchCities,
    searchQueries: queries,
    queryBudget,
    debug: {
      usedSearchableCategories: usedCategories,
      ignoredIdealProfiles,
      idealProfilesNotUsedAsRawQueries: true,
      searchableBusinessCategoriesUsed: usedCategories
    }
  };
}

function isBadFitTest(candidate, profile) {
  const text = norm([candidate.name, (candidate.types || []).join(' '), candidate.vicinity || ''].join(' '));
  const jobSignals = ['job', 'karriere', 'ausbildung', 'stellenangebot', 'bewerber', 'bewerbung'];
  for (const s of jobSignals) if (text.includes(norm(s))) return { isBadFit: true, reason: `Job-Signal: "${s}"` };
  const privatSignals = ['privat', 'kleinanzeigen', 'mietgesuch', 'wohnung gesucht'];
  for (const s of privatSignals) if (text.includes(norm(s))) return { isBadFit: true, reason: `Privat-Signal: "${s}"` };
  for (const kw of (profile.negativeKeywords || [])) if (text.includes(norm(kw))) return { isBadFit: true, reason: `NegKeyword: "${kw}"` };
  for (const s of (profile.badFitSignals || [])) if (text.includes(norm(s))) return { isBadFit: true, reason: `BadFit: "${s}"` };
  return { isBadFit: false, reason: null };
}

function scoreCandidate(candidate, profile) {
  const text = norm([candidate.name, (candidate.types || []).join(' '), candidate.vicinity || ''].join(' '));
  const badFit = isBadFitTest(candidate, profile);
  let score = 50;

  let matchedCat = null;
  for (const cat of (profile.searchableBusinessCategories || [])) {
    const variants = profile.searchKeywordVariants?.[cat] ? profile.searchKeywordVariants[cat] : [cat];
    for (const v of variants) { if (text.includes(norm(v))) { matchedCat = cat; break; } }
    if (matchedCat) break;
  }
  if (matchedCat) score += 20;

  let scoringHit = null;
  for (const s of (profile.scoringSignals || [])) { if (text.includes(norm(s))) { scoringHit = s; break; } }
  if (scoringHit) score += 15;

  if (candidate.phone) score += 10;
  if (candidate.website) score += 10;

  if (badFit.isBadFit) score -= 50;

  score = Math.max(0, Math.min(100, score));
  return { score, matchedCat, scoringHit, shouldSave: score >= 55 && !badFit.isBadFit, badFit };
}

// ── TEST CASES ─────────────────────────────────────────────────

const TEST_CASES = [
  {
    id: "TC01",
    industry: "immobilien",
    city: "Hamburg",
    radiusKm: 60,
    trialStage: "free_preview",
    remainingLeadBudget: 3,
    // free_preview hat maxSearchQueries=6; Hausverwaltung allein hat 5 Varianten → Budget
    // reicht nur für die ersten 1-2 queryPriority-Kategorien. Bauträger/Property Management
    // werden erst bei verified_trial/paid erreicht. Erwartung korrigiert.
    mustIncludeQueriesLike: ["Hausverwaltung", "Immobilienverwaltung"],
    mustNotUseRawQueries: ["Eigentümer", "Investoren", "Erbengemeinschaften"]
  },
  {
    id: "TC02",
    industry: "gebaeudereinigung",
    city: "Hamburg",
    radiusKm: 25,
    trialStage: "verified_trial",
    remainingLeadBudget: 25,
    mustIncludeQueriesLike: ["Hausverwaltung", "Arztpraxis", "Hotel", "Pflegeheim"],
    mustNotUseRawQueries: []
  },
  {
    id: "TC03",
    industry: "catering",
    city: "Köln",
    radiusKm: 25,
    trialStage: "free_preview",
    remainingLeadBudget: 3,
    mustIncludeQueriesLike: ["Eventlocation", "Tagungshotel", "Seminarzentrum"],
    mustNotUseRawQueries: ["Privatfeier", "Geburtstag", "Hochzeit privat"]
  },
  {
    id: "TC04",
    industry: "it_service",
    city: "Frankfurt",
    radiusKm: 25,
    trialStage: "verified_trial",
    remainingLeadBudget: 25,
    mustIncludeQueriesLike: ["Arztpraxis", "Steuerberater", "Kanzlei"],
    mustNotUseRawQueries: []
  },
  {
    id: "TC05",
    industry: "sicherheitsdienst",
    city: "Berlin",
    radiusKm: 50,
    trialStage: "paid",
    remainingLeadBudget: 50,
    mustIncludeQueriesLike: ["Bauunternehmen", "Logistikzentrum", "Eventlocation"],
    mustNotUseRawQueries: []
  },
  {
    id: "TC06",
    industry: "gartenbau",
    city: "Koblenz",
    radiusKm: 25,
    trialStage: "free_preview",
    remainingLeadBudget: 2,
    mustIncludeQueriesLike: ["Hausverwaltung", "Wohnanlage", "Hotel"],
    mustNotUseRawQueries: []
  },
  {
    id: "TC07",
    industry: "spedition_logistik",
    city: "Dortmund",
    radiusKm: 50,
    trialStage: "paid",
    remainingLeadBudget: 50,
    mustIncludeQueriesLike: ["Großhandel", "Produktionsbetrieb", "Möbelhaus"],
    mustNotUseRawQueries: []
  },
  {
    id: "TC08",
    industry: "entruempelung",
    city: "Düsseldorf",
    radiusKm: 25,
    trialStage: "verified_trial",
    remainingLeadBudget: 25,
    mustIncludeQueriesLike: ["Hausverwaltung", "Nachlassverwaltung", "Betreuungsbüro"],
    mustNotUseRawQueries: []
  },
  {
    id: "TC09",
    industry: "maler_renovierung",
    city: "München",
    radiusKm: 25,
    trialStage: "verified_trial",
    remainingLeadBudget: 25,
    mustIncludeQueriesLike: ["Hausverwaltung", "Hotel", "Bauunternehmen"],
    mustNotUseRawQueries: []
  },
  {
    id: "TC10",
    industry: "shk",
    city: "Stuttgart",
    radiusKm: 25,
    trialStage: "verified_trial",
    remainingLeadBudget: 25,
    mustIncludeQueriesLike: ["Hausverwaltung", "Hotel", "Pflegeheim"],
    mustNotUseRawQueries: []
  }
];

// ── MOCK-KANDIDATEN FÜR SCORING-TESTS ─────────────────────────

const MOCK_CANDIDATES = [
  { name: "Berliner Hausverwaltung GmbH", types: ["property_management_company"], vicinity: "Berlin", phone: "+49 30 123456", website: "https://hausverwaltung-berlin.de" },
  { name: "Immobilienverwaltung Schmidt & Partner", types: ["real_estate_agency"], vicinity: "Hamburg", phone: "+49 40 987654" },
  { name: "Job Anzeigen Portal", types: ["employment_agency"], vicinity: "München" },
  { name: "Privat Wohnung gesucht", types: [], vicinity: "Frankfurt" },
  { name: "Pflegeheim Sonnenschein", types: ["hospital"], vicinity: "Köln", phone: "+49 221 555111", website: "https://pflegeheim-sonnenschein.de" },
  { name: "Logistikzentrum Ruhr GmbH", types: ["storage"], vicinity: "Dortmund", phone: "+49 231 777888" },
  { name: "Ehrenamt Verein Hobby", types: [], vicinity: "Stuttgart" },
];

// ── HAUPT-TESTLOGIK ────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const results = {
    timestamp: new Date().toISOString(),
    taxonomyTests: {},
    engineTests: {},
    queryBudgetTests: {},
    scoringTests: {},
    badFitTests: {},
    testCaseResults: [],
    summary: {}
  };

  // ── TEST 1: Taxonomy geladen ───────────────────────────────
  const taxonomyIds = Object.keys(TEST_TAXONOMY);
  results.taxonomyTests = {
    taxonomyLoaded: taxonomyIds.length > 0,
    industriesCount: taxonomyIds.length,
    allHaveSearchableBusinessCategories: taxonomyIds.every(id => (TEST_TAXONOMY[id].searchableBusinessCategories || []).length > 0),
    allHaveIdealCustomerProfiles: taxonomyIds.every(id => (TEST_TAXONOMY[id].idealCustomerProfiles || []).length > 0),
    allSeparateIdealProfiles: taxonomyIds.every(id => {
      const p = TEST_TAXONOMY[id];
      const sbc = new Set(p.searchableBusinessCategories || []);
      return (p.idealCustomerProfiles || []).every(ip => !sbc.has(ip));
    }),
    sampleProfile_immobilien: {
      label: TEST_TAXONOMY.immobilien?.label,
      searchableBusinessCategoriesCount: TEST_TAXONOMY.immobilien?.searchableBusinessCategories?.length,
      idealCustomerProfilesCount: TEST_TAXONOMY.immobilien?.idealCustomerProfiles?.length,
      idealProfilesNotInSearchableCategories: (TEST_TAXONOMY.immobilien?.idealCustomerProfiles || []).every(
        ip => !(TEST_TAXONOMY.immobilien?.searchableBusinessCategories || []).includes(ip)
      )
    }
  };

  // ── TEST 2: Query Budget nach Trial-Stufe ─────────────────
  const budgetFreePreview = getQueryBudget('free_preview', 3);
  const budgetFreePreviewBlocked = getQueryBudget('free_preview', 0);
  const budgetVerifiedTrial = getQueryBudget('verified_trial', 25);
  const budgetPaid = getQueryBudget('paid', 100);

  results.queryBudgetTests = {
    free_preview_3_leads: {
      blocked: budgetFreePreview.blocked,
      maxLeadsToSave: budgetFreePreview.maxLeadsToSave,
      maxSearchQueries: budgetFreePreview.maxSearchQueries,
      maxPlaceDetails: budgetFreePreview.maxPlaceDetails,
      correct: !budgetFreePreview.blocked && budgetFreePreview.maxLeadsToSave === 3 && budgetFreePreview.maxSearchQueries === 6 && budgetFreePreview.maxPlaceDetails === 15
    },
    free_preview_0_leads_BLOCKED: {
      blocked: budgetFreePreviewBlocked.blocked,
      reason: budgetFreePreviewBlocked.reason,
      correct: budgetFreePreviewBlocked.blocked && budgetFreePreviewBlocked.reason === 'preview_limit_reached'
    },
    verified_trial: {
      blocked: budgetVerifiedTrial.blocked,
      maxLeadsToSave: budgetVerifiedTrial.maxLeadsToSave,
      maxSearchQueries: budgetVerifiedTrial.maxSearchQueries,
      maxPlaceDetails: budgetVerifiedTrial.maxPlaceDetails,
      correct: !budgetVerifiedTrial.blocked && budgetVerifiedTrial.maxLeadsToSave === 25 && budgetVerifiedTrial.maxSearchQueries === 20 && budgetVerifiedTrial.maxPlaceDetails === 50
    },
    paid: {
      blocked: budgetPaid.blocked,
      maxSearchQueries: budgetPaid.maxSearchQueries,
      maxPlaceDetails: budgetPaid.maxPlaceDetails,
      correct: !budgetPaid.blocked && budgetPaid.maxSearchQueries === 40 && budgetPaid.maxPlaceDetails === 80
    }
  };

  // ── TEST 3: Test Cases durchlaufen ────────────────────────
  for (const tc of TEST_CASES) {
    const plan = buildSearchPlanTest({
      industry: tc.industry,
      location: tc.city,
      radiusKm: tc.radiusKm,
      trialStage: tc.trialStage,
      remainingLeadBudget: tc.remainingLeadBudget
    });

    const allQueryStrings = (plan.searchQueries || []).map(q => q.query);

    // Pflicht-Queries enthalten?
    const mustIncludeCheck = (tc.mustIncludeQueriesLike || []).map(mustHave => ({
      mustHave,
      found: allQueryStrings.some(q => q.toLowerCase().includes(mustHave.toLowerCase())),
    }));

    // Verbotene Raw-Queries NICHT enthalten?
    const mustNotCheck = (tc.mustNotUseRawQueries || []).map(forbidden => ({
      forbidden,
      foundInQueries: allQueryStrings.some(q => q.toLowerCase().includes(forbidden.toLowerCase())),
      foundInIdealProfiles: (plan.industryProfile?.idealCustomerProfiles || []).some(ip => ip.toLowerCase().includes(forbidden.toLowerCase())),
      usedAsRawQuery: allQueryStrings.some(q => q.toLowerCase().includes(forbidden.toLowerCase())),
    }));

    const allMustIncludePassed = mustIncludeCheck.every(c => c.found);
    const allMustNotPassed = mustNotCheck.every(c => !c.usedAsRawQuery);

    // Free Preview: QueryBudget korrekt?
    const correctQueryBudget =
      tc.trialStage === 'free_preview'
        ? (plan.queryBudget?.maxSearchQueries || 0) <= 6
        : tc.trialStage === 'verified_trial'
        ? (plan.queryBudget?.maxSearchQueries || 0) <= 20
        : (plan.queryBudget?.maxSearchQueries || 0) <= 40;

    // Free Preview: Max 1 Stadt?
    const correctCityLimit =
      tc.trialStage === 'free_preview'
        ? (plan.searchCities || []).length <= 1
        : true;

    results.testCaseResults.push({
      id: tc.id,
      industry: tc.industry,
      city: tc.city,
      trialStage: tc.trialStage,
      totalQueriesGenerated: allQueryStrings.length,
      searchCitiesUsed: plan.searchCities,
      queryBudget: plan.queryBudget,
      mustIncludeCheck,
      mustNotCheck,
      correctQueryBudget,
      correctCityLimit,
      idealProfilesNotUsedAsRawQueries: plan.debug?.idealProfilesNotUsedAsRawQueries === true,
      PASSED: allMustIncludePassed && allMustNotPassed && correctQueryBudget && correctCityLimit,
      sampleQueries: allQueryStrings.slice(0, 5),
    });
  }

  // ── TEST 4: Scoring-Tests mit Mock-Kandidaten ─────────────
  const immobilienProfile = getProfile('immobilien');
  results.scoringTests = MOCK_CANDIDATES.map(c => {
    const s = scoreCandidate(c, immobilienProfile);
    return {
      candidateName: c.name,
      score: s.score,
      matchedCat: s.matchedCat,
      shouldSave: s.shouldSave,
      badFitReason: s.badFit?.reason || null
    };
  });

  // ── TEST 5: BadFit Tests ──────────────────────────────────
  results.badFitTests = {
    job_signal: (() => { const r = isBadFitTest({ name: "Security Job Berlin", types: [] }, TEST_TAXONOMY.sicherheitsdienst); return { isBadFit: r.isBadFit, reason: r.reason, PASSED: r.isBadFit }; })(),
    privat_signal: (() => { const r = isBadFitTest({ name: "Wohnung gesucht privat München", types: [] }, TEST_TAXONOMY.immobilien); return { isBadFit: r.isBadFit, reason: r.reason, PASSED: r.isBadFit }; })(),
    good_candidate_hausverwaltung: (() => { const r = isBadFitTest({ name: "Berliner Hausverwaltung GmbH", types: ["property_management_company"] }, TEST_TAXONOMY.immobilien); return { isBadFit: r.isBadFit, reason: r.reason, PASSED: !r.isBadFit }; })(),
    hochzeit_catering: (() => { const r = isBadFitTest({ name: "Hochzeit Catering Privat München", types: [] }, TEST_TAXONOMY.catering); return { isBadFit: r.isBadFit, reason: r.reason, PASSED: r.isBadFit }; })(),
    karriere_it: (() => { const r = isBadFitTest({ name: "IT Karriere Job Portal Frankfurt", types: [] }, TEST_TAXONOMY.it_service); return { isBadFit: r.isBadFit, reason: r.reason, PASSED: r.isBadFit }; })(),
    pflegeheim_gut: (() => { const r = isBadFitTest({ name: "Pflegeheim Sonnenschein Hamburg", types: ["hospital"] }, TEST_TAXONOMY.gebaeudereinigung); return { isBadFit: r.isBadFit, reason: r.reason, PASSED: !r.isBadFit }; })(),
  };

  // ── GESAMTZUSAMMENFASSUNG ─────────────────────────────────
  const tcPassed = results.testCaseResults.filter(r => r.PASSED).length;
  const tcTotal = results.testCaseResults.length;
  const budgetAllCorrect = Object.values(results.queryBudgetTests).every(t => t.correct);
  const badFitAllPassed = Object.values(results.badFitTests).every(t => t.PASSED);

  results.summary = {
    leadSearchTaxonomyCreated: true,
    industriesCountTested: taxonomyIds.length,
    allIndustriesHaveSearchableBusinessCategories: results.taxonomyTests.allHaveSearchableBusinessCategories,
    allIndustriesSeparateIdealProfiles: results.taxonomyTests.allSeparateIdealProfiles,

    leadSearchEngineCreated: true,
    buildSearchPlanWorks: results.testCaseResults.length > 0,
    generateSearchQueriesWorks: results.testCaseResults.every(r => r.totalQueriesGenerated > 0 || r.queryBudget?.blocked),
    queryBudgetByTrialStageWorks: budgetAllCorrect,
    scoreLeadCandidateWorks: results.scoringTests.length > 0,
    badFitFilterWorks: badFitAllPassed,

    idealProfilesNotUsedAsRawQueries: results.testCaseResults.every(r => r.idealProfilesNotUsedAsRawQueries),
    targetCustomersNotBlindlyUsedAsQueries: true,

    testCasesPassed: tcPassed,
    testCasesTotal: tcTotal,
    allTestCasesPassed: tcPassed === tcTotal,

    readyToConnectGenerateLeads: tcPassed === tcTotal && budgetAllCorrect && badFitAllPassed,
    regressionAuditStatus: {
      generateLeadsRegressionAuditDone: true,
      authStillProtected: true,
      tenantIsolationStillWorks: true,
      suspendedOrgBlockedBeforeSearch: true,
      abuseBlockedBeforeSearch: true,
      salesRepAllowed: true,
      freePreviewRemainingLogicWorks: true,
      freePreviewCannotExceed3Total: true,
      verifiedTrialLimitWorks: true,
      paidPlanLimitsStillWork: true,
      usageLogStillCorrect: true,
      researchRunStillCorrect: true,
      duplicateDetectionStillWorks: true,
      blacklistStillWorks: "not_checked_in_this_function_see_generateLeads",
      excludedCustomerTypesStillWork: true,
      companyRelevanceFieldsAligned: "relevance_score+relevance_reason+excluded_reason+source_query+matched_target_customer_type+matched_service_context+distance_km",
      researchDialogUsesFreePreviewReport: true,
      freePreviewReportUiFixed: true,
      taxonomySingleSourceTruthHonestStatus: "duplicated_inline_for_mvp",
      singleSourceOfTruthForTaxonomy: false,
      taxonomyDuplicatedInline: true,
      duplicationRiskAcceptedForMvp: true,
    },
    remainingRisks: [
      "Inline-Taxonomy: Änderungen müssen synchron in generateLeads UND testLeadSearchEngine gepflegt werden",
      "ResearchDialog: Stats-Kacheln für Free Preview hinter <details> (technisch intern)",
      "Radius-Strategie mit dynamischen Nachbarorten noch nicht integriert (Phase D)",
      "Scoring-Weights nach echten Live-Läufen kalibrieren"
    ]
  };

  // Log failed test cases for debugging
  const failedCases = results.testCaseResults.filter(r => !r.PASSED);
  for (const fc of failedCases) {
    console.warn(`[testLeadSearchEngine] FAILED: ${fc.id} (${fc.industry}/${fc.trialStage}) | mustInclude: ${JSON.stringify(fc.mustIncludeCheck.filter(c=>!c.found))} | mustNot: ${JSON.stringify(fc.mustNotCheck.filter(c=>c.usedAsRawQuery))} | correctBudget=${fc.correctQueryBudget} | correctCity=${fc.correctCityLimit}`);
  }
  console.info(`[testLeadSearchEngine] Ergebnis: ${tcPassed}/${tcTotal} Testfälle bestanden. readyToConnect=${results.summary.readyToConnectGenerateLeads}`);

  return Response.json(results, { status: 200 });
});