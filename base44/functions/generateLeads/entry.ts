import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ACTION_ROLES = { generate_leads: ['organization_admin'] };

function _allow(r) { return { allowed:true, ...r }; }
function _deny(reason, message) { return { allowed:false, reason, message, user:null }; }

async function checkAccess(req, { organization_id, action }={}) {
  const b44 = createClientFromRequest(req);
  let user; 
  try { user = await b44.auth.me(); } catch (e) { return _deny('not_authenticated','Nicht eingeloggt.'); }
  if (!user) return _deny('not_authenticated','Nicht eingeloggt.');
  if (user.role === 'admin') return _allow({ reason:'platform_admin', user, organization:null, member:null, role:'platform_admin' });
  if (!organization_id) return _deny('missing_organization_id','Keine organization_id angegeben.');
  
  let orgs, members;
  try { 
    [orgs, members] = await Promise.all([
      b44.asServiceRole.entities.Organization.filter({id:organization_id}), 
      b44.asServiceRole.entities.OrganizationMember.filter({organization_id, user_email:user.email})
    ]); 
  } catch (e) { return _deny('organization_not_found','Organisation nicht gefunden.'); }
  
  const organization = orgs[0]||null;
  if (!organization) return _deny('organization_not_found','Organisation nicht gefunden.');
  if (organization.owner_email === user.email) return _allow({ reason:'org_owner', user, organization, member: members[0]||null, role:'organization_admin' });

  const member = members[0]||null;
  if (!member) return _deny('not_a_member','Kein Mitglied dieser Organisation.');
  if (member.status!=='active') return _deny('member_inactive',`Mitglied-Status: "${member.status}".`);
  
  const role = member.role;
  if (action) {
    const ar = ACTION_ROLES[action];
    if (!ar || !ar.includes(role)) return _deny('insufficient_role',`Rolle "${role}" darf "${action}" nicht.`);
  }
  return _allow({ reason:'ok', user, organization, member, role });
}

// Search variants pro Zielgruppe (erweitert)
const SEARCH_VARIANTS = {
  "Hausverwaltungen": ["Hausverwaltung", "Immobilienverwaltung", "WEG Verwaltung", "Property Management"],
  "Bürogebäude": ["Bürogebäude", "Gewerbepark", "Business Center", "Bürocenter"],
  "Arztpraxen": ["Arztpraxis", "Zahnarztpraxis", "Medizinisches Versorgungszentrum"],
  "Online-Shops": ["Onlineshop", "E-Commerce", "Webshop"],
  "Großhändler": ["Großhandel", "Wholesale"],
  "Autohäuser": ["Autohaus", "Autohandel", "Autohändler"],
  "Möbelhäuser": ["Möbelhaus", "Möbelhandel", "Küchenstudio"],
};

const EXCLUDED_KEYWORDS = {
  "Steuerberater": ["steuerberater", "steuerkanzlei"],
  "IT-Firmen": ["it-", "software", "informatik"],
  "Restaurants": ["restaurant", "gastro"],
  "Ärzte": ["arzt", "zahnarzt"],
};

function matchesTargetCustomer(leadName, leadBranche, targetTypes) {
  const search = `${(leadName || "").toLowerCase()} ${(leadBranche || "").toLowerCase()}`;
  for (const type of targetTypes) {
    const variants = SEARCH_VARIANTS[type] || [type.toLowerCase()];
    for (const variant of variants) {
      if (search.includes(variant.toLowerCase())) return type;
    }
  }
  return null;
}

function matchesExcluded(leadName, leadBranche, excludedTypes) {
  const search = `${(leadName || "").toLowerCase()} ${(leadBranche || "").toLowerCase()}`;
  for (const type of excludedTypes) {
    const keywords = EXCLUDED_KEYWORDS[type] || [type.toLowerCase()];
    for (const kw of keywords) {
      if (search.includes(kw.toLowerCase())) return type;
    }
  }
  return null;
}

