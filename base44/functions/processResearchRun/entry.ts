/**
 * processResearchRun
 * ==================
 * Verarbeitet einen ResearchRun in kleinen Batches.
 * Idempotent: doppelte Aufrufe erzeugen keine doppelten Companies.
 *
 * TAXONOMIE-ARCHITEKTUR (DB-basiert, produktionsreif):
 * - startResearchRun lädt Taxonomie-Profil via getTaxonomy (DB-Quelle).
 * - Das Profil wird in search_plan_json.taxonomyProfile eingebettet.
 * - Diese Function liest das Profil aus dem Plan — KEINE eigene Taxonomie-Kopie.
 * - taxonomy_hash + taxonomy_version kommen aus dem Plan.
 * - KEIN manueller Sync notwendig. Eine Wahrheitsquelle: TaxonomyEntry-DB.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const SEARCH_ENGINE_VERSION = "v4-db";

// ── Helpers ──────────────────────────────────────────────────────────────────

function normStr(str) {
  return String(str || "").toLowerCase()
    .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").trim();
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function isLikelyChain(candidate) {
  const chainKeywords = ['aldi','lidl','penny','netto','rewe','edeka','kaufland','dm','rossmann','h&m','zara','primark','deichmann','deutsche post','dhl','sparkasse','deutsche bank','commerzbank','mcdonalds','burger king','subway','kfc','starbucks','hilton','marriott','ibis','motel one','fitx','mcfit','fitness first','fielmann','apollo optik','telekom','vodafone','ikea','obi','bauhaus','hornbach','franchise','kette','filialen','konzern'];
  const nameLower = normStr(candidate.name || '');
  for (const kw of chainKeywords) if (nameLower.includes(kw)) return { isChain: true, reason: `Kette: ${kw}` };
  if ((candidate.user_ratings_total || 0) > 1500) return { isChain: true, reason: `>1500 Bewertungen` };
  return { isChain: false };
}

function isBadFit(candidate, profile) {
  const text = normStr([candidate.name, (candidate.types||[]).join(' '), candidate.vicinity||''].join(' '));
  for (const kw of (profile?.negativeKeywords || [])) if (text.includes(normStr(kw))) return { bad: true, reason: `NegKw: "${kw}"` };
  for (const s of (profile?.badFitSignals || [])) if (text.includes(normStr(s))) return { bad: true, reason: `BadFit: "${s}"` };
  return { bad: false };
}

function scoreCandidate(candidate, profile, distanceKm, radiusKm, category) {
  const text = normStr([candidate.name, (candidate.types||[]).join(' '), candidate.vicinity||'', candidate.formatted_address||''].join(' '));
  let score = 50;
  const reasons = [];
  let matched_search_category = category || null;
  let matched_target_customer_type = null;

  if (!matched_search_category) {
    for (const cat of (profile?.searchableBusinessCategories || [])) {
      const variants = profile?.searchKeywordVariants?.[cat] ? profile.searchKeywordVariants[cat] : [cat];
      for (const v of variants) if (text.includes(normStr(v))) { matched_search_category = cat; break; }
      if (matched_search_category) break;
    }
  }
  if (matched_search_category) { score += 20; reasons.push(`Cat:${matched_search_category}`); }
  for (const s of (profile?.scoringSignals || [])) if (text.includes(normStr(s))) { score += 15; reasons.push(`Sig:${s}`); break; }
  if (candidate.formatted_phone_number || candidate.international_phone_number) { score += 10; reasons.push("Tel"); }
  if (candidate.website) { score += 10; reasons.push("Web"); }
  if (distanceKm !== null && distanceKm <= radiusKm) { score += 10; }

  for (const tc of (profile?.targetCustomerTypes || [])) {
    if (text.includes(normStr(tc))) { matched_target_customer_type = tc; score += 5; reasons.push(`TC:${tc}`); break; }
  }

  const badFit = isBadFit(candidate, profile);
  if (badFit.bad) { score -= 40; reasons.push(`BadFit:${badFit.reason}`); }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    matched_search_category,
    matched_target_customer_type,
    relevance_reason: reasons.join(' | ') || 'Base',
    shouldSave: score >= 55 && !badFit.bad,
  };
}

/**
 * Baut strukturierte Queries aus dem Taxonomie-Profil.
 * Profil kommt aus dem searchPlan (eingebettet von startResearchRun).
 */
