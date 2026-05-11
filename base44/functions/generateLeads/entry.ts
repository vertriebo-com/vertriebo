import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

// ─── Google SKU Pricing (USD per 1000 requests) ────────────────────────────
const GOOGLE_SKU_PRICING_USD_PER_1000 = {
  geocoding: 5,
  places_text_search_pro: 32,
  places_nearby_search_pro: 32,
  place_details_essentials: 5,
  place_details_pro: 17,
};

function skuCostCent(sku, requests) {
  const priceUsdPer1000 = GOOGLE_SKU_PRICING_USD_PER_1000[sku] || 0;
  return (requests / 1000) * priceUsdPer1000 * 100;
}

// ─── Access Check ─────────────────────────────────────────────────────────────
const ACTION_ROLES = { generate_leads: ['organization_admin'] };
function _allow(r) { return { allowed: true, ...r }; }
function _deny(reason, message) { return { allowed: false, reason, message, user: null }; }

async function checkAccess(req, { organization_id, action } = {}) {
  const b44 = createClientFromRequest(req);
  let user;
  try { user = await b44.auth.me(); } catch { return _deny('not_authenticated', 'Nicht eingeloggt.'); }
  if (!user) return _deny('not_authenticated', 'Nicht eingeloggt.');
  if (user.role === 'admin') return _allow({ reason: 'platform_admin', user, organization: null, member: null, role: 'platform_admin' });
  if (!organization_id) return _deny('missing_organization_id', 'Keine organization_id angegeben.');

  let orgs, members;
  try {
    [orgs, members] = await Promise.all([
      b44.asServiceRole.entities.Organization.filter({ id: organization_id }),
      b44.asServiceRole.entities.OrganizationMember.filter({ organization_id, user_email: user.email }),
    ]);
  } catch { return _deny('organization_not_found', 'Organisation nicht gefunden.'); }

  const organization = orgs[0] || null;
  if (!organization) return _deny('organization_not_found', 'Organisation nicht gefunden.');
  if (organization.owner_email === user.email) return _allow({ reason: 'org_owner', user, organization, member: members[0] || null, role: 'organization_admin' });

  const member = members[0] || null;
  if (!member) return _deny('not_a_member', 'Kein Mitglied dieser Organisation.');
  if (member.status !== 'active') return _deny('member_inactive', `Mitglied-Status: "${member.status}".`);

  const role = member.role;
  if (action) {
    const ar = ACTION_ROLES[action];
    if (!ar || !ar.includes(role)) return _deny('insufficient_role', `Rolle "${role}" darf "${action}" nicht.`);
  }
  return _allow({ reason: 'ok', user, organization, member, role });
}

// ─── Search Variants (für Suchanfragen an Google) ─────────────────────────────
const SEARCH_VARIANTS = {
  "Hausverwaltungen":              ["Hausverwaltung", "Immobilienverwaltung", "WEG Verwaltung"],
  "Bürogebäude":                   ["Bürogebäude", "Gewerbepark", "Business Center"],
  "Arztpraxen":                    ["Arztpraxis", "Zahnarztpraxis", "Medizinisches Versorgungszentrum"],
  "Autohäuser":                    ["Autohaus", "Autohandel", "Autohändler"],
  "Möbelhäuser":                   ["Möbelhaus", "Möbelhandel", "Küchenstudio"],
  "Hotels":                        ["Hotel", "Gasthof", "Pension"],
  "Restaurants":                   ["Restaurant", "Gastronomie"],
  "Fitnessstudios":                ["Fitnessstudio", "Gym"],
  "Apotheken":                     ["Apotheke"],
  "Kanzleien":                     ["Anwaltskanzlei", "Rechtsanwalt"],
  "Steuerkanzleien":               ["Steuerberater", "Steuerberatung"],
  "Handwerksbetriebe":             ["Handwerksbetrieb", "Handwerker"],
  "Bauunternehmen":                ["Bauunternehmen", "Baufirma"],
  "Großhändler":                   ["Großhandel", "Großhändler"],
  "Pflegeheime":                   ["Pflegeheim", "Altenheim", "Seniorenheim"],
  "Schulen":                       ["Schule", "Gymnasium"],
  "Kitas":                         ["Kita", "Kindergarten"],
  "Supermärkte":                   ["Supermarkt", "Lebensmittelmarkt"],
  "Logistikzentren":               ["Logistik", "Logistikzentrum"],
  "Gebäudereinigung":              ["Gebäudereinigung", "Reinigungsunternehmen", "Reinigungsfirma"],
  // Zielkunden aus dem alten ZIELKUNDEN_SEARCH_MAPPING (CompanySettings)
  "Büros":                         ["Büro", "Gewerbe", "Kanzlei", "Beratung"],
  "Immobilienfirmen":              ["Immobilienmakler", "Immobilienbüro", "Makler"],
  "Gewerbekunden":                 ["Gewerbebetrieb", "Handwerk", "Werkstatt"],
  "Industrie":                     ["Industrieunternehmen", "Produktionsstätte", "Lager"],
  "Logistik":                      ["Spedition", "Lagerhaus", "Logistikzentrum"],
  "Schulen / Bildungseinrichtungen": ["Schule", "Gymnasium", "Kindergarten", "Bildungszentrum"],
  "Krankenhäuser / Kliniken":      ["Krankenhaus", "Klinik", "Pflegeheim"],
};

