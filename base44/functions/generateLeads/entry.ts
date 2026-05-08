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

// USD → Cent
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

// ─── Search Variants ──────────────────────────────────────────────────────────
const SEARCH_VARIANTS = {
  "Hausverwaltungen": ["Hausverwaltung", "Immobilienverwaltung", "WEG Verwaltung"],
  "Bürogebäude": ["Bürogebäude", "Gewerbepark", "Business Center"],
  "Arztpraxen": ["Arztpraxis", "Zahnarztpraxis", "Medizinisches Versorgungszentrum"],
  "Autohäuser": ["Autohaus", "Autohandel", "Autohändler"],
  "Möbelhäuser": ["Möbelhaus", "Möbelhandel", "Küchenstudio"],
  "Hotels": ["Hotel", "Gasthof", "Pension"],
  "Restaurants": ["Restaurant", "Gastronomie"],
  "Fitnessstudios": ["Fitnessstudio", "Gym"],
  "Apotheken": ["Apotheke"],
  "Kanzleien": ["Anwaltskanzlei", "Rechtsanwalt"],
  "Steuerkanzleien": ["Steuerberater", "Steuerberatung"],
  "Handwerksbetriebe": ["Handwerksbetrieb", "Handwerker"],
  "Bauunternehmen": ["Bauunternehmen", "Baufirma"],
  "Großhändler": ["Großhandel", "Großhändler"],
  "Pflegeheime": ["Pflegeheim", "Altenheim", "Seniorenheim"],
  "Schulen": ["Schule", "Gymnasium"],
  "Kitas": ["Kita", "Kindergarten"],
  "Supermärkte": ["Supermarkt", "Lebensmittelmarkt"],
  "Logistikzentren": ["Logistik", "Logistikzentrum"],
  "Gebäudereinigung": ["Gebäudereinigung", "Reinigungsunternehmen", "Reinigungsfirma"],
};

const EXCLUDED_KEYWORDS = {
  "Keine Steuerberater": ["steuerberater", "steuerkanzlei"],
  "Keine IT-Firmen": ["it-", "software", "informatik"],
  "Keine Restaurants": ["restaurant", "gastro"],
  "Keine Ärzte": ["arzt", "zahnarzt", "medizin"],
};

function matchesTargetCustomer(name, branche, types) {
  const s = `${(name || "").toLowerCase()} ${(branche || "").toLowerCase()}`;
  for (const type of types) {
    const variants = SEARCH_VARIANTS[type] || [type.toLowerCase()];
    for (const v of variants) {
      if (s.includes(v.toLowerCase())) return type;
    }
  }
  return null;
}

function matchesExcluded(name, branche, excludedTypes) {
  const s = `${(name || "").toLowerCase()} ${(branche || "").toLowerCase()}`;
  for (const type of excludedTypes) {
    const keywords = EXCLUDED_KEYWORDS[type] || [type.toLowerCase()];
    for (const kw of keywords) {
      if (s.includes(kw.toLowerCase())) return type;
    }
  }
  return null;
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
  if (!res.ok) {
    console.warn(`[searchPlaces] HTTP ${res.status} for query: ${query}`);
    return [];
  }
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.warn(`[searchPlaces] API status: ${data.status} for query: ${query}`);
  }
  return data.results || [];
}

// ─── Google Places: Place Details (Essentials) ────────────────────────────────
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