function buildQueriesFromProfile(profile, targetCustomerTypes, excludedCustomerTypes, trialStage, hasGeoCoords) {
  const queries = [];
  const seen = new Set();
  const maxQ = trialStage === 'free_preview' ? 5 : 20;
  const excludedNorm = excludedCustomerTypes.map(e => normStr(e));
  const cityMode = hasGeoCoords ? 'geo_only' : 'keyword_with_city';
  const familiesUsed = new Set();

  if (profile) {
    const usedCats = (profile.searchableBusinessCategories || []).filter(c => {
      return !excludedNorm.some(ex => normStr(c).includes(ex) || ex.includes(normStr(c)));
    });

    let prioritized = [];
    if (targetCustomerTypes.length > 0) {
      const userPrio = [];
      for (const tc of targetCustomerTypes) {
        const tcNorm = normStr(tc);
        for (const cat of usedCats) {
          if (normStr(cat).includes(tcNorm) || tcNorm.includes(normStr(cat))) {
            if (!userPrio.includes(cat)) userPrio.push(cat);
          }
        }
      }
      const staticPrio = (profile.queryPriority || []).filter(c => usedCats.includes(c) && !userPrio.includes(c));
      const rest = usedCats.filter(c => !userPrio.includes(c) && !staticPrio.includes(c));
      prioritized = [...userPrio, ...staticPrio, ...rest];
    } else {
      const staticPrio = (profile.queryPriority || []).filter(c => usedCats.includes(c));
      const rest = usedCats.filter(c => !(profile.queryPriority || []).includes(c));
      prioritized = [...staticPrio, ...rest];
    }

    const maxVariants = trialStage === 'free_preview' ? 2 : 3;
    for (const cat of prioritized) {
      if (queries.length >= maxQ) break;
      let family = cat;
      for (const [fam, variants] of Object.entries(profile.searchKeywordVariants || {})) {
        if (variants.includes(cat) || fam === cat) { family = fam; break; }
      }
      const variants = (profile.searchKeywordVariants?.[cat] ? profile.searchKeywordVariants[cat] : [cat]).slice(0, maxVariants);
      const weight = (profile.queryPriority || []).indexOf(cat) >= 0 ? 10 - (profile.queryPriority || []).indexOf(cat) : 1;
      const isUserMatched = targetCustomerTypes.some(tc => {
        const tcNorm = normStr(tc);
        return normStr(cat).includes(tcNorm) || tcNorm.includes(normStr(cat));
      });

      for (const v of variants) {
        if (!seen.has(v)) {
          seen.add(v);
          familiesUsed.add(family);
          queries.push({
            query: v, category: cat, variant: v, family, weight,
            source: isUserMatched ? 'user_target' : 'taxonomy',
            city_mode: cityMode,
            matched_target_customer: isUserMatched
              ? targetCustomerTypes.find(tc => normStr(cat).includes(normStr(tc)) || normStr(tc).includes(normStr(cat)))
              : null,
          });
        }
        if (queries.length >= maxQ) break;
      }
    }
  }

  // Fallback: Nutzer-Zielkunden direkt
  if (queries.length === 0 && targetCustomerTypes.length > 0) {
    for (const tc of targetCustomerTypes.slice(0, maxQ)) {
      if (excludedNorm.some(ex => normStr(tc).includes(ex))) continue;
      if (!seen.has(tc)) {
        seen.add(tc);
        queries.push({ query: tc, category: tc, variant: tc, family: tc, weight: 5, source: 'user_fallback', city_mode: cityMode, matched_target_customer: tc });
      }
    }
  }

  return { queries, queryFamiliesUsed: [...familiesUsed], cityMode };
}

async function searchPlaces(query, coords, radiusMeters, apiKey) {
  const body = {
    textQuery: query,
    languageCode: "de",
    locationBias: { circle: { center: { latitude: coords.lat, longitude: coords.lng }, radius: Math.min(radiusMeters, 50000) } },
    maxResultCount: 20,
  };
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type":"application/json","X-Goog-Api-Key":apiKey,"X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.places || []).map(p => ({
    place_id: p.id,
    name: p.displayName?.text || "",
    formatted_address: p.formattedAddress || "",
    geometry: { location: { lat: p.location?.latitude, lng: p.location?.longitude } },
    rating: p.rating,
    user_ratings_total: p.userRatingCount,
    types: p.types || [],
  }));
}