// ─── Relevanz-Regeln: harte Filterung nach Zielgruppe ─────────────────────────
// positiveKeywords: mindestens eines muss im Text vorkommen → Match
// negativeKeywords: wenn eines vorkommt → sofort ausschließen (Vorrang!)
const TARGET_RULES = {
  "Hausverwaltungen": {
    positiveKeywords: [
      "hausverwaltung", "immobilienverwaltung", "weg verwaltung", "weg-verwaltung",
      "mietverwaltung", "property management", "objektverwaltung", "wohnungsverwaltung",
      "grundstuecksverwaltung", "verwaltungsgesellschaft", "facility management",
      "immobilien verwaltung", "wohnungseigentum",
      // Google Types übersetzt
      "property_management", "immobilienbestand", "verwalter",
      // Firmen mit "verwaltung" im Namen (z.B. "S & S Verwaltung GmbH", "KAISER Haus- & Vermögensverwaltung")
      "vermoegensverwaltung", "vermögensverwaltung", "hausverwaltungs",
      // Immobilien + Betreuung/Service/Vermietung Kombis (z.B. "V.I.B. Immobilien-Betreuungs-", "IVVB")
      "immobilien-betreuung", "immobilien betreuung", "immobilien service",
      "immobilien vermietung verwaltung", "immobilien-verwaltung",
      "haus-verwaltung", "haus & vermoegensverwaltung",
    ],
    negativeKeywords: [
      "kanzlei", "rechtsanwalt", "anwalt", "steuerberater", "wirtschaftspruefung",
      "bank", "sparkasse", "volksbank", "commerzbank", "deutsche bank",
      "versicherung", "finanzberatung", "notar",
      "restaurant", "cafe", "gastro", "bistro",
      "arzt", "zahnarzt", "medizin", "apotheke",
      "software", "informatik", "it-dienstleistung",
      "einzelhandel", "supermarkt", "lebensmittel",
    ],
    // Sonderregel: immobilienmakler nur OK wenn gleichzeitig "verwaltung" im Text
    specialRules: ["immobilienmakler_ohne_verwaltung"],
  },
  "Kanzleien": {
    positiveKeywords: [
      "kanzlei", "rechtsanwalt", "anwaltskanzlei", "anwaelte", "anwälte",
      "rechtsanwaelte", "rechtsanwälte", "notar", "notariat",
    ],
    negativeKeywords: [
      "hausverwaltung", "immobilienverwaltung", "restaurant", "cafe", "arzt",
      "zahnarzt", "apotheke", "supermarkt",
    ],
  },
  "Steuerkanzleien": {
    positiveKeywords: [
      "steuerberater", "steuerkanzlei", "steuerberatung", "wirtschaftspruefer",
      "wirtschaftspruefung", "buchhalter", "buchhaltung",
    ],
    negativeKeywords: [
      "hausverwaltung", "restaurant", "cafe", "arzt", "zahnarzt", "apotheke",
    ],
  },
  "Arztpraxen": {
    positiveKeywords: [
      "arztpraxis", "arzt", "zahnarzt", "zahnarztpraxis", "physiotherapie",
      "praxis", "aerzte", "ärzte", "medizinisches versorgungszentrum", "mvz",
    ],
    negativeKeywords: [
      "hausverwaltung", "kanzlei", "restaurant", "supermarkt",
    ],
  },
  "Restaurants": {
    positiveKeywords: [
      "restaurant", "gastronomie", "cafe", "bistro", "imbiss", "pizzeria",
      "gaststaette", "gaststätte", "speiselokal",
    ],
    negativeKeywords: [
      "hausverwaltung", "kanzlei", "arzt",
    ],
  },
  "Hotels": {
    positiveKeywords: [
      "hotel", "gasthof", "pension", "unterkunft", "herberge", "motel",
    ],
    negativeKeywords: [],
  },
  "Fitnessstudios": {
    positiveKeywords: [
      "fitnessstudio", "gym", "fitness", "sportcenter", "sportstudio",
    ],
    negativeKeywords: [],
  },
  "Handwerksbetriebe": {
    positiveKeywords: [
      "handwerk", "handwerksbetrieb", "elektriker", "klempner", "schreiner",
      "maler", "tischler", "installateur", "sanitaer", "sanitär",
    ],
    negativeKeywords: [],
  },
  "Bauunternehmen": {
    positiveKeywords: [
      "bauunternehmen", "baufirma", "baugesellschaft", "hoch- und tiefbau",
      "bauprojekt", "bautraeger", "bauträger",
    ],
    negativeKeywords: [],
  },
  "Pflegeheime": {
    positiveKeywords: [
      "pflegeheim", "altenheim", "seniorenheim", "pflegeeinrichtung",
      "altenpflege", "seniorenresidenz",
    ],
    negativeKeywords: [],
  },
  "Schulen": {
    positiveKeywords: [
      "schule", "gymnasium", "berufsschule", "realschule", "gesamtschule",
    ],
    negativeKeywords: [],
  },
  "Kitas": {
    positiveKeywords: [
      "kita", "kindergarten", "kindertagesstaette", "kindertagesstätte",
      "krippe", "hort",
    ],
    negativeKeywords: [],
  },
  "Logistikzentren": {
    positiveKeywords: [
      "logistik", "spedition", "lagerhaus", "logistikzentrum", "fulfillment",
      "transport", "lieferdienst",
    ],
    negativeKeywords: [],
  },
  "Gebäudereinigung": {
    positiveKeywords: [
      "gebaeudereinigung", "gebäudereinigung", "reinigungsunternehmen", "reinigungsfirma",
      "reinigungsservice", "hausreinigung",
    ],
    negativeKeywords: [],
  },
  // CompanySettings-Zielkunden
  "Büros": {
    positiveKeywords: [
      "buero", "büro", "gewerbe", "unternehmensberatung", "beratung", "consulting",
    ],
    negativeKeywords: [],
  },
  "Immobilienfirmen": {
    positiveKeywords: [
      "immobilienmakler", "immobilienbuero", "immobilienbüro", "makler",
    ],
    negativeKeywords: [
      "hausverwaltung", "verwaltung",
    ],
  },
  "Krankenhäuser / Kliniken": {
    positiveKeywords: [
      "krankenhaus", "klinik", "klinikum", "pflegeheim", "altenheim", "reha",
    ],
    negativeKeywords: [],
  },
  "Schulen / Bildungseinrichtungen": {
    positiveKeywords: [
      "schule", "gymnasium", "bildungszentrum", "berufsschule", "kindergarten",
    ],
    negativeKeywords: [],
  },
};

// ─── Normalisierung: Umlaute + Lowercase ─────────────────────────────────────
function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