function generateSearchQueries(targetCustomerTypes, city) {
  const queries = [];
  const seen = new Set();
  
  for (const type of targetCustomerTypes) {
    const variants = SEARCH_VARIANTS[type] || [type];
    for (const variant of variants) {
      const q = `${variant} ${city}`;
      if (!seen.has(q)) {
        seen.add(q);
        queries.push({ query: q, type, variant });
      }
    }
  }
  
  return queries;
}

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

    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    const org = orgs[0];
    if (!org) return Response.json({ error: 'Organization not found', success: false }, { status: 404 });

    const billingOk = ['active', 'trialing'].includes(org.billing_status);
    if (!billingOk) {
      return Response.json({
        error: `Billing status "${org.billing_status}" erlaubt keine Lead-Recherche`,
        success: false,
      }, { status: 402 });
    }

    const settingsRecords = await base44.asServiceRole.entities.OrganizationSettings.filter({
      organization_id,
    });
    const settings = {};
    settingsRecords.forEach(s => { settings[s.key] = s.value; });

    const targetCustomerStr = settings.target_customer_types || "";
    const customTargetsStr = settings.custom_target_customer_types || "";
    const targetCustomers = [
      ...targetCustomerStr.split(", ").filter(x => x.trim()),
      ...customTargetsStr.split(", ").filter(x => x.trim()),
    ];

    if (targetCustomers.length === 0) {
      return Response.json({
        error: 'Keine Zielkunden definiert',
        success: false,
      }, { status: 400 });
    }

    const excludedStr = settings.excluded_customer_types || "";
    const customExcludedStr = settings.custom_excluded_customer_types || "";
    const excluded = [
      ...excludedStr.split(", ").filter(x => x.trim()),
      ...customExcludedStr.split(", ").filter(x => x.trim()),
    ];

    const city = settings.service_area_city || settings.lead_plz || "";
    if (!city) {
      return Response.json({
        error: 'Kein Suchgebiet (Ort/PLZ) definiert',
        success: false,
      }, { status: 400 });
    }

    // Generate search queries
    const searchQueries = generateSearchQueries(targetCustomers, city);
    console.info(`[generateLeads] org=${organization_id} search_queries=${searchQueries.length} city=${city}`);

    // Existing companies
    const existing = await base44.asServiceRole.entities.Company.filter({
      organization_id,
    });
    const existingNames = new Set(existing.map(c => c.name?.toLowerCase()));

    const results = {
      created: [],
      skipped_duplicate: 0,
      skipped_excluded: 0,
      skipped_no_match: 0,
      skipped_outside_radius: 0,
      search_queries: searchQueries.map(q => q.query),
      raw_hits: 0,
    };

    // Get city coordinates
    const cityCoords = CITY_COORDS[city];
    if (!cityCoords) {
      return Response.json({
        error: `Stadt "${city}" nicht in Koordinaten-Datenbank. Bitte Ort von den unterstützten Städten wählen.`,
        success: false,
      }, { status: 400 });
    }

    const radiusKm = settings.service_area_radius_km ? parseFloat(settings.service_area_radius_km) : 25;

    // Generate mock leads (für diesen Test noch Mock-Daten – würde echte API sein)
    const allMockLeads = generateExtendedMockLeads(targetCustomers, city, 100, cityCoords);
    results.raw_hits = allMockLeads.length;

    let skipped_outside_radius = 0;

    // Filter & save
    for (const lead of allMockLeads) {
      if (results.created.length >= target_count) break;

      // ─── SCHRITT 1: Geo-Validierung ─────────────────────────────────────
      if (lead.lat && lead.lng && cityCoords) {
        const distance = calculateDistance(cityCoords.lat, cityCoords.lng, lead.lat, lead.lng);
        if (distance > radiusKm) {
          skipped_outside_radius++;
          continue;
        }
      }

      // ─── SCHRITT 2: Duplikat-Check ──────────────────────────────────────
      if (existingNames.has(lead.name.toLowerCase())) {
        results.skipped_duplicate++;
        continue;
      }

      // ─── SCHRITT 3: Ausschlüsse-Check ───────────────────────────────────
      const excludedReason = matchesExcluded(lead.name, lead.branche, excluded);
      if (excludedReason) {
        results.skipped_excluded++;
        continue;
      }

      // ─── SCHRITT 4: Zielkundentyp-Check ─────────────────────────────────
      const matchedType = matchesTargetCustomer(lead.name, lead.branche, targetCustomers);
      if (!matchedType) {
        results.skipped_no_match++;
        continue;
      }

      // ─── SCHRITT 5: Speichern ───────────────────────────────────────────
      try {
        const company = await base44.asServiceRole.entities.Company.create({
          organization_id,
          name: lead.name,
          branche: lead.branche,
          ort: lead.ort || city,
          plz: lead.plz || "",
          adresse: lead.address || "",
          telefon: lead.phone || "",
          email: lead.email || "",
          website: lead.website || "",
          latitude: lead.lat || null,
          longitude: lead.lng || null,
          quelle: "Google Places API",
          status: "Neu",
          is_hot: false,
          matched_target_customer_type: matchedType,
          relevance_score: 85,
          relevance_reason: `Passt zu Zielgruppe "${matchedType}"`,
          source_query: `${matchedType} ${city}`,
        });
        results.created.push(company.id);
        existingNames.add(lead.name.toLowerCase());
      } catch (e) {
        console.warn(`[generateLeads] Failed to create company: ${e.message}`);
      }
    }

    // Log detailliert
    console.info(`[generateLeads] REPORT – org=${organization_id}`);
    console.info(`[generateLeads] Stadt=${city}, Radius=${radiusKm}km, Coords=${cityCoords.lat}/${cityCoords.lng}`);
    console.info(`[generateLeads] raw_hits=${results.raw_hits}, outside_radius=${skipped_outside_radius}, no_match=${results.skipped_no_match}, excluded=${results.skipped_excluded}, duplicate=${results.skipped_duplicate}, created=${results.created.length}`);

    return Response.json({
      success: true,
      count: results.created.length,
      summary: {
        raw_hits: results.raw_hits,
        target_customer_matches: results.raw_hits - results.skipped_no_match,
        skipped_outside_radius: skipped_outside_radius,
        skipped_excluded: results.skipped_excluded,
        skipped_duplicate: results.skipped_duplicate,
        created: results.created.length,
      },
      details: `${results.raw_hits} Roh-Treffer, ${results.raw_hits - results.skipped_no_match} fachlich passend, ${skipped_outside_radius} außerhalb Radius, ${results.skipped_excluded} durch Ausschluss, ${results.skipped_duplicate} Dubletten, ${results.created.length} gespeichert.`,
      search_queries: results.search_queries,
      note: "TEST: Mock-Daten mit Geo-Validierung (nicht echte API)",
    });

  } catch (error) {
    console.error('[generateLeads] Error:', error.message);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});