async function getPlaceDetails(placeId, apiKey) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=de`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,location,addressComponents,types",
    },
  });
  if (!res.ok) return null;
  const p = await res.json();
  if (!p || p.error) return null;
  return {
    place_id: p.id,
    name: p.displayName?.text || "",
    formatted_address: p.formattedAddress || "",
    formatted_phone_number: p.nationalPhoneNumber || p.internationalPhoneNumber || "",
    website: p.websiteUri || "",
    geometry: { location: { lat: p.location?.latitude, lng: p.location?.longitude } },
    types: p.types || [],
    address_components: (p.addressComponents || []).map(c => ({ long_name: c.longText, types: c.types })),
  };
}

function extractAddress(components = []) {
  let plz = '', ort = '', strasse = '', hausnummer = '';
  for (const c of components) {
    if (c?.types?.includes('postal_code')) plz = c.long_name;
    if (c?.types?.includes('locality')) ort = c.long_name;
    if (c?.types?.includes('route')) strasse = c.long_name;
    if (c?.types?.includes('street_number')) hausnummer = c.long_name;
  }
  return { plz, ort, adresse: [strasse, hausnummer].filter(Boolean).join(' ') };
}

function getPeriodMonth() {
  const n = new Date();
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth()+1).padStart(2,'0')}`;
}