// ─── UsageLog: upsert für den aktuellen Monat ─────────────────────────────────
async function upsertUsageLog(base44, organization_id, delta, lastReport) {
  const periodMonth = getPeriodMonth();
  const now = new Date().toISOString();

  // Suche existierenden Log für diesen Monat
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
    // Neue Periode erstellen
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

    // ─── Organisation & Billing laden ─────────────────────────────────────
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    const org = orgs[0];
    if (!org) return Response.json({ error: 'Organization not found', success: false }, { status: 404 });

    const billingOk = ['active', 'trialing'].includes(org.billing_status);
    if (!billingOk) {
      return Response.json({ error: `Billing status "${org.billing_status}" erlaubt keine Lead-Recherche`, success: false }, { status: 402 });
    }

    // ─── Plan-Limits laden ────────────────────────────────────────────────
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

    // ─── Aktueller Monats-UsageLog laden ──────────────────────────────────
    const periodMonth = getPeriodMonth();
    const existingUsage = await base44.asServiceRole.entities.UsageLog.filter({ organization_id, period_month: periodMonth });
    const currentUsage = existingUsage[0] || { lead_generations_used: 0, leads_created: 0 };

    // ─── Plan-Limit-Prüfung: Recherche-Läufe ─────────────────────────────
    const maxRuns = planLimits.max_lead_generations_per_month;
    if (maxRuns !== -1 && (currentUsage.lead_generations_used || 0) >= maxRuns) {
      console.warn(`[generateLeads] Limit erreicht: ${currentUsage.lead_generations_used}/${maxRuns} Läufe`);
      return Response.json({
        error: `Recherche-Limit erreicht: ${currentUsage.lead_generations_used}/${maxRuns} Läufe diesen Monat verbraucht.`,
        success: false,
        limitReached: true,
        usage: { lead_generations_used: currentUsage.lead_generations_used, limit: maxRuns },
      }, { status: 403 });
    }

    // ─── Plan-Limit-Prüfung: Leads gesamt ────────────────────────────────
    const maxLeads = planLimits.max_leads_per_month;
    const usedLeads = currentUsage.leads_created || 0;
    let effectiveTarget = target_count;

    if (maxLeads !== -1) {
      const remainingLeadCredits = Math.max(0, maxLeads - usedLeads);
      if (remainingLeadCredits === 0) {
        return Response.json({
          error: `Lead-Limit erreicht: ${usedLeads}/${maxLeads} Leads diesen Monat gespeichert.`,
          success: false,
          limitReached: true,
          usage: { leads_created: usedLeads, limit: maxLeads },
        }, { status: 403 });
      }
      effectiveTarget = Math.min(target_count, remainingLeadCredits);
      if (effectiveTarget < target_count) {
        console.info(`[generateLeads] effectiveTarget reduziert: ${target_count} → ${effectiveTarget} (Budget: ${remainingLeadCredits})`);
      }
    }

    // ─── Settings laden ───────────────────────────────────────────────────
    const settingsRecords = await base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id });
    const settings = {};
    settingsRecords.forEach(s => { settings[s.key] = s.value; });

    // Keys: "zielkunden" (CompanySettings), fallback auf alte Keys
    const targetCustomers = (
      settings.zielkunden ||
      settings.target_customer_types ||
      ""
    ).split(", ").filter(x => x.trim());

    if (targetCustomers.length === 0) {
      return Response.json({ error: 'Keine Zielkunden definiert. Bitte in den Einstellungen konfigurieren.', success: false }, { status: 400 });
    }

    const excluded = (
      settings.excluded_customer_types || ""
    ).split(", ").filter(x => x.trim());

    // city: "lead_plz_city" (CompanySettings), fallback auf alte Keys
    const city = settings.lead_plz_city || settings.service_area_city || settings.lead_plz || "";
    if (!city) return Response.json({ error: 'Kein Suchgebiet (Ort/PLZ) definiert. Bitte in den Einstellungen konfigurieren.', success: false }, { status: 400 });

    // radius: "lead_radius_km" (CompanySettings), fallback auf alte Keys
    const radiusKm = parseFloat(settings.lead_radius_km || settings.service_area_radius_km || "25") || 25;
    const radiusMeters = Math.min(radiusKm * 1000, 50000);

    // ─── API-Counter-Objekt (wird für alle Calls weitergegeben) ──────────
    const apiCounters = {
      geocoding: 0,
      textSearch: 0,
      nearbySearch: 0,
      placeDetailsEssentials: 0,
      placeDetailsPro: 0,
    };

    // ─── Stadt-Koordinaten ermitteln (Text Search als Geocoder) ──────────
    const refUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(city + " Deutschland")}&key=${GOOGLE_PLACES_API_KEY}&language=de`;
    apiCounters.textSearch++;
    const refRes = await fetch(refUrl);
    const refData = await refRes.json();

    let cityCoords = null;
    if (refData.results?.[0]?.geometry?.location) {
      cityCoords = {
        lat: refData.results[0].geometry.location.lat,
        lng: refData.results[0].geometry.location.lng,
      };
    }
    if (!cityCoords) {
      return Response.json({ error: `Stadt "${city}" konnte nicht gefunden werden.`, success: false }, { status: 400 });
    }
    console.info(`[generateLeads] Stadt=${city}, Coords=${cityCoords.lat}/${cityCoords.lng}, Radius=${radiusKm}km, effectiveTarget=${effectiveTarget}`);

    // ─── Existierende Firmen für Duplikat-Check ───────────────────────────
    const existing = await base44.asServiceRole.entities.Company.filter({ organization_id });
    const existingNames = new Set(existing.map(c => c.name?.toLowerCase()));

    // ─── Suchanfragen generieren ──────────────────────────────────────────
    const searchQueryList = [];
    const seen = new Set();
    for (const type of targetCustomers) {
      const variants = SEARCH_VARIANTS[type] || [type];
      for (const variant of variants) {
        const q = `${variant} ${city}`;
        if (!seen.has(q)) { seen.add(q); searchQueryList.push({ query: q, type }); }
      }
    }
    console.info(`[generateLeads] ${searchQueryList.length} Suchanfragen für ${city}`);

    // ─── Counters ─────────────────────────────────────────────────────────
    const createdIds = [];
    let raw_hits = 0;
    let skipped_outside_radius = 0;
    let skipped_duplicate = 0;
    let skipped_excluded = 0;
    let skipped_no_match = 0;
    const seenPlaceIds = new Set();

    // ─── Suchlauf ─────────────────────────────────────────────────────────
    for (const { query, type } of searchQueryList) {
      if (createdIds.length >= effectiveTarget) break;

      const places = await searchPlaces(query, cityCoords, radiusMeters, apiCounters);
      raw_hits += places.length;
      console.info(`[generateLeads] Query="${query}" → ${places.length} Treffer`);

      for (const place of places) {
        if (createdIds.length >= effectiveTarget) break;
        if (seenPlaceIds.has(place.place_id)) continue;
        seenPlaceIds.add(place.place_id);

        // Geo-Validierung (Vorfilter ohne Details-Request)
        const placeLat = place.geometry?.location?.lat;
        const placeLng = place.geometry?.location?.lng;
        if (placeLat && placeLng) {
          const dist = calculateDistance(cityCoords.lat, cityCoords.lng, placeLat, placeLng);
          if (dist > radiusKm) { skipped_outside_radius++; continue; }
        }

        // Name-Duplikat-Check (ohne Details-Request)
        const placeName = place.name || "";
        if (existingNames.has(placeName.toLowerCase())) { skipped_duplicate++; continue; }

        // Ausschluss-Check (ohne Details-Request)
        const placeTypes = (place.types || []).join(" ");
        if (matchesExcluded(placeName, placeTypes, excluded)) { skipped_excluded++; continue; }

        // Zielkunden-Check (ohne Details-Request)
        const matchedType = matchesTargetCustomer(placeName, placeTypes, targetCustomers) || type;

        // Erst JETZT Place Details abrufen (kostenpflichtig)
        const details = await getPlaceDetails(place.place_id, apiCounters);
        const { plz, ort, adresse } = extractAddressComponents(details?.address_components || []);
        const phone = details?.formatted_phone_number || "";
        const website = details?.website || "";
        const lat = details?.geometry?.location?.lat || placeLat;
        const lng = details?.geometry?.location?.lng || placeLng;

        // Speichern
        const company = await base44.asServiceRole.entities.Company.create({
          organization_id,
          name: placeName,
          branche: type,
          ort: ort || city,
          plz: plz || "",
          adresse: adresse || "",
          telefon: phone,
          email: "",
          website: website,
          latitude: lat || null,
          longitude: lng || null,
          quelle: "Google Places API",
          status: "Neu",
          is_hot: false,
          matched_target_customer_type: matchedType,
          relevance_score: 80,
          relevance_reason: `Google Places: "${query}"`,
          source_query: query,
        });

        createdIds.push(company.id);
        existingNames.add(placeName.toLowerCase());
      }
    }

    // ─── Kosten berechnen ─────────────────────────────────────────────────
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
    if (apiCounters.geocoding > 0) {
      skuBreakdown.geocoding = {
        requests: apiCounters.geocoding,
        estimated_cost_cent: skuCostCent('geocoding', apiCounters.geocoding),
      };
    }
    if (apiCounters.nearbySearch > 0) {
      skuBreakdown.places_nearby_search_pro = {
        requests: apiCounters.nearbySearch,
        estimated_cost_cent: skuCostCent('places_nearby_search_pro', apiCounters.nearbySearch),
      };
    }
    if (apiCounters.placeDetailsPro > 0) {
      skuBreakdown.place_details_pro = {
        requests: apiCounters.placeDetailsPro,
        estimated_cost_cent: skuCostCent('place_details_pro', apiCounters.placeDetailsPro),
      };
    }

    const estimatedCostCent = Object.values(skuBreakdown).reduce((sum, s) => sum + s.estimated_cost_cent, 0);

    // ─── UsageLog schreiben ───────────────────────────────────────────────
    const usageDelta = {
      lead_generations_used: 1,
      leads_created: createdIds.length,
      geocoding: apiCounters.geocoding,
      textSearch: apiCounters.textSearch,
      nearbySearch: apiCounters.nearbySearch,
      placeDetailsEssentials: apiCounters.placeDetailsEssentials,
      placeDetailsPro: apiCounters.placeDetailsPro,
      estimatedCostCent: estimatedCostCent,
      skuBreakdown,
    };

    const lastReport = {
      requestedTarget: target_count,
      effectiveTarget,
      saved: createdIds.length,
      duplicates: skipped_duplicate,
      excluded: skipped_excluded,
      noMatch: skipped_no_match,
      outsideRadius: skipped_outside_radius,
      rawHits: raw_hits,
      estimatedCostCent,
      skuBreakdown,
      searchQueries: searchQueryList.map(q => q.query),
      timestamp: new Date().toISOString(),
    };

    // ─── UsageLog zuverlässig speichern (mit explizitem Fehler-Logging) ──────
    try {
      await upsertUsageLog(base44, organization_id, usageDelta, lastReport);
      console.info(`[generateLeads] UsageLog erfolgreich aktualisiert: +1 Lauf, +${createdIds.length} Leads`);
    } catch (usageErr) {
      console.error(`[generateLeads] FEHLER beim UsageLog-Update: ${usageErr.message}`, usageErr.stack);
      // Nicht abbrechen – Leads wurden bereits gespeichert, nur das Logging schlägt fehl
    }

    // ─── Logging ──────────────────────────────────────────────────────────
    console.info(`[generateLeads] REPORT org=${organization_id}: raw=${raw_hits}, outside_radius=${skipped_outside_radius}, no_match=${skipped_no_match}, excluded=${skipped_excluded}, duplicate=${skipped_duplicate}, created=${createdIds.length}`);
    console.info(`[generateLeads] API calls: textSearch=${apiCounters.textSearch}, placeDetailsEssentials=${apiCounters.placeDetailsEssentials}`);
    console.info(`[generateLeads] Geschätzte Kosten: ${estimatedCostCent.toFixed(2)} Cent`);

    return Response.json({
      success: true,
      requestedTarget: target_count,
      effectiveTarget,
      count: createdIds.length,

      summary: {
        raw_hits,
        saved: createdIds.length,
        duplicates: skipped_duplicate,
        excluded: skipped_excluded,
        noMatch: skipped_no_match,
        outsideRadius: skipped_outside_radius,
        created: createdIds.length,
        places_api_requests: apiCounters.textSearch,
        place_details_requests: apiCounters.placeDetailsEssentials,
      },

      googleRequests: {
        geocoding: apiCounters.geocoding,
        textSearch: apiCounters.textSearch,
        nearbySearch: apiCounters.nearbySearch,
        placeDetailsEssentials: apiCounters.placeDetailsEssentials,
        placeDetailsPro: apiCounters.placeDetailsPro,
      },

      googleSkuBreakdown: skuBreakdown,

      usage: {
        lead_generations_used: 1,
        leads_created: createdIds.length,
        estimated_external_cost_cent: estimatedCostCent,
      },

      details: `${raw_hits} Roh-Treffer, ${skipped_outside_radius} außerhalb Radius, ${skipped_excluded} ausgeschlossen, ${skipped_duplicate} Dubletten, ${createdIds.length} gespeichert. Kosten: ~${estimatedCostCent.toFixed(1)} Cent.`,
      search_queries: searchQueryList.map(q => q.query),
    });

  } catch (error) {
    console.error('[generateLeads] Error:', error.message, error.stack);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});