// Google Places types → lesbare Begriffe für Textprüfung
const GOOGLE_TYPE_TRANSLATIONS = {
  "lawyer": "rechtsanwalt kanzlei",
  "attorney": "rechtsanwalt kanzlei",
  "legal_services": "rechtsanwalt kanzlei",
  "accounting": "steuerberater buchhaltung",
  "finance": "bank finanzberatung",
  "bank": "bank sparkasse",
  "insurance_agency": "versicherung",
  "real_estate_agency": "immobilienmakler",
  "property_management_company": "hausverwaltung immobilienverwaltung",
  "restaurant": "restaurant gastronomie",
  "food": "restaurant lebensmittel",
  "health": "arzt medizin",
  "doctor": "arzt",
  "dentist": "zahnarzt",
  "hospital": "krankenhaus",
  "pharmacy": "apotheke",
  "grocery_or_supermarket": "supermarkt lebensmittel",
  "store": "einzelhandel",
  "clothing_store": "einzelhandel",
  "software_company": "software it",
  "gym": "fitnessstudio",
  "school": "schule",
  "lodging": "hotel",
  "car_dealer": "autohaus",
  "moving_company": "umzug",
  "local_government_office": "behoerde amt",
  "place_of_worship": "kirche",
};

function translateGoogleTypes(types = []) {
  return types.map(t => GOOGLE_TYPE_TRANSLATIONS[t] || t.replace(/_/g, " ")).join(" ");
}

// ─── Hausverwaltung: Stufe-1 Keywords (sicherer Match, Score 90) ──────────────
const HV_STAGE1_KEYWORDS = [
  "hausverwaltung", "immobilienverwaltung", "weg verwaltung", "weg-verwaltung",
  "mietverwaltung", "wohnungsverwaltung", "objektverwaltung", "grundstuecksverwaltung",
  "grundstücksverwaltung", "property management", "immobilien verwaltung",
  "immobilien-verwaltung", "haus- und vermoegensverwaltung", "haus & vermoegensverwaltung",
  "haus und vermoegensverwaltung", "hausverwaltungs", "haus-verwaltung",
  // Google Type → "hausverwaltung immobilienverwaltung" (via translateGoogleTypes)
  "property_management", "immobilienbestand", "verwalter",
  // Immobilien + Betreuung/Service mit Verwaltungsbezug
  "immobilien-betreuung", "immobilien betreuung", "immobilien service",
  "immobilien vermietung verwaltung",
];

// Stufe-2: "verwaltung" im Namen, aber kein klarer Kontext → zusätzliche Detail-Prüfung nötig
// Stufe-2 Kontext-Keywords: wenn eines davon im gesamten Text vorkommt → Score 75, speichern
const HV_STAGE2_CONTEXT_KEYWORDS = [
  "immobilien", "wohnen", "wohnungen", "miethaus", "miete", "mieter",
  "weg", "eigentuemer", "eigentümer", "wohnungseigentum",
  "objektbetreuung", "hausgeld", "nebenkostenabrechnung",
  "vermietung", "bewirtschaftung", "liegenschaft",
];

// Stufe-3: harte Ausschlüsse – auch für "verwaltung"-Treffer
const HV_HARD_EXCLUDES = [
  "stadtverwaltung", "gemeindeverwaltung", "kreisverwaltung", "bezirksverwaltung",
  "finanzverwaltung", "steuerverwaltung", "personalverwaltung", "eventverwaltung",
  "kanzleiverwaltung", "bundesverwaltung", "landesverwaltung", "behoerdenverwaltung",
  "bank", "sparkasse", "volksbank", "commerzbank", "versicherung",
  "kanzlei", "rechtsanwalt", "steuerberater", "notar",
];

// ─── Hausverwaltung 3-Stufen-Logik ────────────────────────────────────────────
function validateHausverwaltung(place, text, nameNorm) {
  // Stufe 3: harte Ausschlüsse prüfen (Vorrang vor allem)
  const hardExclude = HV_HARD_EXCLUDES.find(k => text.includes(k));
  if (hardExclude) {
    return { isMatch: false, score: 0, reason: `Harter Ausschluss "${hardExclude}" (Hausverwaltungen)` };
  }

  // Immobilienmakler ohne Verwaltungsbezug → ablehnen
  if (text.includes("immobilienmakler") && !text.includes("verwaltung")) {
    return { isMatch: false, score: 0, reason: "Immobilienmakler ohne Verwaltungsbezug (Hausverwaltungen)" };
  }

  // Stufe 1: sicherer Match
  const stage1Hit = HV_STAGE1_KEYWORDS.find(k => text.includes(k));
  if (stage1Hit) {
    return { isMatch: true, score: 90, reason: `Stufe-1 Keyword-Match "${stage1Hit}" → Hausverwaltungen` };
  }

  // Stufe 2: "verwaltung" im Namen + Kontext-Check
  if (nameNorm.includes("verwaltung")) {
    // Kontext-Keywords im Gesamttext prüfen
    const contextHit = HV_STAGE2_CONTEXT_KEYWORDS.find(k => text.includes(k));
    if (contextHit) {
      return { isMatch: true, score: 75, reason: `Stufe-2 Verwaltung+Kontext "${contextHit}" → Hausverwaltungen` };
    }
    // Kein Kontext → nicht speichern
    return { isMatch: false, score: 0, reason: "ambiguous_verwaltung_no_real_estate_context" };
  }

  // Kein Match
  return { isMatch: false, score: 0, reason: null };
}

// ─── Harte Relevanzprüfung ────────────────────────────────────────────────────
// Logik: Pro Zielgruppe separat prüfen.
// Score >= 70 → speichern. Darunter → verwerfen.
function validateLeadForTarget({ place, targetCustomerTypes, excludedTargetTypes = [] }) {
  const translatedTypes = translateGoogleTypes(place.types || []);
  const rawTypes = (place.types || []).join(" ");
  const text = norm([
    place.name,
    translatedTypes,
    rawTypes,
    place.editorial_summary?.overview,
    place.formatted_address,
    place.vicinity,
  ].join(" "));
  const nameNorm = norm(place.name || "");

  let firstRejectReason = null;

  for (const target of targetCustomerTypes) {
    // User-Ausschluss hat immer Vorrang
    if (excludedTargetTypes.includes(target)) continue;

    const rule = TARGET_RULES[target];

    // Hausverwaltungen: eigene 3-Stufen-Logik
    if (target === "Hausverwaltungen") {
      const result = validateHausverwaltung(place, text, nameNorm);
      if (result.isMatch && result.score >= 70) {
        return { isMatch: true, matchedTarget: target, score: result.score, reason: result.reason };
      }
      if (!result.isMatch && result.reason && !firstRejectReason) {
        firstRejectReason = result.reason;
      }
      continue;
    }

    if (!rule) {
      // Kein Regelwerk → Fallback auf SEARCH_VARIANTS
      const variants = SEARCH_VARIANTS[target] || [target];
      const matched = variants.find(v => text.includes(norm(v)));
      if (matched) {
        return { isMatch: true, matchedTarget: target, score: 70, reason: `Suchbegriff-Match "${matched}"` };
      }
      continue;
    }

    // Negativkeywords disqualifizieren nur DIESE Zielgruppe
    const negHit = rule.negativeKeywords.find(k => text.includes(norm(k)));
    if (negHit) {
      if (!firstRejectReason) firstRejectReason = `Negativbegriff "${negHit}" für ${target}`;
      continue;
    }

    // Positiv-Match
    const posHit = rule.positiveKeywords.find(k => text.includes(norm(k)));
    if (posHit) {
      return { isMatch: true, matchedTarget: target, score: 90, reason: `Keyword-Match "${posHit}" → ${target}` };
    }
  }

  return {
    isMatch: false,
    matchedTarget: null,
    score: 0,
    reason: firstRejectReason || "Kein Keyword-Match mit Zielgruppen",
  };
}