async function upsertUsageLog(base44, organization_id, newLeads) {
  if (newLeads <= 0) return;
  const periodMonth = getPeriodMonth();
  const now = new Date().toISOString();
  const existing = await base44.asServiceRole.entities.UsageLog.filter({ organization_id, period_month: periodMonth });
  if (existing[0]) {
    await base44.asServiceRole.entities.UsageLog.update(existing[0].id, {
      leads_created: (existing[0].leads_created || 0) + newLeads,
      last_lead_generation_at: now,
    });
  } else {
    const start = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
    const end = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth()+1, 0, 23, 59, 59)).toISOString();
    await base44.asServiceRole.entities.UsageLog.create({
      organization_id, period_month: periodMonth,
      period_start: start, period_end: end,
      leads_created: newLeads, lead_generations_used: 1,
      last_lead_generation_at: now,
    });
  }
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const startedAt = Date.now();
  const MAX_BATCH_MS = 18000;

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht eingeloggt', success: false }, { status: 401 });

    const body = await req.json();
    const { research_run_id, organization_id } = body;
    if (!research_run_id || !organization_id) {
      return Response.json({ error: 'research_run_id und organization_id erforderlich', success: false }, { status: 400 });
    }

    // ── ResearchRun laden ────────────────────────────────────────────────────
    const runs = await base44.asServiceRole.entities.ResearchRun.filter({ id: research_run_id });
    const run = runs[0];
    if (!run) return Response.json({ error: 'ResearchRun nicht gefunden', success: false }, { status: 404 });
    if (run.organization_id !== organization_id) return Response.json({ error: 'Ungültige organization_id', success: false }, { status: 403 });

    if (run.status === 'completed' || run.status === 'failed') {
      return Response.json({
        success: true, done: true, status: run.status,
        leads_saved: run.leads_saved || 0,
        progress_percent: run.progress_percent || 100,
        message: run.status === 'completed'
          ? `Recherche abgeschlossen: ${run.leads_saved || 0} neue Firmenkontakte gefunden.`
          : `Recherche fehlgeschlagen: ${run.error_message || 'Unbekannter Fehler'}`,
      });
    }

    // ── Suchplan lesen ───────────────────────────────────────────────────────
    let searchPlan;
    try {
      searchPlan = JSON.parse(run.search_plan_json || '{}');
    } catch {
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
        status: 'failed', error_message: 'Suchplan ungültig', finished_at: new Date().toISOString()
      });
      return Response.json({ success: false, error: 'Suchplan ungültig', done: true, status: 'failed' }, { status: 400 });
    }

    const {
      industry,
      industryId,
      city,
      radiusKm,
      radiusMeters,
      targetCustomerTypes = [],
      excludedCustomerTypes = [],
      trialStage,
      cityCoords,
      allPoints = [],
      allCenters = [],
      effectiveTarget,
      taxonomyProfile,  // ← Eingebettet von startResearchRun via DB
      taxonomyHash,
      taxonomyVersion,
    } = searchPlan;

    const hasGeoCoords = !!(cityCoords?.lat && cityCoords?.lng);

    // ── Queries aus eingebettetem Profil bauen ───────────────────────────────
    // Kein DB-Call hier, kein Inline-Taxonomy-Objekt. Profil kommt aus dem Plan.
    const { queries: allQueries, queryFamiliesUsed, cityMode } = buildQueriesFromProfile(
      taxonomyProfile, targetCustomerTypes, excludedCustomerTypes, trialStage, hasGeoCoords
    );

    if (allQueries.length === 0) {
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
        status: 'failed', error_message: 'Keine Suchkategorien gefunden.', finished_at: new Date().toISOString(), zero_result_cause: 'no_queries_built',
      });
      return Response.json({ success: false, error: 'Keine Suchkategorien gefunden.', done: true, status: 'failed' });
    }

    // ── Status auf running + Metadaten setzen ────────────────────────────────
    if (run.status === 'queued') {
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
        status: 'running',
        current_step: 'Firmenprofile werden gesucht…',
        progress_percent: 5,
        taxonomy_version: taxonomyVersion || 'unknown',
        taxonomy_hash: taxonomyHash || 'unknown',
        industry_id: industryId || industry,
        city_mode: cityMode,
        query_families_used: JSON.stringify(queryFamiliesUsed),
        selected_target_customer_types: targetCustomerTypes.join(', '),
        excluded_customer_types: excludedCustomerTypes.join(', '),
        search_centers_used: JSON.stringify(
          allCenters.length > 0 ? allCenters : cityCoords ? [{ lat: cityCoords.lat, lng: cityCoords.lng, city }] : []
        ),
      });
    }

    // ── Bereits gesehene Place-IDs ───────────────────────────────────────────
    let seenPlaceIds = new Set();
    try { seenPlaceIds = new Set(JSON.parse(run.seen_place_ids || '[]')); } catch {}

    // ── Duplikat-Check ───────────────────────────────────────────────────────
    const existing = await base44.asServiceRole.entities.Company.filter({ organization_id }, '-created_date', 500);
    const existingNames = new Set(existing.map(c => normStr(c.name || '')));

    const currentLeadsSaved = run.leads_saved || 0;
    if ((effectiveTarget || 25) - currentLeadsSaved <= 0) {
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, { status: 'completed', progress_percent: 100, current_step: 'Recherche abgeschlossen', finished_at: new Date().toISOString() });
      return Response.json({ success: true, done: true, status: 'completed', leads_saved: currentLeadsSaved, progress_percent: 100 });
    }

    // ── Batch ────────────────────────────────────────────────────────────────
    const batchIndex = run.batch_index || 0;
    const QUERIES_PER_BATCH = trialStage === 'free_preview' ? 2 : 3;
    const PLACE_DETAILS_PER_BATCH = 15;
    const batchStart = batchIndex * QUERIES_PER_BATCH;
    const batchQueries = allQueries.slice(batchStart, batchStart + QUERIES_PER_BATCH);

    if (batchQueries.length === 0) {
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
        status: 'completed', progress_percent: 100,
        current_step: currentLeadsSaved > 0 ? `${currentLeadsSaved} Firmenkontakte gefunden` : 'Keine neuen Kontakte gefunden',
        finished_at: new Date().toISOString(),
        ...(currentLeadsSaved === 0 ? { zero_result_cause: 'all_queries_exhausted' } : {}),
      });
      return Response.json({ success: true, done: true, status: 'completed', leads_saved: currentLeadsSaved, progress_percent: 100 });
    }

    // ── Search Points ────────────────────────────────────────────────────────
    const basePoint = cityCoords ? { lat: cityCoords.lat, lng: cityCoords.lng, label:'center', centerLat: cityCoords.lat, centerLng: cityCoords.lng, centerCity: city } : null;
    const pointsToSearch = (allPoints.length > 0 ? allPoints : basePoint ? [basePoint] : []).slice(0, 3);

    if (pointsToSearch.length === 0) {
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, { status: 'failed', error_message: 'Keine Suchkoordinaten.', finished_at: new Date().toISOString(), zero_result_cause: 'no_geo_coords' });
      return Response.json({ success: false, error: 'Keine Suchkoordinaten.', done: true, status: 'failed' });
    }

    const pointRadiusMeters = Math.min(15000, Math.max(8000, radiusMeters / Math.max(pointsToSearch.length, 1)));

    let newLeadsSavedThisBatch = 0, rawHitsThisBatch = 0, dupSkippedThisBatch = 0, noMatchThisBatch = 0, outsideRadiusThisBatch = 0, placeDetailsUsed = 0;

    outer:
    for (const point of pointsToSearch) {
      const pointCenter = { lat: point.centerLat || cityCoords?.lat, lng: point.centerLng || cityCoords?.lng, city: point.centerCity || city };

      for (const qItem of batchQueries) {
        const { query, category, variant, family, matched_target_customer } = qItem;

        if (newLeadsSavedThisBatch + currentLeadsSaved >= effectiveTarget) break outer;
        if (Date.now() - startedAt > MAX_BATCH_MS) { console.warn('[processResearchRun] Batch time budget reached'); break outer; }

        const places = await searchPlaces(query, { lat: point.lat, lng: point.lng }, pointRadiusMeters, GOOGLE_PLACES_API_KEY);
        rawHitsThisBatch += places.length;

        for (const place of places) {
          if (newLeadsSavedThisBatch + currentLeadsSaved >= effectiveTarget) break outer;
          if (placeDetailsUsed >= PLACE_DETAILS_PER_BATCH) break outer;
          if (seenPlaceIds.has(place.place_id)) continue;
          seenPlaceIds.add(place.place_id);

          const placeLat = place.geometry?.location?.lat;
          const placeLng = place.geometry?.location?.lng;
          let distanceKm = null;
          if (placeLat && placeLng) {
            const centers = allCenters.length > 0 ? allCenters : (cityCoords ? [{ lat: cityCoords.lat, lng: cityCoords.lng }] : []);
            const nearAnyCenter = centers.some(sc => haversineKm(sc.lat, sc.lng, placeLat, placeLng) <= radiusKm * 1.05);
            if (!nearAnyCenter) { outsideRadiusThisBatch++; continue; }
            distanceKm = centers.length > 0 ? Math.min(...centers.map(sc => haversineKm(sc.lat, sc.lng, placeLat, placeLng))) : null;
          }

          if (isLikelyChain(place).isChain) { noMatchThisBatch++; continue; }
          if (existingNames.has(normStr(place.name || ''))) { dupSkippedThisBatch++; continue; }

          // Scoring mit DB-Profil aus searchPlan
          const scoring = taxonomyProfile
            ? scoreCandidate(place, taxonomyProfile, distanceKm, radiusKm, category)
            : { score: 60, matched_search_category: category, matched_target_customer_type: null, relevance_reason: `NoProfile:${category}`, shouldSave: !isBadFit(place, {}).bad };

          if (!scoring.shouldSave) { noMatchThisBatch++; continue; }

          const details = await getPlaceDetails(place.place_id, GOOGLE_PLACES_API_KEY);
          placeDetailsUsed++;
          const { plz, ort, adresse } = extractAddress(details?.address_components || []);
          const matchedServiceContext = matched_target_customer
            ? (taxonomyProfile?.ownServices?.slice(0, 3) || []).join(', ')
            : (taxonomyProfile?.ownServices?.[0] || '');

          await base44.asServiceRole.entities.Company.create({
            organization_id,
            name: place.name || '',
            branche: scoring.matched_target_customer_type || matched_target_customer || scoring.matched_search_category || category,
            ort: ort || city, plz: plz || '', adresse: adresse || '',
            telefon: details?.formatted_phone_number || '',
            email: '', website: details?.website || '',
            latitude: details?.geometry?.location?.lat || placeLat || null,
            longitude: details?.geometry?.location?.lng || placeLng || null,
            quelle: 'Google Places API', status: 'Neu', is_hot: false,
            relevance_score: scoring.score,
            relevance_reason: scoring.relevance_reason,
            source_query: variant || query,
            distance_km: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
            search_center_city: pointCenter.city || city,
            search_center_lat: pointCenter.lat,
            search_center_lng: pointCenter.lng,
            search_radius_km: radiusKm,
            research_run_id,
            matched_target_customer_type: scoring.matched_target_customer_type || matched_target_customer || null,
            matched_service_context: matchedServiceContext || null,
          });

          existingNames.add(normStr(place.name || ''));
          newLeadsSavedThisBatch++;
          console.info(`[processResearchRun] SAVED "${place.name}" run=${research_run_id} batch=${batchIndex} score=${scoring.score} family=${family} taxonomy=${taxonomyHash}`);
        }
      }
    }

    // ── Fortschritt + Update ─────────────────────────────────────────────────
    const totalLeadsSaved = currentLeadsSaved + newLeadsSavedThisBatch;
    const nextBatchIndex = batchIndex + 1;
    const totalBatches = Math.ceil(allQueries.length / QUERIES_PER_BATCH);
    const progressPercent = Math.min(95, Math.round((nextBatchIndex / totalBatches) * 90) + 5);
    const isDone = nextBatchIndex >= totalBatches || totalLeadsSaved >= effectiveTarget;
    const zeroResultCause = isDone && totalLeadsSaved === 0
      ? (rawHitsThisBatch === 0 ? 'no_google_results' : dupSkippedThisBatch > 0 ? 'all_duplicates' : 'no_match_score')
      : null;

    if (newLeadsSavedThisBatch > 0) {
      await upsertUsageLog(base44, organization_id, newLeadsSavedThisBatch);
      if (trialStage === 'free_preview') {
        const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
        if (orgs[0]) {
          await base44.asServiceRole.entities.Organization.update(organization_id, { trial_leads_granted: (orgs[0].trial_leads_granted || 0) + newLeadsSavedThisBatch });
        }
      }
    }

    const newStatus = isDone ? 'completed' : 'running';
    const newStep = isDone
      ? (totalLeadsSaved > 0 ? `${totalLeadsSaved} neue Firmenkontakte gefunden` : 'Keine neuen Kontakte gefunden')
      : `Suche läuft… ${totalLeadsSaved} Kontakte bisher gefunden`;

    await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
      status: newStatus,
      leads_saved: totalLeadsSaved,
      duplicates_skipped: (run.duplicates_skipped || 0) + dupSkippedThisBatch,
      no_match_count: (run.no_match_count || 0) + noMatchThisBatch,
      outside_radius_count: (run.outside_radius_count || 0) + outsideRadiusThisBatch,
      raw_hits: (run.raw_hits || 0) + rawHitsThisBatch,
      progress_percent: isDone ? 100 : progressPercent,
      batch_index: nextBatchIndex,
      total_batches: totalBatches,
      current_step: newStep,
      seen_place_ids: JSON.stringify([...seenPlaceIds].slice(-500)),
      charged_lead_generation: totalLeadsSaved > 0,
      ...(isDone ? { finished_at: new Date().toISOString() } : {}),
      ...(isDone && zeroResultCause ? { zero_result_cause: zeroResultCause } : {}),
    });

    console.info(`[processResearchRun] Batch ${batchIndex} done: newSaved=${newLeadsSavedThisBatch} totalSaved=${totalLeadsSaved} done=${isDone} cityMode=${cityMode} engine=${SEARCH_ENGINE_VERSION}`);

    return Response.json({
      success: true, done: isDone, status: newStatus,
      leads_saved: totalLeadsSaved, leads_saved_this_batch: newLeadsSavedThisBatch,
      progress_percent: isDone ? 100 : progressPercent,
      current_step: newStep, batch_index: nextBatchIndex, total_batches: totalBatches, message: newStep,
    });

  } catch (error) {
    console.error('[processResearchRun] Error:', error?.message, error?.stack);
    try {
      const base44b = createClientFromRequest(req);
      const body2 = await req.clone().json().catch(() => ({}));
      if (body2.research_run_id) {
        await base44b.asServiceRole.entities.ResearchRun.update(body2.research_run_id, {
          status: 'partial', error_message: error?.message, current_step: 'Fehler – Recherche teilweise abgeschlossen',
        });
      }
    } catch {}
    return Response.json({ error: error?.message || 'Unbekannter Fehler', success: false }, { status: 500 });
  }
});