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

// ─── Harte Relevanzprüfung ────────────────────────────────────────────────────
// Logik: Pro Zielgruppe separat prüfen.
// 1. Positive Keywords einer Zielgruppe matchen → Lead wird für DIESE Zielgruppe gespeichert.
// 2. Negative Keywords einer Zielgruppe disqualifizieren nur DIESE Zielgruppe, nicht andere.
// 3. Explizite User-Ausschlüsse (excludedTargets) blockieren immer, auch bei Positiv-Match.
// 4. Wenn kein Positiv-Match → abgelehnt (mit Begründung aus erster Negativregel).
function validateLeadForTarget({ place, targetCustomerTypes, excludedTargetTypes = [] }) {
  const translatedTypes = translateGoogleTypes(place.types || []);
  // Auch Google-Types direkt als Rohtext einbeziehen (z.B. "property_management_company")
  const rawTypes = (place.types || []).join(" ");
  const text = norm([
    place.name,
    translatedTypes,
    rawTypes,
    place.editorial_summary?.overview,
    place.formatted_address,
    place.vicinity,
  ].join(" "));

  let firstRejectReason = null;

  for (const target of targetCustomerTypes) {
    // User-Ausschluss hat immer Vorrang
    if (excludedTargetTypes.includes(target)) continue;

    const rule = TARGET_RULES[target];

    if (!rule) {
      // Kein Regelwerk → Fallback auf SEARCH_VARIANTS
      const variants = SEARCH_VARIANTS[target] || [target];
      const matched = variants.find(v => text.includes(norm(v)));
      if (matched) {
        return { isMatch: true, matchedTarget: target, score: 70, reason: `Suchbegriff-Match "${matched}"` };
      }
      continue;
    }

    // Sonderregel: Immobilienmakler ohne Verwaltungsbezug → für DIESE Zielgruppe disqualifiziert
    if (rule.specialRules?.includes("immobilienmakler_ohne_verwaltung")) {
      if (text.includes("immobilienmakler") && !text.includes("verwaltung")) {
        if (!firstRejectReason) firstRejectReason = `Immobilienmakler ohne Verwaltungsbezug (${target})`;
        continue;
      }
    }

    // Negativkeywords disqualifizieren nur DIESE Zielgruppe
    const negHit = rule.negativeKeywords.find(k => text.includes(norm(k)));
    if (negHit) {
      if (!firstRejectReason) firstRejectReason = `Negativbegriff "${negHit}" für ${target}`;
      continue; // diese Zielgruppe übersprungen, nächste prüfen
    }

    // Positiv-Match → Lead für genau diese Zielgruppe speichern
    const posHit = rule.positiveKeywords.find(k => text.includes(norm(k)));
    if (posHit) {
      return { isMatch: true, matchedTarget: target, score: 90, reason: `Keyword-Match "${posHit}" → ${target}` };
    }

    // Kombinations-Match: Verwaltungs-Firmen im Namen → Hausverwaltung
    if (target === "Hausverwaltungen") {
      const nameNorm = norm(place.name || "");
      if ((nameNorm.includes("immobilien") && nameNorm.includes("verwaltung")) ||
          (nameNorm.includes("haus") && nameNorm.includes("verwaltung")) ||
          (nameNorm.includes("wohn") && nameNorm.includes("verwaltung")) ||
          (nameNorm.includes("objekt") && nameNorm.includes("verwaltung")) ||
          // Firmen mit "verwaltung" + Firmensuffix (z.B. "S & S Verwaltung GmbH", "SN.Verwaltung GmbH")
          (nameNorm.includes("verwaltung") && (nameNorm.includes("gmbh") || nameNorm.includes(" ag") || nameNorm.includes("kg") || nameNorm.includes("ug") || nameNorm.includes("ohg") || nameNorm.endsWith("verwaltung")))) {
        return { isMatch: true, matchedTarget: target, score: 80, reason: `Kombi-Match Verwaltungs-Firma → ${target}` };
      }
    }
  }

  // Kein Positiv-Match in irgendeiner Zielgruppe
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
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { organization_id, target_count = 25 } = body;

    if (!organization_id) return Response.json({ error: 'organization_id ist Pflichtparameter' }, { status: 400 });

    const access = await checkAccess(req, { organization_id, action: 'generate_leads' });
    if (!access.allowed) {
      console.warn(`[generateLeads] Access denied: ${access.reason}`);
      return Response.json({ error: access.message, success: false }, { status: 403 });
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

    const targetCustomers = (settings.zielkunden || settings.target_customer_types || "")
      .split(", ").filter(x => x.trim());

    if (targetCustomers.length === 0) {
      return Response.json({ error: 'Keine Zielkunden definiert.', success: false }, { status: 400 });
    }

    // Explizite User-Ausschlüsse (aus Einstellungen, z.B. "ausschlüsse: Kanzleien, Banken")
    const excludedTargets = (settings.zielkunden_ausschluss || "")
      .split(", ").filter(x => x.trim());

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
    console.info(`[generateLeads] ${searchQueryList.length} Suchanfragen für ${allSearchCities.join(", ")}`);

    // Counters
    const createdIds = [];
    let raw_hits = 0;
    let skipped_outside_radius = 0;
    let skipped_duplicate = 0;
    let skipped_no_match = 0;
    const skipped_no_match_examples = [];
    const skipped_outside_radius_examples = [];
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
          skipped_no_match++;
          if (skipped_no_match_examples.length < 10) {
            skipped_no_match_examples.push({ name: placeName, reason: relevance.reason, query });
          }
          console.info(`[generateLeads] SKIP "${placeName}" – ${relevance.reason}`);
          continue;
        }

        // Place Details (kostenpflichtig – erst nach Relevanzprüfung!)
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

    // UsageLog schreiben
    const usageDelta = {
      lead_generations_used: 1,
      leads_created: createdIds.length,
      geocoding: apiCounters.geocoding,
      textSearch: apiCounters.textSearch,
      nearbySearch: apiCounters.nearbySearch,
      placeDetailsEssentials: apiCounters.placeDetailsEssentials,
      placeDetailsPro: apiCounters.placeDetailsPro,
      estimatedCostCent,
      skuBreakdown,
    };

    const lastReport = {
      requestedTarget: target_count, effectiveTarget, saved: createdIds.length,
      duplicates: skipped_duplicate, noMatch: skipped_no_match,
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
      timestamp: new Date().toISOString(),
    };

    try {
      await upsertUsageLog(base44, organization_id, usageDelta, lastReport);
      console.info(`[generateLeads] UsageLog aktualisiert: +1 Lauf, +${createdIds.length} Leads`);
    } catch (usageErr) {
      console.error(`[generateLeads] UsageLog FEHLER: ${usageErr.message}`);
    }

    console.info(`[generateLeads] REPORT org=${organization_id}: raw=${raw_hits}, outside_radius=${skipped_outside_radius}, no_match=${skipped_no_match}, duplicate=${skipped_duplicate}, created=${createdIds.length}`);
    console.info(`[generateLeads] API calls: textSearch=${apiCounters.textSearch}, placeDetails=${apiCounters.placeDetailsEssentials}`);
    console.info(`[generateLeads] Kosten: ~${estimatedCostCent.toFixed(2)} Cent`);

    return Response.json({
      success: true,
      requestedTarget: target_count,
      effectiveTarget,
      count: createdIds.length,
      summary: {
        raw_hits,
        saved: createdIds.length,
        duplicates: skipped_duplicate,
        excluded: 0,
        noMatch: skipped_no_match,
        noMatchExamples: skipped_no_match_examples,
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
        lead_generations_used: 1,
        leads_created: createdIds.length,
        estimated_external_cost_cent: estimatedCostCent,
      },
      search_queries: searchQueryList.map(q => q.query),
      details: `${raw_hits} Roh-Treffer, ${skipped_outside_radius} außerhalb Radius, ${skipped_no_match} nicht passend, ${skipped_duplicate} Dubletten, ${createdIds.length} gespeichert.`,
    });

  } catch (error) {
    console.error('[generateLeads] Error:', error.message, error.stack);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});