// ─── Dynamische Nachbarorte via Google Places Geocoding ───────────────────────
// Sucht Städte/Orte im Umkreis des Hauptstandorts dynamisch über Google Places API
async function findNearbyCities(cityCoords, radiusKm, mainCity, apiCounters) {
  // Nur sinnvoll bei kleinem Radius (< 30 km) oder wenn keine Zielstädte gesetzt
  // Suche nach "Stadt" im Radius, um nahe Orte zu finden
  const searchRadius = Math.min(radiusKm * 1000, 50000);
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${cityCoords.lat},${cityCoords.lng}&radius=${searchRadius}&type=locality&language=de&key=${GOOGLE_PLACES_API_KEY}`;
  apiCounters.nearbySearch++;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results) return [];
    // Filtere den Hauptort heraus, nur nahe Orte mit eigenem Namen
    const mainNorm = mainCity.toLowerCase().trim();
    const cities = data.results
      .map(r => r.name)
      .filter(name => name && name.toLowerCase().trim() !== mainNorm)
      .slice(0, 4);
    return cities;
  } catch {
    return [];
  }
}

// ─── Haversine Distance ───────────────────────────────────────────────────────
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ─── Google Places: Text Search ───────────────────────────────────────────────
async function searchPlaces(query, cityCoords, radiusMeters, apiCounters) {
  const url = "https://maps.googleapis.com/maps/api/place/textsearch/json";
  const params = new URLSearchParams({
    query,
    location: `${cityCoords.lat},${cityCoords.lng}`,
    radius: String(radiusMeters),
    language: "de",
    key: GOOGLE_PLACES_API_KEY,
  });
  apiCounters.textSearch++;
  const res = await fetch(`${url}?${params}`);
  if (!res.ok) { console.warn(`[searchPlaces] HTTP ${res.status} for query: ${query}`); return []; }
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.warn(`[searchPlaces] API status: ${data.status} for query: ${query}`);
  }
  return data.results || [];
}

// ─── Google Places: Place Details ────────────────────────────────────────────
async function getPlaceDetails(placeId, apiCounters) {
  const url = "https://maps.googleapis.com/maps/api/place/details/json";
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "name,formatted_address,formatted_phone_number,website,geometry,address_components,types",
    language: "de",
    key: GOOGLE_PLACES_API_KEY,
  });
  apiCounters.placeDetailsEssentials++;
  const res = await fetch(`${url}?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== "OK") return null;
  return data.result || null;
}

// ─── Extract Address Components ───────────────────────────────────────────────
function extractAddressComponents(components = []) {
  let plz = "", ort = "", strasse = "", hausnummer = "";
  for (const c of components) {
    if (c.types.includes("postal_code")) plz = c.long_name;
    if (c.types.includes("locality")) ort = c.long_name;
    if (c.types.includes("route")) strasse = c.long_name;
    if (c.types.includes("street_number")) hausnummer = c.long_name;
  }
  return { plz, ort, adresse: [strasse, hausnummer].filter(Boolean).join(" ") };
}

// ─── Parallel-Run-Lock via OrganizationSettings ───────────────────────────────
const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 Minuten

async function acquireLeadResearchLock(base44, organization_id, user_email) {
  const existing = await base44.asServiceRole.entities.OrganizationSettings.filter({
    organization_id, key: 'lead_research_running'
  });
  const startedAtRec = await base44.asServiceRole.entities.OrganizationSettings.filter({
    organization_id, key: 'lead_research_started_at'
  });

  if (existing[0]?.value === 'true' && startedAtRec[0]?.value) {
    const age = Date.now() - new Date(startedAtRec[0].value).getTime();
    if (age < LOCK_TIMEOUT_MS) {
      const lockedByRec = await base44.asServiceRole.entities.OrganizationSettings.filter({
        organization_id, key: 'lead_research_locked_by'
      });
      return { acquired: false, lockedBy: lockedByRec[0]?.value || 'unbekannt', startedAt: startedAtRec[0].value };
    }
    console.warn(`[generateLeads] Stale lock gefunden (${Math.round(age/60000)}min alt) – wird überschrieben`);
  }

  const now = new Date().toISOString();
  const upsert = async (key, value) => {
    const rec = await base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id, key });
    if (rec[0]) await base44.asServiceRole.entities.OrganizationSettings.update(rec[0].id, { value });
    else await base44.asServiceRole.entities.OrganizationSettings.create({ organization_id, key, value });
  };
  await upsert('lead_research_running', 'true');
  await upsert('lead_research_started_at', now);
  await upsert('lead_research_locked_by', user_email);
  return { acquired: true };
}

async function releaseLeadResearchLock(base44, organization_id) {
  try {
    const rec = await base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id, key: 'lead_research_running' });
    if (rec[0]) await base44.asServiceRole.entities.OrganizationSettings.update(rec[0].id, { value: 'false' });
  } catch (e) {
    console.error('[generateLeads] Lock-Release fehlgeschlagen:', e.message);
  }
}

