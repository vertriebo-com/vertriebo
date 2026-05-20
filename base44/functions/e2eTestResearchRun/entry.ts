/**
 * e2eTestResearchRun
 * ==================
 * Automatisierter E2E-Test für ResearchRun mit frischer Test-Organisation.
 * Erstellt ResearchRun direkt via asServiceRole (kein externer Function-Aufruf).
 *
 * Ablauf:
 * 1. Neue Test-Organisation erstellen (owner_email = eingeloggter Admin)
 * 2. OrganizationSettings setzen
 * 3. Baseline erfassen (Companies, UsageLog, Supabase — echte Abfragen, kein Hard-0)
 * 4. ResearchRun direkt erstellen + verarbeiten mit processResearchRun
 * 5. Alle 5 Quellen vergleichen inkl. Delta zur Baseline
 *
 * NUR FÜR PLATFORM ADMINS.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");

function getPeriodMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  return `${y}-${m}`;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function generateSearchGrid(centerLat, centerLng, radiusKm) {
  const points = [{ lat: centerLat, lng: centerLng, label: 'center' }];
  const stepKm = 15, rings = radiusKm <= 20 ? 1 : 2;
  for (let ring = 1; ring <= rings; ring++) {
    const ringR = ring * stepKm, count = 6 * ring;
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count;
      const dLat = (ringR / 111) * Math.cos(angle);
      const dLng = (ringR / (111 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
      const pLat = centerLat + dLat, pLng = centerLng + dLng;
      if (haversineKm(centerLat, centerLng, pLat, pLng) <= radiusKm * 1.05) {
        points.push({ lat: pLat, lng: pLng, label: `grid_${ring}_${i}` });
      }
    }
  }
  return points;
}

// Supabase monthly count mit Retry
async function getSupabaseMonthlyCount(orgId, periodMonth, retries = 3) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/lead_usage_events?organization_id=eq.${encodeURIComponent(orgId)}&period_month=eq.${periodMonth}&event_type=eq.research_lead_created`,
        {
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY,
            'Prefer': 'count=exact',
            'Range': '0-0',
          },
        }
      );
      if (res.ok) {
        const contentRange = res.headers.get('content-range') || '';
        const total = parseInt(contentRange.split('/')[1] || '0', 10);
        if (!isNaN(total)) {
          console.info(`[e2eTest] Supabase count attempt ${attempt}: ${total}`);
          return total;
        }
      }
    } catch (e) {
      console.warn(`[e2eTest] Supabase attempt ${attempt} error: ${e?.message}`);
    }
    if (attempt < retries) await new Promise(r => setTimeout(r, 1000));
  }
  return null;
}

// Cleanup aller Test-Daten
async function cleanupTestOrg(base44, orgId) {
  console.info(`[e2eTest] Cleanup: ${orgId}`);
  const [companies, runs, usageLogs, settings] = await Promise.all([
    base44.asServiceRole.entities.Company.filter({ organization_id: orgId }).catch(() => []),
    base44.asServiceRole.entities.ResearchRun.filter({ organization_id: orgId }).catch(() => []),
    base44.asServiceRole.entities.UsageLog.filter({ organization_id: orgId }).catch(() => []),
    base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id: orgId }).catch(() => []),
  ]);
  await Promise.all([
    ...companies.map(c => base44.asServiceRole.entities.Company.delete(c.id).catch(() => {})),
    ...runs.map(r => base44.asServiceRole.entities.ResearchRun.delete(r.id).catch(() => {})),
    ...usageLogs.map(u => base44.asServiceRole.entities.UsageLog.delete(u.id).catch(() => {})),
    ...settings.map(s => base44.asServiceRole.entities.OrganizationSettings.delete(s.id).catch(() => {})),
  ]);
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/lead_usage_events?organization_id=eq.${orgId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
      }).catch(() => {}),
      fetch(`${SUPABASE_URL}/rest/v1/quota_reservations?organization_id=eq.${orgId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
      }).catch(() => {}),
    ]);
  }
  await base44.asServiceRole.entities.Organization.delete(orgId).catch(() => {});
  console.info(`[e2eTest] Cleanup done for ${orgId}`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!["admin", "platform_owner", "platform_admin"].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Platform Admin required', user_role: user.role }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch {}
    const { cleanup_only, org_id_to_cleanup } = body;

    if (cleanup_only && org_id_to_cleanup) {
      await cleanupTestOrg(base44, org_id_to_cleanup);
      return Response.json({ success: true, message: `Cleanup abgeschlossen für ${org_id_to_cleanup}` });
    }

    const timestamp = Date.now();
    const periodMonth = getPeriodMonth();
    console.info(`[e2eTest] Start: user=${user.email} role=${user.role} period=${periodMonth}`);

    // ── SCHRITT 1: Test-Organisation erstellen ────────────────────────────────
    console.info('[e2eTest] Schritt 1: Erstelle Test-Organisation...');
    // owner_email = user.email (Admin) damit processResearchRun Ownership-Check besteht
    const testOrg = await base44.asServiceRole.entities.Organization.create({
      name: `E2E Test Org ${timestamp}`,
      owner_email: user.email,
      organization_type: 'direct_customer',
      billing_status: 'active',
      platform_status: 'active',
      industry: 'Gebäudereinigung',
      service_area_city: 'München',
      service_area_radius_km: 25,
      onboarding_done: true,
      trial_stage: 'paid',
    });
    console.info(`[e2eTest] ✅ Org erstellt: ${testOrg.id}`);

    // ── SCHRITT 2: Settings setzen ────────────────────────────────────────────
    console.info('[e2eTest] Schritt 2: Setze Settings...');
    await Promise.all([
      base44.asServiceRole.entities.OrganizationSettings.create({ organization_id: testOrg.id, key: 'industry_id', value: 'gebaeudereinigung' }),
      base44.asServiceRole.entities.OrganizationSettings.create({ organization_id: testOrg.id, key: 'industry_name', value: 'Gebäudereinigung' }),
      base44.asServiceRole.entities.OrganizationSettings.create({ organization_id: testOrg.id, key: 'target_customer_types', value: 'Hausverwaltungen, Immobilienverwaltungen, Facility Manager' }),
      base44.asServiceRole.entities.OrganizationSettings.create({ organization_id: testOrg.id, key: 'service_area_city', value: 'München' }),
      base44.asServiceRole.entities.OrganizationSettings.create({ organization_id: testOrg.id, key: 'service_area_radius_km', value: '25' }),
    ]);
    console.info('[e2eTest] ✅ Settings gesetzt');

    // ── SCHRITT 3: Baseline erfassen (echte Abfragen) ─────────────────────────
    console.info('[e2eTest] Schritt 3: Baseline erfassen...');
    const [blCompanies, blUsage, blSupabase] = await Promise.all([
      base44.asServiceRole.entities.Company.filter({ organization_id: testOrg.id }),
      base44.asServiceRole.entities.UsageLog.filter({ organization_id: testOrg.id, period_month: periodMonth }),
      getSupabaseMonthlyCount(testOrg.id, periodMonth, 1),
    ]);
    const baseline = {
      companies: blCompanies.length,
      usageLog_leads_created: blUsage[0]?.leads_created || 0,
      supabase_monthly_used: blSupabase || 0,
    };
    console.info(`[e2eTest] Baseline: ${JSON.stringify(baseline)}`);

    // ── SCHRITT 4: Taxonomie laden + ResearchRun direkt erstellen ─────────────
    console.info('[e2eTest] Schritt 4: Taxonomie + ResearchRun...');
    const industryId = 'gebaeudereinigung';
    const city = 'München';
    const radiusKm = 25;
    const targetCustomerTypes = ['Hausverwaltungen', 'Immobilienverwaltungen', 'Facility Manager'];

    let taxonomyProfile = null;
    const taxRecords = await base44.asServiceRole.entities.TaxonomyEntry.filter({ industry_id: industryId, is_active: true });
    if (taxRecords[0]) {
      const rec = taxRecords[0];
      const jp = (f) => { try { return f ? JSON.parse(f) : []; } catch { return []; } };
      const jo = (f) => { try { return f ? JSON.parse(f) : {}; } catch { return {}; } };
      taxonomyProfile = {
        industry_id: rec.industry_id, label: rec.label,
        own_services: jp(rec.own_services), target_customer_types: jp(rec.target_customer_types),
        excluded_customer_types: jp(rec.excluded_customer_types),
        searchable_business_categories: jp(rec.searchable_business_categories),
        search_keyword_variants: jo(rec.search_keyword_variants),
        negative_keywords: jp(rec.negative_keywords),
        bad_fit_signals: jp(rec.bad_fit_signals), bad_fit_signal_weights: jo(rec.bad_fit_signal_weights),
        scoring_signals: jp(rec.scoring_signals), scoring_signal_weights: jo(rec.scoring_signal_weights),
        query_priority: jp(rec.query_priority),
        search_strategy: rec.search_strategy || 'target_customer_search',
        place_type_confidence: rec.place_type_confidence || 'medium',
        google_place_types: jp(rec.google_place_types),
        ideal_customer_profiles: jp(rec.ideal_customer_profiles),
      };
      console.info(`[e2eTest] ✅ Taxonomie geladen: ${industryId}`);
    } else {
      console.warn('[e2eTest] Kein Taxonomie-Profil für gebaeudereinigung — Test wird trotzdem fortgesetzt');
    }

    // Geocode
    let cityCoords = { lat: 48.1351253, lng: 11.5819806 }; // München Fallback
    const geoRes = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(city + ' Deutschland')}&key=${GOOGLE_PLACES_API_KEY}&language=de`);
    const geoData = await geoRes.json();
    const loc = geoData.results?.[0]?.geometry?.location;
    if (loc) {
      cityCoords = { lat: loc.lat, lng: loc.lng };
      console.info(`[e2eTest] ✅ Geocode: ${city} → ${cityCoords.lat},${cityCoords.lng}`);
    } else {
      console.warn('[e2eTest] Geocode failed, using hardcoded München coords');
    }

    const mainGrid = generateSearchGrid(cityCoords.lat, cityCoords.lng, radiusKm).map(p => ({
      ...p, centerLat: cityCoords.lat, centerLng: cityCoords.lng, centerCity: city,
    }));

    const searchPlanData = {
      industry: 'Gebäudereinigung', industryId, industrySource: 'e2e_test',
      city, radiusKm, radiusMeters: Math.min(radiusKm * 1000, 50000),
      targetCustomerTypes, excludedCustomerTypes: [],
      trialStage: 'paid', cityCoords,
      allPoints: mainGrid, allCenters: [{ lat: cityCoords.lat, lng: cityCoords.lng, city }],
      effectiveTarget: 5, remainingPreviewLeads: 0,
      taxonomyProfile, taxonomyHash: 'e2e-test', taxonomyVersion: 'e2e-test',
    };

    const run = await base44.asServiceRole.entities.ResearchRun.create({
      organization_id: testOrg.id,
      status: 'queued', requested_target: 5, leads_saved: 0,
      duplicates_skipped: 0, no_match_count: 0, outside_radius_count: 0, raw_hits: 0,
      progress_percent: 0, batch_index: 0,
      current_step: 'E2E Test: wird gestartet…',
      search_center_city: city, search_radius_km: radiusKm,
      target_customer_types: targetCustomerTypes.join(', '),
      search_plan_json: JSON.stringify(searchPlanData),
      seen_place_ids: JSON.stringify([]),
      started_at: new Date().toISOString(),
      created_by: user.email,
      taxonomy_version: 'e2e-test', industry_id: industryId,
    });
    console.info(`[e2eTest] ✅ ResearchRun erstellt: ${run.id}`);

    // ── SCHRITT 5: processResearchRun aufrufen ────────────────────────────────
    // Wir nutzen einen HTTP-Direktaufruf mit dem Service-Role-Token.
    // Das umgeht das Problem mit base44.functions.invoke Auth-Forwarding zwischen Backend Functions.
    console.info('[e2eTest] Schritt 5: Verarbeite ResearchRun...');
    const maxIterations = 20;
    const maxNoProgress = 4;
    let iteration = 0, noProgressCount = 0, lastLeadsSaved = -1;
    let runStatus = 'queued', leadsSaved = 0;

    // Base44 App-ID für Function-URL
    const appId = Deno.env.get("BASE44_APP_ID");
    const processRunUrl = `https://api.base44.com/api/apps/${appId}/functions/processResearchRun`;

    while (iteration < maxIterations && !['completed', 'partial', 'failed'].includes(runStatus)) {
      iteration++;

      // HTTP-Aufruf mit asServiceRole — wir nutzen den base44 Service Role Token
      // Alternativ: direkt processResearchRun-Logik inline (aber zu viel Duplikation)
      // Hier: processResearchRun wird direkt via HTTP aufgerufen mit Admin-Bearer-Token
      let processRes = null;
      try {
        // Wir brauchen den Auth-Token. base44.functions.invoke hängt ihn an.
        // Da wir in einer Backend-Funktion sind, nutzen wir asServiceRole.functions falls verfügbar.
        processRes = await base44.asServiceRole.functions.invoke('processResearchRun', {
          research_run_id: run.id,
        });
      } catch (e) {
        // Fallback: Run direkt aus DB lesen
        const dbRun = await base44.asServiceRole.entities.ResearchRun.filter({ id: run.id }).then(r => r[0]);
        console.warn(`[e2eTest] invoke error: ${e?.message} | DB status: ${dbRun?.status}`);
        // Wenn der Run noch queued ist, versuchen wir ihn manuell zu aktivieren
        if (dbRun?.status === 'queued' && iteration === 1) {
          // Trigger: status auf running setzen damit ein manueller processResearchRun-Aufruf klappt
          await base44.asServiceRole.entities.ResearchRun.update(run.id, { status: 'running', current_step: 'E2E: Manuell gestartet' }).catch(() => {});
        }
        runStatus = dbRun?.status || runStatus;
        leadsSaved = dbRun?.leads_saved || leadsSaved;
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      runStatus = processRes?.status || runStatus;
      leadsSaved = processRes?.leads_saved ?? leadsSaved;
      const progress = processRes?.progress_percent || 0;

      console.info(`[e2eTest] Iter ${iteration}: status=${runStatus}, leads=${leadsSaved}, progress=${progress}%`);

      if (!processRes?.success && !processRes?.done) {
        console.warn(`[e2eTest] issue: ${processRes?.error || JSON.stringify(processRes).slice(0, 100)}`);
      }

      // Abbruch nur wenn mehrfach kein Fortschritt
      if (leadsSaved === lastLeadsSaved && runStatus === 'running') {
        noProgressCount++;
        console.warn(`[e2eTest] Kein Fortschritt ${noProgressCount}/${maxNoProgress}`);
        if (noProgressCount >= maxNoProgress) {
          console.error('[e2eTest] Abbruch: mehrfach kein Fortschritt');
          break;
        }
      } else {
        noProgressCount = 0;
        lastLeadsSaved = leadsSaved;
      }

      if (!['completed', 'partial', 'failed'].includes(runStatus)) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    console.info(`[e2eTest] Run beendet: status=${runStatus}, leads=${leadsSaved}`);

    // ── SCHRITT 6: Alle Quellen vergleichen ───────────────────────────────────
    console.info('[e2eTest] Schritt 6: Quellen vergleichen...');

    // 1s warten vor finaler Messung, dann Supabase mit 3 Retries
    await new Promise(r => setTimeout(r, 1000));
    const [finalCompanies, finalRun, finalUsage, finalSupabase] = await Promise.all([
      base44.asServiceRole.entities.Company.filter({ organization_id: testOrg.id }),
      base44.asServiceRole.entities.ResearchRun.filter({ id: run.id }).then(r => r[0]),
      base44.asServiceRole.entities.UsageLog.filter({ organization_id: testOrg.id, period_month: periodMonth }),
      getSupabaseMonthlyCount(testOrg.id, periodMonth, 3),
    ]);

    const nonQuota = new Set(['manual_setup', 'csv_import', 'manual', 'import']);
    const researchCompanies = finalCompanies.filter(c =>
      c.research_run_id && !nonQuota.has(c.research_run_id) &&
      c.quelle !== 'Manuell' && c.quelle !== 'CSV Import' &&
      c.source_provider !== 'manual' && c.source_provider !== 'csv_import'
    );

    const final = {
      companies_count: researchCompanies.length,
      research_run_leads_saved: finalRun?.leads_saved || 0,
      research_run_status: finalRun?.status || 'unknown',
      usageLog_leads_created: finalUsage[0]?.leads_created || 0,
      supabase_monthly_used: finalSupabase ?? 'unavailable',
    };

    const delta = {
      companies: final.companies_count - baseline.companies,
      usageLog: final.usageLog_leads_created - baseline.usageLog_leads_created,
      supabase: typeof final.supabase_monthly_used === 'number'
        ? final.supabase_monthly_used - baseline.supabase_monthly_used
        : 'unavailable',
    };

    const expectedLeads = leadsSaved;
    const supabaseDelta = typeof delta.supabase === 'number' ? delta.supabase : null;

    const companiesMatch = delta.companies === expectedLeads;
    const runMatch = final.research_run_leads_saved === expectedLeads;
    const usageMatch = delta.usageLog === expectedLeads;
    const supabaseMatch = supabaseDelta === null || supabaseDelta === expectedLeads;
    const allMatch = companiesMatch && runMatch && usageMatch && supabaseMatch;

    let verdict;
    if (expectedLeads === 0) {
      verdict = {
        status: '⚠️ NO_LEADS',
        message: 'Keine Leads gefunden (Google Places API oder Taxonomie)',
        details: [
          `Run status: ${finalRun?.status}`,
          `Error: ${finalRun?.error_message || 'none'}`,
          `zero_result_cause: ${finalRun?.zero_result_cause || 'none'}`,
        ],
      };
    } else if (allMatch) {
      verdict = {
        status: '✅ PASS',
        message: `Alle Quellen übereinstimmend: +${expectedLeads} Leads`,
        details: [
          `✅ Companies (delta): +${delta.companies}`,
          `✅ ResearchRun.leads_saved: ${final.research_run_leads_saved}`,
          `✅ UsageLog (delta): +${delta.usageLog}`,
          `${supabaseDelta !== null ? `✅ Supabase (delta): +${supabaseDelta}` : '⚠️ Supabase: unavailable (non-blocking)'}`,
        ],
      };
    } else {
      verdict = {
        status: '❌ FAIL',
        message: 'Quellen stimmen NICHT überein',
        details: [
          `${companiesMatch ? '✅' : '❌'} Companies (delta): +${delta.companies} (erwartet +${expectedLeads})`,
          `${runMatch ? '✅' : '❌'} ResearchRun.leads_saved: ${final.research_run_leads_saved} (erwartet ${expectedLeads})`,
          `${usageMatch ? '✅' : '❌'} UsageLog (delta): +${delta.usageLog} (erwartet +${expectedLeads})`,
          `${supabaseDelta !== null ? (supabaseMatch ? '✅' : '❌') : '⚠️'} Supabase (delta): ${supabaseDelta !== null ? `+${supabaseDelta}` : 'unavailable'} (erwartet +${expectedLeads})`,
        ],
      };
    }

    console.info(`[e2eTest] ${verdict.status}: ${verdict.message}`);
    verdict.details.forEach(d => console.info(`[e2eTest]   ${d}`));

    return Response.json({
      success: allMatch && expectedLeads > 0,
      verdict,
      test_org_id: testOrg.id,
      research_run_id: run.id,
      period_month: periodMonth,
      baseline,
      final,
      delta,
      iterations_used: iteration,
      cleanup_note: `Cleanup: POST {cleanup_only: true, org_id_to_cleanup: "${testOrg.id}"}`,
    });

  } catch (error) {
    console.error('[e2eTest] Error:', error?.message, error?.stack);
    return Response.json({ error: error?.message, success: false }, { status: 500 });
  }
});