import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NEUWIED_LAT = 50.4265;
const NEUWIED_LNG = 7.4620;
const RADIUS_METERS = 40000; // 40km Radius

// Google Places types für mittelständische B2B-Kunden
const BUSINESS_TYPES = [
  "real_estate_agency",
  "doctor",
  "dentist",
  "lawyer",
  "accounting",
  "general_contractor",
  "storage",
  "car_dealer",
  "insurance_agency",
  "bank",
  "office",
  "moving_company",
  "electrician",
  "plumber",
  "software",
  "computer_store",
  "electronics_store",
];

// Keyword-Suchen für spezifische Branchen die Google Places nicht direkt hat
const KEYWORD_SEARCHES = [
  "Druckerei",
  "Metallbau",
  "Metallverarbeitung",
  "Spedition",
  "Logistik",
  "Immobilienverwaltung",
  "Architekturbüro",
  "Steuerberatung",
  "Lagerhaus",
  "IT Unternehmen",
  "Softwareunternehmen",
  "IT Dienstleister",
  "Systemhaus",
  "Webdesign Agentur",
];

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
}

async function fetchPlaces(apiKey, type, keyword = null) {
  let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${NEUWIED_LAT},${NEUWIED_LNG}&radius=${RADIUS_METERS}&key=${apiKey}`;
  if (keyword) {
    url += `&keyword=${encodeURIComponent(keyword)}`;
  } else {
    url += `&type=${type}`;
  }
  const res = await fetch(url);
  return res.json();
}

async function getPlaceDetails(apiKey, placeId) {
  const fields = "name,formatted_address,formatted_phone_number,website,geometry,types,user_ratings_total,rating";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      // Allow non-admins too (for self-service lead loading)
    }
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetCount = body.count || 25;
    const assignTo = body.assign_to || user.email;
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

    if (!apiKey) {
      return Response.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 500 });
    }

    const [existingCompanies, blacklist] = await Promise.all([
      base44.asServiceRole.entities.Company.list('-created_date', 2000),
      base44.asServiceRole.entities.Blacklist.list('-created_date', 500),
    ]);
    const existingNames = new Set(existingCompanies.map(c => c.name?.toLowerCase().trim()));
    const blacklistNames = new Set(blacklist.map(b => b.firmenname?.toLowerCase().trim()));

    const candidates = [];
    const shuffledTypes = BUSINESS_TYPES.sort(() => Math.random() - 0.5);
    const shuffledKeywords = KEYWORD_SEARCHES.sort(() => Math.random() - 0.5);

    // Fetch by type
    for (const type of shuffledTypes.slice(0, 5)) {
      if (candidates.length >= targetCount * 2) break;
      const data = await fetchPlaces(apiKey, type);
      if (data.results) candidates.push(...data.results);
      await new Promise(r => setTimeout(r, 200));
    }

    // Fetch by keyword (for Druckereien, Metallbau etc.)
    for (const keyword of shuffledKeywords.slice(0, 4)) {
      if (candidates.length >= targetCount * 3) break;
      const data = await fetchPlaces(apiKey, null, keyword);
      if (data.results) candidates.push(...data.results);
      await new Promise(r => setTimeout(r, 200));
    }

    // Deduplicate by place_id
    const seen = new Set();
    const unique = candidates.filter(p => {
      if (seen.has(p.place_id)) return false;
      seen.add(p.place_id);
      return true;
    });

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);

    const batch = await base44.asServiceRole.entities.WeeklyBatch.create({
      kalenderwoche: weekNumber,
      jahr: now.getFullYear(),
      anzahl_firmen: 0,
      assigned_to: assignTo,
      status: "Offen"
    });

    const typeMap = {
      real_estate_agency: "Immobilienverwaltung",
      doctor: "Arztpraxis",
      dentist: "Zahnarztpraxis",
      lawyer: "Kanzlei / Architekt",
      accounting: "Steuerberatung / Büro",
      general_contractor: "Baufirma",
      storage: "Lager / Logistik",
      car_dealer: "Autohaus / Kfz-Betrieb",
      insurance_agency: "Versicherung / Büro",
      bank: "Bank / Finanzdienstleister",
      office: "Bürogebäude",
      moving_company: "Spedition / Logistik",
      electrician: "Handwerksbetrieb",
      plumber: "Handwerksbetrieb",
      software: "IT / Software",
      computer_store: "IT / Software",
      electronics_store: "IT / Elektronik",
    };

    let created = 0;
    let skipped = 0;

    for (const place of unique) {
      if (created >= targetCount) break;

      const nameL = place.name?.toLowerCase().trim();
      if (!nameL || existingNames.has(nameL) || blacklistNames.has(nameL)) {
        skipped++;
        continue;
      }

      let details = null;
      try {
        details = await getPlaceDetails(apiKey, place.place_id);
        await new Promise(r => setTimeout(r, 150));
      } catch (_) {}

      const lat = place.geometry?.location?.lat;
      const lng = place.geometry?.location?.lng;
      const distKm = lat && lng ? calcDistance(NEUWIED_LAT, NEUWIED_LNG, lat, lng) : null;

      const addr = (details?.formatted_address || place.vicinity || "");
      const addrParts = addr.split(",");
      const strasse = addrParts[0]?.trim() || "";
      const plzOrt = addrParts[1]?.trim() || "";
      const plzMatch = plzOrt.match(/(\d{5})\s+(.*)/);
      const plz = plzMatch ? plzMatch[1] : "";
      const ort = plzMatch ? plzMatch[2] : (addrParts[1]?.trim() || "");

      let branche = place.types?.map(t => typeMap[t]).find(Boolean) || "Gewerbe";
      const nameLower = (place.name || "").toLowerCase();
      if (nameLower.includes("software") || nameLower.includes("systeme") ||
        nameLower.includes("digital") || nameLower.includes("tech") ||
        nameLower.includes("web") || nameLower.includes("data") ||
        nameLower.includes("cyber") || nameLower.includes("cloud") ||
        nameLower.includes("it-") || nameLower.startsWith("it ")) {
        branche = "IT / Software";
      }

      const ratingsCount = details?.user_ratings_total ?? place.user_ratings_total ?? null;
      const isNewLocation = ratingsCount !== null && ratingsCount < 10;

      await base44.asServiceRole.entities.Company.create({
        name: place.name,
        branche,
        adresse: strasse,
        plz,
        ort,
        telefon: details?.formatted_phone_number || "",
        website: details?.website || "",
        latitude: lat || null,
        longitude: lng || null,
        entfernung_km: distKm,
        status: "Neu",
        quelle: "Google Places API",
        assigned_to: assignTo,
        weekly_batch_id: batch.id,
        notizen: isNewLocation ? `⚡ Neuer Standort (nur ${ratingsCount} Bewertungen) – jetzt anrufen!` : "",
      });

      existingNames.add(nameL);
      created++;
    }

    await base44.asServiceRole.entities.WeeklyBatch.update(batch.id, { anzahl_firmen: created });

    return Response.json({
      success: true,
      batch_id: batch.id,
      created,
      skipped,
      week: weekNumber,
      radius_km: 40,
      source: "Google Places API"
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});