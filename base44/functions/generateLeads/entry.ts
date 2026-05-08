import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const ACTION_ROLES = { generate_leads: ['organization_admin'] };

function _allow(r) { return { allowed: true, ...r }; }
function _deny(reason, message) { return { allowed: false, reason, message, user: null }; }

async function checkAccess(req, { organization_id, action } = {}) {
  const b44 = createClientFromRequest(req);
  let user;
  try { user = await b44.auth.me(); } catch (e) { return _deny('not_authenticated', 'Nicht eingeloggt.'); }
  if (!user) return _deny('not_authenticated', 'Nicht eingeloggt.');
  if (user.role === 'admin') return _allow({ reason: 'platform_admin', user, organization: null, member: null, role: 'platform_admin' });
  if (!organization_id) return _deny('missing_organization_id', 'Keine organization_id angegeben.');

  let orgs, members;
  try {
    [orgs, members] = await Promise.all([
      b44.asServiceRole.entities.Organization.filter({ id: organization_id }),
      b44.asServiceRole.entities.OrganizationMember.filter({ organization_id, user_email: user.email }),
    ]);
  } catch (e) { return _deny('organization_not_found', 'Organisation nicht gefunden.'); }

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
};

const EXCLUDED_KEYWORDS = {
  "Keine Steuerberater": ["steuerberater", "steuerkanzlei"],
  "Keine IT-Firmen": ["it-", "software", "informatik"],
  "Keine Restaurants": ["restaurant", "gastro"],
  "Keine Ärzte": ["arzt", "zahnarzt"],
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
async function searchPlaces(query, cityCoords, radiusMeters) {
  const url = "https://maps.googleapis.com/maps/api/place/textsearch/json";
  const params = new URLSearchParams({
    query,
    location: `${cityCoords.lat},${cityCoords.lng}`,
    radius: String(radiusMeters),
    language: "de",
    key: GOOGLE_PLACES_API_KEY,
  });

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

// ─── Google Places: Place Details ────────────────────────────────────────────
async function getPlaceDetails(placeId) {
  const url = "https://maps.googleapis.com/maps/api/place/details/json";
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "name,formatted_address,formatted_phone_number,website,geometry,address_components,types",
    language: "de",
    key: GOOGLE_PLACES_API_KEY,
  });

  const res = await fetch(`${url}?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== "OK") return null;
  return data.result || null;
}

// ─── Extract PLZ & Ort from address_components ───────────────────────────────
function extractAddressComponents(components = []) {
  let plz = "";
  let ort = "";
  let strasse = "";
  let hausnummer = "";

  for (const c of components) {
    if (c.types.includes("postal_code")) plz = c.long_name;
    if (c.types.includes("locality")) ort = c.long_name;
    if (c.types.includes("route")) strasse = c.long_name;
    if (c.types.includes("street_number")) hausnummer = c.long_name;
  }

  const adresse = [strasse, hausnummer].filter(Boolean).join(" ");
  return { plz, ort, adresse };
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

    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    const org = orgs[0];
    if (!org) return Response.json({ error: 'Organization not found', success: false }, { status: 404 });

    const billingOk = ['active', 'trialing'].includes(org.billing_status);
    if (!billingOk) {
      return Response.json({ error: `Billing status "${org.billing_status}" erlaubt keine Lead-Recherche`, success: false }, { status: 402 });
    }

    const settingsRecords = await base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id });
    const settings = {};
    settingsRecords.forEach(s => { settings[s.key] = s.value; });

    const targetCustomers = [
      ...((settings.target_customer_types || "").split(", ").filter(x => x.trim())),
      ...((settings.custom_target_customer_types || "").split(", ").filter(x => x.trim())),
    ];

    if (targetCustomers.length === 0) {
      return Response.json({ error: 'Keine Zielkunden definiert', success: false }, { status: 400 });
    }

    const excluded = [
      ...((settings.excluded_customer_types || "").split(", ").filter(x => x.trim())),
      ...((settings.custom_excluded_customer_types || "").split(", ").filter(x => x.trim())),
    ];

    const city = settings.service_area_city || "";
    if (!city) return Response.json({ error: 'Kein Suchgebiet (Ort) definiert', success: false }, { status: 400 });

    const radiusKm = settings.service_area_radius_km ? parseFloat(settings.service_area_radius_km) : 25;
    const radiusMeters = Math.min(radiusKm * 1000, 50000); // Google Places max 50km

    // ─── Koordinaten via Places Text Search ermitteln (kein Geocoding nötig) ──
    // Wir nutzen einen Referenz-Suchbegriff um die Stadt-Koordinaten zu ermitteln
    const refUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(city + " Deutschland")}&key=${GOOGLE_PLACES_API_KEY}&language=de`;
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
    console.info(`[generateLeads] Stadt=${city}, Coords=${cityCoords.lat}/${cityCoords.lng}, Radius=${radiusKm}km`);

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
    let place_details_requests = 0;
    let places_api_requests = 0;

    // Alle bereits gesehenen place_ids um Doppelabfragen zu vermeiden
    const seenPlaceIds = new Set();

    // ─── Über Suchanfragen iterieren ──────────────────────────────────────
    for (const { query, type } of searchQueryList) {
      if (createdIds.length >= target_count) break;

      const places = await searchPlaces(query, cityCoords, radiusMeters);
      places_api_requests++;
      raw_hits += places.length;
      console.info(`[generateLeads] Query="${query}" → ${places.length} Treffer`);

      for (const place of places) {
        if (createdIds.length >= target_count) break;
        if (seenPlaceIds.has(place.place_id)) continue;
        seenPlaceIds.add(place.place_id);

        // ─── GEO-Validierung ─────────────────────────────────────────────
        const placeLat = place.geometry?.location?.lat;
        const placeLng = place.geometry?.location?.lng;

        if (placeLat && placeLng) {
          const dist = calculateDistance(cityCoords.lat, cityCoords.lng, placeLat, placeLng);
          if (dist > radiusKm) {
            skipped_outside_radius++;
            continue;
          }
        }

        // ─── Duplikat-Check (Name) ────────────────────────────────────────
        const placeName = place.name || "";
        if (existingNames.has(placeName.toLowerCase())) {
          skipped_duplicate++;
          continue;
        }

        // ─── Ausschluss-Check ─────────────────────────────────────────────
        const placeTypes = (place.types || []).join(" ");
        if (matchesExcluded(placeName, placeTypes, excluded)) {
          skipped_excluded++;
          continue;
        }

        // ─── Zielkunden-Check ─────────────────────────────────────────────
        const matchedType = matchesTargetCustomer(placeName, placeTypes, targetCustomers) || type;

        // ─── Place Details abrufen ────────────────────────────────────────
        const details = await getPlaceDetails(place.place_id);
        place_details_requests++;

        const { plz, ort, adresse } = extractAddressComponents(details?.address_components || []);
        const phone = details?.formatted_phone_number || "";
        const website = details?.website || "";
        const lat = details?.geometry?.location?.lat || placeLat;
        const lng = details?.geometry?.location?.lng || placeLng;

        // ─── Speichern ────────────────────────────────────────────────────
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

    console.info(`[generateLeads] REPORT org=${organization_id}: raw=${raw_hits}, outside_radius=${skipped_outside_radius}, no_match=${skipped_no_match}, excluded=${skipped_excluded}, duplicate=${skipped_duplicate}, created=${createdIds.length}`);
    console.info(`[generateLeads] API calls: places=${places_api_requests}, details=${place_details_requests}`);

    return Response.json({
      success: true,
      count: createdIds.length,
      summary: {
        raw_hits,
        skipped_outside_radius,
        skipped_excluded,
        skipped_duplicate,
        skipped_no_match,
        created: createdIds.length,
        places_api_requests,
        place_details_requests,
      },
      details: `${raw_hits} Roh-Treffer, ${skipped_outside_radius} außerhalb Radius, ${skipped_excluded} ausgeschlossen, ${skipped_duplicate} Dubletten, ${createdIds.length} gespeichert.`,
      search_queries: searchQueryList.map(q => q.query),
    });

  } catch (error) {
    console.error('[generateLeads] Error:', error.message, error.stack);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});