// ─── Period Month Helper ──────────────────────────────────────────────────────
function getPeriodMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ─── UsageLog upsert ──────────────────────────────────────────────────────────
async function upsertUsageLog(base44, organization_id, delta, lastReport) {
  const periodMonth = getPeriodMonth();
  const now = new Date().toISOString();
  const existing = await base44.asServiceRole.entities.UsageLog.filter({ organization_id, period_month: periodMonth });
  const skuBreakdownJson = JSON.stringify(delta.skuBreakdown);
  const reportJson = JSON.stringify(lastReport);

  if (existing && existing.length > 0) {
    const log = existing[0];
    await base44.asServiceRole.entities.UsageLog.update(log.id, {
      lead_generations_used: (log.lead_generations_used || 0) + delta.lead_generations_used,
      leads_created: (log.leads_created || 0) + delta.leads_created,
      google_geocoding_requests: (log.google_geocoding_requests || 0) + delta.geocoding,
      google_places_text_search_requests: (log.google_places_text_search_requests || 0) + delta.textSearch,
      google_places_nearby_search_requests: (log.google_places_nearby_search_requests || 0) + delta.nearbySearch,
      google_place_details_essentials_requests: (log.google_place_details_essentials_requests || 0) + delta.placeDetailsEssentials,
      google_place_details_pro_requests: (log.google_place_details_pro_requests || 0) + delta.placeDetailsPro,
      google_places_requests: (log.google_places_requests || 0) + delta.textSearch + delta.nearbySearch,
      place_details_requests: (log.place_details_requests || 0) + delta.placeDetailsEssentials + delta.placeDetailsPro,
      estimated_external_cost_cent: (log.estimated_external_cost_cent || 0) + delta.estimatedCostCent,
      google_sku_breakdown: skuBreakdownJson,
      last_lead_generation_at: now,
      last_lead_generation_report: reportJson,
    });
  } else {
    const periodStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
    const periodEnd = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0, 23, 59, 59)).toISOString();
    await base44.asServiceRole.entities.UsageLog.create({
      organization_id,
      period_month: periodMonth,
      period_start: periodStart,
      period_end: periodEnd,
      lead_generations_used: delta.lead_generations_used,
      leads_created: delta.leads_created,
      google_geocoding_requests: delta.geocoding,
      google_places_text_search_requests: delta.textSearch,
      google_places_nearby_search_requests: delta.nearbySearch,
      google_place_details_essentials_requests: delta.placeDetailsEssentials,
      google_place_details_pro_requests: delta.placeDetailsPro,
      google_places_requests: delta.textSearch + delta.nearbySearch,
      place_details_requests: delta.placeDetailsEssentials + delta.placeDetailsPro,
      estimated_external_cost_cent: delta.estimatedCostCent,
      google_sku_breakdown: skuBreakdownJson,
      last_lead_generation_at: now,
      last_lead_generation_report: reportJson,
    });
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  let _base44ForFinally = null;
  let _orgIdForFinally = null;
  let _lockAcquired = false;
  try {
    const base44 = createClientFromRequest(req);
    _base44ForFinally = base44;
    const body = await req.json();
    const { organization_id, target_count = 25 } = body;
    _orgIdForFinally = organization_id;

    if (!organization_id) return Response.json({ error: 'organization_id ist Pflichtparameter' }, { status: 400 });

    const access = await checkAccess(req, { organization_id, action: 'generate_leads' });
    if (!access.allowed) {
      console.warn(`[generateLeads] Access denied: ${access.reason}`);
      const statusCode = access.reason === 'organization_suspended' ? 403 : 403;
      return Response.json({ error: access.message, success: false, reason: access.reason }, { status: statusCode });
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return Response.json({ error: 'GOOGLE_PLACES_API_KEY nicht konfiguriert', success: false }, { status: 500 });
    }

    // Organisation & Billing
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    const org = orgs[0];
    if (!org) return Response.json({ error: 'Organization not found', success: false }, { status: 404 });

    const billingOk = ['active', 'trialing'].includes(org.billing_status);
    if (!billingOk) {
      return Response.json({ error: `Billing status "${org.billing_status}" erlaubt keine Lead-Recherche`, success: false }, { status: 402 });
    }

    // Plan-Limits
    let planLimits = { max_lead_generations_per_month: 100, max_leads_per_month: 300 };
    if (org.plan_id) {
      const plans = await base44.asServiceRole.entities.Plan.filter({ id: org.plan_id });
      if (plans[0]) {
        planLimits = {
          max_lead_generations_per_month: plans[0].max_lead_generations_per_month ?? 100,
          max_leads_per_month: plans[0].max_leads_per_month ?? 300,
        };
      }
    }

    // Aktueller Monats-UsageLog
    const periodMonth = getPeriodMonth();
    const existingUsage = await base44.asServiceRole.entities.UsageLog.filter({ organization_id, period_month: periodMonth });
    const currentUsage = existingUsage[0] || { lead_generations_used: 0, leads_created: 0 };

    // Plan-Limit: Recherche-Läufe
    const maxRuns = planLimits.max_lead_generations_per_month;
    if (maxRuns !== -1 && (currentUsage.lead_generations_used || 0) >= maxRuns) {
      return Response.json({
        error: `Recherche-Limit erreicht: ${currentUsage.lead_generations_used}/${maxRuns} Läufe diesen Monat.`,
        success: false, limitReached: true,
      }, { status: 403 });
    }

    // Plan-Limit: Leads gesamt
    const maxLeads = planLimits.max_leads_per_month;
    const usedLeads = currentUsage.leads_created || 0;
    let effectiveTarget = target_count;
    if (maxLeads !== -1) {
      const remaining = Math.max(0, maxLeads - usedLeads);
      if (remaining === 0) {
        return Response.json({
          error: `Lead-Limit erreicht: ${usedLeads}/${maxLeads} Leads diesen Monat.`,
          success: false, limitReached: true,
        }, { status: 403 });
      }
      effectiveTarget = Math.min(target_count, remaining);
    }

    // Settings laden
    const settingsRecords = await base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id });
    const settings = {};
    settingsRecords.forEach(s => { settings[s.key] = s.value; });

    // Canonical Key: target_customer_types — Legacy-Fallback: zielkunden
    const targetCustomers = (settings.target_customer_types || settings.zielkunden || "")
      .split(", ").filter(x => x.trim());

    if (targetCustomers.length === 0) {
      return Response.json({ error: 'Keine Zielkunden definiert.', success: false }, { status: 400 });
    }

    // Explizite User-Ausschlüsse — Canonical Key: excluded_customer_types
    // Legacy-Keys: zielkunden_ausschluss, custom_excluded_customer_types
    const excludedRaw = settings.excluded_customer_types
      || settings.zielkunden_ausschluss
      || settings.custom_excluded_customer_types
      || "";
    const excludedTargets = excludedRaw.split(", ").filter(x => x.trim());

    const city = settings.service_area_city || settings.lead_plz_city || settings.lead_plz || "";
    if (!city) return Response.json({ error: 'Kein Suchgebiet definiert. Bitte Ort in den Einstellungen hinterlegen.', success: false }, { status: 400 });

    const radiusKm = parseFloat(settings.lead_radius_km || settings.service_area_radius_km || "25") || 25;
    const radiusMeters = Math.min(radiusKm * 1000, 50000);

    const apiCounters = { geocoding: 0, textSearch: 0, nearbySearch: 0, placeDetailsEssentials: 0, placeDetailsPro: 0 };

    // Stadt-Koordinaten (Geocode mit PLZ+Stadt für bessere Treffer)
    const cityQuery = city + " Deutschland";
    const refUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(cityQuery)}&key=${GOOGLE_PLACES_API_KEY}&language=de`;
    apiCounters.textSearch++;
    const refRes = await fetch(refUrl);
    const refData = await refRes.json();
    let cityCoords = null;
    if (refData.results?.[0]?.geometry?.location) {
      cityCoords = { lat: refData.results[0].geometry.location.lat, lng: refData.results[0].geometry.location.lng };
    }
    if (!cityCoords) return Response.json({ error: `Stadt "${city}" nicht gefunden.`, success: false }, { status: 400 });

    // Wenn PLZ als Stadt gesetzt ist → Koordinaten aus gespeicherten Settings bevorzugen
    const savedLat = parseFloat(settings.lead_lat || "0");
    const savedLng = parseFloat(settings.lead_lng || "0");
    if (savedLat && savedLng && /^\d{5}$/.test(city)) {
      cityCoords = { lat: savedLat, lng: savedLng };
    }

    // Zielstädte aus Settings laden (manuell vom User gesetzt)
    const targetLocations = (settings.target_locations || "")
      .split(",").map(s => s.trim()).filter(Boolean);

    // Dynamische Nachbarorte via Google Places (nur wenn kein Zielstädte gesetzt und Radius < 50km)
    let nearbyCities = [];
    if (targetLocations.length === 0 && radiusKm <= 50) {
      nearbyCities = await findNearbyCities(cityCoords, radiusKm, city, apiCounters);
    }

    // Suchstädte: Hauptort + manuelle Zielstädte + ggf. dynamische Nachbarorte
    const allSearchCities = [
      city,
      ...targetLocations,
      ...nearbyCities.slice(0, 2), // max 2 dynamische Nachbarorte
    ].filter((v, i, arr) => arr.indexOf(v) === i); // Deduplizierung

    // ── Parallel-Lock setzen ────────────────────────────────────────────────
    const lockResult = await acquireLeadResearchLock(base44, organization_id, access.user.email);
    if (lockResult.acquired) _lockAcquired = true;
    if (!lockResult.acquired) {
      console.warn(`[generateLeads] Parallel-Lock aktiv für org=${organization_id}, gestartet von ${lockResult.lockedBy} um ${lockResult.startedAt}`);
      return Response.json({
        error: `Es läuft bereits eine Recherche für diese Organisation (gestartet ${new Date(lockResult.startedAt).toLocaleTimeString('de-DE')} von ${lockResult.lockedBy}). Bitte warten Sie kurz.`,
        success: false, parallelLockActive: true,
      }, { status: 429 });
    }

    console.info(`[generateLeads] START org=${organization_id}, Stadt=${city}, Zielstädte=${targetLocations.join("|")||"–"}, NachbarnDynamisch=${nearbyCities.join("|")||"–"}, AlleSuchstädte=${allSearchCities.join("|")}, Zielkunden=${targetCustomers.join("|")}${excludedTargets.length ? `, Ausschlüsse=${excludedTargets.join("|")}` : ""}, Radius=${radiusKm}km, effectiveTarget=${effectiveTarget}`);

    // Existierende Firmen für Duplikat-Check
    const existing = await base44.asServiceRole.entities.Company.filter({ organization_id });
    const existingNames = new Set(existing.map(c => c.name?.toLowerCase()));

    // Suchanfragen generieren – für jede Stadt + alle Varianten
    const searchQueryList = [];
    const seenQueries = new Set();
    for (const searchCity of allSearchCities) {
      for (const type of targetCustomers) {
        const variants = SEARCH_VARIANTS[type] || [type];
        for (const variant of variants) {
          const q = `${variant} ${searchCity}`;
          if (!seenQueries.has(q)) { seenQueries.add(q); searchQueryList.push({ query: q, type }); }
        }
      }
    }
    // ── Max-Query-Limit (Kostenschutz) ──────────────────────────────────────
    const MAX_SEARCH_QUERIES_PER_RUN = 40;
    const MAX_PLACE_DETAILS_PER_RUN = 80;
    let queriesLimited = false;
    if (searchQueryList.length > MAX_SEARCH_QUERIES_PER_RUN) {
      console.warn(`[generateLeads] Query-Limit: ${searchQueryList.length} Anfragen → auf ${MAX_SEARCH_QUERIES_PER_RUN} begrenzt`);
      searchQueryList.splice(MAX_SEARCH_QUERIES_PER_RUN);
      queriesLimited = true;
    }
    console.info(`[generateLeads] ${searchQueryList.length} Suchanfragen für ${allSearchCities.join(", ")}${queriesLimited ? " (begrenzt)" : ""}`);

    // Counters
    const createdIds = [];
    let raw_hits = 0;
    let skipped_outside_radius = 0;
    let skipped_duplicate = 0;
    let skipped_no_match = 0;
    let skipped_ambiguous = 0;
    const skipped_no_match_examples = [];
    const skipped_outside_radius_examples = [];
    const skipped_ambiguous_examples = [];
    const savedExamples = []; // für Report: {name, city, distance_km}
    let maxSavedDistanceKm = 0;
    const seenPlaceIds = new Set();

    // Suchlauf
    for (const { query, type } of searchQueryList) {
      if (createdIds.length >= effectiveTarget) break;

      const places = await searchPlaces(query, cityCoords, radiusMeters, apiCounters);
      raw_hits += places.length;
      console.info(`[generateLeads] Query="${query}" → ${places.length} Treffer`);

      for (const place of places) {
        if (createdIds.length >= effectiveTarget) break;
        if (seenPlaceIds.has(place.place_id)) continue;
        seenPlaceIds.add(place.place_id);

        // ─── HARTE DISTANZPRÜFUNG (eigene Haversine, nicht Google-Radius!) ──────
        const placeLat = place.geometry?.location?.lat;
        const placeLng = place.geometry?.location?.lng;
        let distanceKm = null;
        if (placeLat && placeLng) {
          distanceKm = calculateDistance(cityCoords.lat, cityCoords.lng, placeLat, placeLng);
          if (distanceKm > radiusKm) {
            skipped_outside_radius++;
            if (skipped_outside_radius_examples.length < 10) {
              skipped_outside_radius_examples.push({ name: place.name, city: place.vicinity || "", distance_km: Math.round(distanceKm * 10) / 10, reason: "outside radius" });
            }
            console.info(`[generateLeads] SKIP_RADIUS "${place.name}" – ${Math.round(distanceKm * 10) / 10}km > ${radiusKm}km`);
            continue;
          }
        }

        const placeName = place.name || "";

        // Duplikat-Check
        if (existingNames.has(placeName.toLowerCase())) { skipped_duplicate++; continue; }

        // ─── HARTE RELEVANZPRÜFUNG ────────────────────────────────────────
        // Wichtig: TextSearch-Ergebnisse haben editorial_summary oft NICHT.
        // Daher nutzen wir auch den Google type "property_management_company"
        // der durch translateGoogleTypes zu "hausverwaltung immobilienverwaltung" wird.
        const relevance = validateLeadForTarget({
          place,
          targetCustomerTypes: targetCustomers,
          excludedTargetTypes: excludedTargets,
        });
        console.info(`[generateLeads] VALIDATE "${place.name}" types=${JSON.stringify(place.types)} → isMatch=${relevance.isMatch} reason="${relevance.reason}"`);

        if (!relevance.isMatch) {
          if (relevance.reason === "ambiguous_verwaltung_no_real_estate_context") {
            skipped_ambiguous++;
            if (skipped_ambiguous_examples.length < 15) {
              skipped_ambiguous_examples.push({ name: placeName, reason: "Unklarer Verwaltungsbezug – kein Immobilien-/WEG-/Mietkontext erkennbar", query });
            }
          } else {
            skipped_no_match++;
            if (skipped_no_match_examples.length < 10) {
              skipped_no_match_examples.push({ name: placeName, reason: relevance.reason, query });
            }
          }
          console.info(`[generateLeads] SKIP "${placeName}" – ${relevance.reason}`);
          continue;
        }

        // Place Details (kostenpflichtig – erst nach Relevanzprüfung + Limit-Check!)
        if (apiCounters.placeDetailsEssentials >= MAX_PLACE_DETAILS_PER_RUN) {
          console.warn(`[generateLeads] Place-Details-Limit (${MAX_PLACE_DETAILS_PER_RUN}) erreicht – Lauf beendet`);
          break;
        }
        const details = await getPlaceDetails(place.place_id, apiCounters);
        const { plz, ort, adresse } = extractAddressComponents(details?.address_components || []);
        const phone = details?.formatted_phone_number || "";
        const website = details?.website || "";
        const lat = details?.geometry?.location?.lat || placeLat;
        const lng = details?.geometry?.location?.lng || placeLng;

        // Speichern – nur wenn Distanzprüfung bestanden!
        const roundedDist = distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null;
        const company = await base44.asServiceRole.entities.Company.create({
          organization_id,
          name: placeName,
          branche: relevance.matchedTarget || type,
          ort: ort || city,
          plz: plz || "",
          adresse: adresse || "",
          telefon: phone,
          email: "",
          website,
          latitude: lat || null,
          longitude: lng || null,
          quelle: "Google Places API",
          status: "Neu",
          is_hot: false,
          matched_target_customer_type: relevance.matchedTarget,
          relevance_score: relevance.score,
          relevance_reason: relevance.reason,
          source_query: query,
          distance_km: roundedDist,
          search_center_city: city,
          search_center_lat: cityCoords.lat,
          search_center_lng: cityCoords.lng,
          search_radius_km: radiusKm,
        });

        createdIds.push(company.id);
        existingNames.add(placeName.toLowerCase());
        if (roundedDist !== null && roundedDist > maxSavedDistanceKm) maxSavedDistanceKm = roundedDist;
        if (savedExamples.length < 10) {
          savedExamples.push({ name: placeName, city: ort || city, distance_km: roundedDist });
        }
        console.info(`[generateLeads] SAVED "${placeName}" (${relevance.matchedTarget}, Score=${relevance.score}, dist=${roundedDist}km)`);
      }
    }

    // Kosten berechnen
    const skuBreakdown = {
      places_text_search_pro: {
        requests: apiCounters.textSearch,
        estimated_cost_cent: skuCostCent('places_text_search_pro', apiCounters.textSearch),
      },
      place_details_essentials: {
        requests: apiCounters.placeDetailsEssentials,
        estimated_cost_cent: skuCostCent('place_details_essentials', apiCounters.placeDetailsEssentials),
      },
    };
    const estimatedCostCent = Object.values(skuBreakdown).reduce((sum, s) => sum + s.estimated_cost_cent, 0);

    // ─── Lauf-Typ bestimmen (für Credits & UI-Meldung) ────────────────────────
     const newLeadsSaved = createdIds.length;
     let runType = "new_leads"; // new_leads | duplicate_only | no_match | zero_result
     if (newLeadsSaved === 0) {
       if (skipped_duplicate > 0 && skipped_no_match === 0 && skipped_ambiguous === 0 && skipped_outside_radius === 0) {
         runType = "duplicate_only";
       } else if (raw_hits === 0) {
         runType = "zero_result";
       } else {
         runType = "no_match";
       }
     }

    // Credits nur verbrauchen wenn neue Leads gespeichert wurden
    const chargedLeadGeneration = newLeadsSaved > 0;
    const chargedLeads = newLeadsSaved;

    // UsageLog schreiben
    const usageDelta = {
      lead_generations_used: chargedLeadGeneration ? 1 : 0,
      leads_created: chargedLeads,
      geocoding: apiCounters.geocoding,
      textSearch: apiCounters.textSearch,
      nearbySearch: apiCounters.nearbySearch,
      placeDetailsEssentials: apiCounters.placeDetailsEssentials,
      placeDetailsPro: apiCounters.placeDetailsPro,
      estimatedCostCent,
      skuBreakdown,
    };

    const lastReport = {
      requestedTarget: target_count, effectiveTarget, saved: newLeadsSaved,
      duplicates: skipped_duplicate, noMatch: skipped_no_match,
      ambiguous: skipped_ambiguous, ambiguousExamples: skipped_ambiguous_examples,
      outsideRadius: skipped_outside_radius, rawHits: raw_hits,
      noMatchExamples: skipped_no_match_examples,
      outsideRadiusExamples: skipped_outside_radius_examples,
      savedExamples,
      maxSavedDistanceKm,
      radiusKm,
      searchCenterCity: city,
      targetLocations,
      nearbyCitiesDynamic: nearbyCities,
      searchCities: allSearchCities,
      estimatedCostCent, skuBreakdown,
      searchQueries: searchQueryList.map(q => q.query),
      chargedLeadGeneration,
      runType,
      timestamp: new Date().toISOString(),
    };

    // ResearchRun speichern
    let research_run_id = null;
    try {
      const researchRun = await base44.asServiceRole.entities.ResearchRun.create({
        organization_id,
        run_type: runType,
        requested_target: target_count,
        leads_saved: newLeadsSaved,
        duplicates_skipped: skipped_duplicate,
        no_match_count: skipped_no_match,
        outside_radius_count: skipped_outside_radius,
        raw_hits,
        search_center_city: city,
        search_radius_km: radiusKm,
        target_customer_types: targetCustomers.join(", "),
        excluded_customer_types: excludedTargets.join(", "),
        summary: JSON.stringify(lastReport),
        charged_lead_generation: chargedLeadGeneration,
        created_by: access.user.email,
      });
      research_run_id = researchRun.id;
      console.info(`[generateLeads] ResearchRun erstellt: ${research_run_id}`);
    } catch (runErr) {
      console.error(`[generateLeads] ResearchRun FEHLER: ${runErr.message}`);
    }

    // research_run_id zu Leads hinzufügen (nachträglich)
    if (research_run_id) {
      try {
        const saveCompaniesBatch = [];
        for (const cId of createdIds) {
          const upd = base44.asServiceRole.entities.Company.update(cId, { research_run_id });
          saveCompaniesBatch.push(upd);
        }
        await Promise.all(saveCompaniesBatch);
        console.info(`[generateLeads] research_run_id zu ${createdIds.length} Companies gespeichert`);
      } catch (updateErr) {
        console.warn(`[generateLeads] research_run_id Update FEHLER: ${updateErr.message}`);
      }
    }

    try {
      await upsertUsageLog(base44, organization_id, usageDelta, lastReport);
      console.info(`[generateLeads] UsageLog: chargedRun=${chargedLeadGeneration}, +${chargedLeads} Leads, runType=${runType}`);
    } catch (usageErr) {
      console.error(`[generateLeads] UsageLog FEHLER: ${usageErr.message}`);
    }

    console.info(`[generateLeads] REPORT org=${organization_id}: raw=${raw_hits}, outside_radius=${skipped_outside_radius}, no_match=${skipped_no_match}, duplicate=${skipped_duplicate}, created=${newLeadsSaved}, runType=${runType}${queriesLimited ? " [QUERY-LIMIT AKTIV]" : ""}`);
    console.info(`[generateLeads] API calls: textSearch=${apiCounters.textSearch}, placeDetails=${apiCounters.placeDetailsEssentials}`);
    console.info(`[generateLeads] Kosten: ~${estimatedCostCent.toFixed(2)} Cent`);

    return Response.json({
       success: true,
       requestedTarget: target_count,
       effectiveTarget,
       count: newLeadsSaved,
       chargedLeadGeneration,
       runType,
       research_run_id,
       queriesLimited,
       summary: {
        raw_hits,
        saved: newLeadsSaved,
        duplicates: skipped_duplicate,
        excluded: 0,
        noMatch: skipped_no_match,
        noMatchExamples: skipped_no_match_examples,
        ambiguous: skipped_ambiguous,
        ambiguousExamples: skipped_ambiguous_examples,
        outsideRadius: skipped_outside_radius,
        outsideRadiusExamples: skipped_outside_radius_examples,
        savedExamples,
        maxSavedDistanceKm,
        radiusKm,
        searchCenterCity: city,
        targetLocations,
        nearbyCitiesDynamic: nearbyCities,
        searchCities: allSearchCities,
      },
      googleRequests: {
        geocoding: apiCounters.geocoding,
        textSearch: apiCounters.textSearch,
        placeDetailsEssentials: apiCounters.placeDetailsEssentials,
      },
      usage: {
        lead_generations_used: chargedLeadGeneration ? 1 : 0,
        leads_created: chargedLeads,
        estimated_external_cost_cent: estimatedCostCent,
      },
      search_queries: searchQueryList.map(q => q.query),
      details: `${raw_hits} Roh-Treffer, ${skipped_outside_radius} außerhalb Radius, ${skipped_no_match} nicht passend, ${skipped_ambiguous} unklare Verwaltungstreffer, ${skipped_duplicate} Dubletten, ${newLeadsSaved} gespeichert. Credits verbraucht: ${chargedLeadGeneration ? "ja" : "nein"} (runType: ${runType})${queriesLimited ? " Suchanfragen wurden zur Kostenkontrolle begrenzt." : ""}`,
    });

  } catch (error) {
    console.error('[generateLeads] Error:', error.message, error.stack);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  } finally {
    // Lock immer freigeben – auch bei Fehlern oder Timeouts
    if (_lockAcquired && _base44ForFinally && _orgIdForFinally) {
      await releaseLeadResearchLock(_base44ForFinally, _orgIdForFinally);
    }
  }
});