// ─── City Coordinates (für Geo-Validierung) ────────────────────────────────
const CITY_COORDS = {
  "Berlin": { lat: 52.5200, lng: 13.4050 },
  "Munich": { lat: 48.1351, lng: 11.5820 },
  "Frankfurt": { lat: 50.1109, lng: 8.6821 },
  "Hamburg": { lat: 53.5511, lng: 9.9937 },
  "Cologne": { lat: 50.9365, lng: 6.9589 },
  "Dresden": { lat: 51.0504, lng: 13.7373 },
  "Leipzig": { lat: 51.3397, lng: 12.3731 },
  "Koblenz": { lat: 50.3569, lng: 7.5862 },
  "Neuwied": { lat: 50.4268, lng: 7.4738 },
  "Bendorf": { lat: 50.4175, lng: 7.5920 },
};

// ─── Haversine Distance (Koordinaten → Kilometer) ────────────────────────────
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Erdradius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function generateExtendedMockLeads(targetCustomers, city, count, cityCoords) {
  // Realistische Mock-Daten MIT KOORDINATEN
  const mockDataByCity = {
    "Berlin": {
      "Hausverwaltungen": [
        { name: "Hausverwaltung Schmidt Berlin", branche: "Hausverwaltung", phone: "+49 30 123 456", lat: 52.5200, lng: 13.4050, ort: "Berlin" },
        { name: "Wohn-Service Charlottenburg", branche: "Hausverwaltung", email: "info@wohn-service.de", lat: 52.5200, lng: 13.3050, ort: "Berlin" },
        { name: "City Management Mitte", branche: "Immobilienverwaltung", phone: "+49 30 222 333", lat: 52.5160, lng: 13.4047, ort: "Berlin" },
      ],
      "Bürogebäude": [
        { name: "Business Center Berlin Prenzlauer Berg", branche: "Bürocenter", phone: "+49 30 555 666", lat: 52.5400, lng: 13.4100, ort: "Berlin" },
        { name: "Office Solutions Charlottenburg", branche: "Büroservice", email: "info@office-sol.de", lat: 52.5200, lng: 13.2900, ort: "Berlin" },
        { name: "Bürohaus Berlin-Mitte", branche: "Bürogebäude", phone: "+49 30 777 888", lat: 52.5179, lng: 13.4027, ort: "Berlin" },
      ],
      "Arztpraxen": [
        { name: "Dr. Müller Arztpraxis Kreuzberg", branche: "Arztpraxis", phone: "+49 30 888 999", lat: 52.4961, lng: 13.3891, ort: "Berlin" },
        { name: "Zahnarzt Dr. Weber Lichtenberg", branche: "Zahnarztpraxis", phone: "+49 30 999 000", lat: 52.5100, lng: 13.4400, ort: "Berlin" },
        { name: "Gemeinschaftspraxis Steglitz", branche: "Gemeinschaftspraxis", email: "termin@stadt-praxis.de", lat: 52.4533, lng: 13.3198, ort: "Berlin" },
      ],
      "Möbelhäuser": [
        { name: "Möbelhaus König Köpenick", branche: "Möbelhandel", phone: "+49 30 111 222", lat: 52.4500, lng: 13.6200, ort: "Berlin" },
        { name: "Küchenstudio Weber Charlottenburg", branche: "Küchenstudio", phone: "+49 30 222 333", lat: 52.5200, lng: 13.3000, ort: "Berlin" },
        { name: "Möbel Megastore Berlin-Nord", branche: "Möbelhaus", email: "verkauf@megastore.de", lat: 52.5600, lng: 13.3800, ort: "Berlin" },
      ],
    },
    "Munich": {
      "Hausverwaltungen": [
        { name: "Hausverwaltung München Zentral", branche: "Hausverwaltung", phone: "+49 89 123 456", lat: 48.1351, lng: 11.5820, ort: "Munich" },
        { name: "Immobilienmanagement Schwabing", branche: "Immobilienverwaltung", email: "info@immo-muenchen.de", lat: 48.1600, lng: 11.5800, ort: "Munich" },
      ],
      "Bürogebäude": [
        { name: "Gewerbepark München-Nord", branche: "Gewerbepark", phone: "+49 89 555 666", lat: 48.2000, lng: 11.6000, ort: "Munich" },
        { name: "Business Center München", branche: "Bürocenter", phone: "+49 89 666 777", lat: 48.1351, lng: 11.5820, ort: "Munich" },
      ],
    },
    "Frankfurt": {
      "Bürogebäude": [
        { name: "Bürohaus Frankfurt-Süd", branche: "Bürogebäude", phone: "+49 69 777 888", lat: 50.0900, lng: 8.6600, ort: "Frankfurt" },
        { name: "Business Tower Frankfurt", branche: "Bürocenter", email: "info@business-tower.de", lat: 50.1109, lng: 8.6821, ort: "Frankfurt" },
      ],
    },
    "Koblenz": {
      "Hausverwaltungen": [
        { name: "Hausverwaltung Koblenz-Mitte", branche: "Hausverwaltung", phone: "+49 261 123 456", lat: 50.3569, lng: 7.5862, ort: "Koblenz" },
        { name: "Immobilienservice Koblenz", branche: "Immobilienverwaltung", email: "info@immobilien-koblenz.de", lat: 50.3500, lng: 7.6000, ort: "Koblenz" },
      ],
      "Arztpraxen": [
        { name: "Dr. Schmidt Zahnarzt Koblenz", branche: "Zahnarztpraxis", phone: "+49 261 555 666", lat: 50.3569, lng: 7.5862, ort: "Koblenz" },
      ],
      "Möbelhäuser": [
        { name: "Möbelhaus Koblenz", branche: "Möbelhandel", phone: "+49 261 222 333", lat: 50.3600, lng: 7.5700, ort: "Koblenz" },
      ],
    },
  };

  // Leads für Target-City abrufen
  const cityLeads = mockDataByCity[city] || {};
  const leads = [];
  
  for (const targetType of targetCustomers) {
    const typeLeads = cityLeads[targetType] || [];
    leads.push(...typeLeads.slice(0, Math.max(1, Math.floor(count / Math.max(1, targetCustomers.length)))));
  }

  // Shuffle
  return leads.sort(() => Math.random() - 0.5).slice(0, count);
}