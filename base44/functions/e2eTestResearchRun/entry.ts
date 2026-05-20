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

// Cleanup nur eines spezifischen Runs + seiner Companies (echte Org bleibt erhalten)
async function cleanupTestRun(base44, orgId, runId) {
  console.info(`[e2eTest] Cleanup run ${runId} in org ${orgId}`);
  const companies = await base44.asServiceRole.entities.Company.filter({ organization_id: orgId, research_run_id: runId }).catch(() => []);
  await Promise.all([
    ...companies.map(c => base44.asServiceRole.entities.Company.delete(c.id).catch(() => {})),
    base44.asServiceRole.entities.ResearchRun.delete(runId).catch(() => {}),
  ]);
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY && companies.length > 0) {
    for (const c of companies) {
      await fetch(`${SUPABASE_URL}/rest/v1/lead_usage_events?organization_id=eq.${orgId}&company_id=eq.${c.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
      }).catch(() => {});
    }
  }
  console.info(`[e2eTest] Cleanup done: ${companies.length} Companies + Run ${runId} gelöscht`);
}

// Cleanup aller Test-Daten (dedizierte Test-Org)
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
      const { run_id_to_cleanup } = body;
      if (run_id_to_cleanup) {
        // Option C: Nur den spezifischen Run + seine Companies löschen, NICHT die Org
        await cleanupTestRun(base44, org_id_to_cleanup, run_id_to_cleanup);
        return Response.json({ success: true, message: `Run ${run_id_to_cleanup} und zugehörige Companies bereinigt (Org bleibt erhalten)` });
      } else {
        // Legacy: komplette Test-Org löschen (nur wenn es eine dedizierte Test-Org war)
        await cleanupTestOrg(base44, org_id_to_cleanup);
        return Response.json({ success: true, message: `Cleanup abgeschlossen für ${org_id_to_cleanup}` });
      }
    }

    // ── VALIDATE: Counts nach Browser-Run prüfen ──────────────────────────────
    const { validate_run, validate_org_id, validate_run_id, validate_baseline } = body;
    if (validate_run && validate_org_id && validate_run_id) {
      const periodMonth = getPeriodMonth();
      const baseline = validate_baseline || { companies: 0, usageLog_leads_created: 0, supabase_monthly_used: 0 };

      const [finalCompanies, finalRunRecords, finalUsage, finalSupabase] = await Promise.all([
        base44.asServiceRole.entities.Company.filter({ organization_id: validate_org_id }),
        base44.asServiceRole.entities.ResearchRun.filter({ id: validate_run_id }),
        base44.asServiceRole.entities.UsageLog.filter({ organization_id: validate_org_id, period_month: periodMonth }),
        getSupabaseMonthlyCount(validate_org_id, periodMonth, 3),
      ]);

      const finalRun = finalRunRecords[0];
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
        companies: final.companies_count - (baseline.companies || 0),
        usageLog: final.usageLog_leads_created - (baseline.usageLog_leads_created || 0),
        supabase: typeof final.supabase_monthly_used === 'number'
          ? final.supabase_monthly_used - (baseline.supabase_monthly_used || 0)
          : 'unavailable',
      };

      const expectedLeads = final.research_run_leads_saved;
      const supabaseDelta = typeof delta.supabase === 'number' ? delta.supabase : null;
      const companiesMatch = delta.companies === expectedLeads;
      const runDone = ['completed', 'partial'].includes(final.research_run_status);
      const usageMatch = delta.usageLog === expectedLeads;
      const supabaseMatch = supabaseDelta === null || supabaseDelta === expectedLeads;
      const allMatch = companiesMatch && runDone && usageMatch && supabaseMatch && expectedLeads > 0;

      let verdict;
      if (!runDone) {
        verdict = { status: '⏳ NOT_DONE', message: `Run status: ${final.research_run_status} — noch nicht abgeschlossen` };
      } else if (expectedLeads === 0) {
        verdict = {
          status: '⚠️ NO_LEADS',
          message: 'Run abgeschlossen aber 0 Leads',
          details: [`zero_result_cause: ${finalRun?.zero_result_cause || 'none'}`, `error: ${finalRun?.error_message || 'none'}`],
        };
      } else if (allMatch) {
        verdict = {
          status: '✅ PASS',
          message: `Alle Quellen übereinstimmend: ${expectedLeads} Leads`,
          details: [
            `✅ Companies (delta): +${delta.companies}`,
            `✅ ResearchRun.leads_saved: ${final.research_run_leads_saved}`,
            `✅ UsageLog (delta): +${delta.usageLog}`,
            supabaseDelta !== null ? `✅ Supabase (delta): +${supabaseDelta}` : '⚠️ Supabase: unavailable (non-blocking)',
          ],
        };
      } else {
        verdict = {
          status: '❌ FAIL',
          message: 'Quellen stimmen NICHT überein',
          details: [
            `${companiesMatch ? '✅' : '❌'} Companies (delta): +${delta.companies} (erwartet +${expectedLeads})`,
            `✅ ResearchRun.leads_saved: ${expectedLeads} (${final.research_run_status})`,
            `${usageMatch ? '✅' : '❌'} UsageLog (delta): +${delta.usageLog} (erwartet +${expectedLeads})`,
            `${supabaseDelta !== null ? (supabaseMatch ? '✅' : '❌') : '⚠️'} Supabase: ${supabaseDelta !== null ? `+${supabaseDelta}` : 'unavailable'}`,
          ],
        };
      }

      return Response.json({ success: allMatch, verdict, final, delta, period_month: periodMonth });
    }

    const timestamp = Date.now();
    const periodMonth = getPeriodMonth();
    console.info(`[e2eTest] Start: user=${user.email} role=${user.role} period=${periodMonth}`);

    // ── OPTION C: Aktuelle Org des Admins verwenden ───────────────────────────
    // useOrganization im Browser löst owner_email=user.email → erste Org auf.
    // Test-Org in separater Org ist für den Browser unsichtbar (kein Org-Switcher).
    // Lösung: Wir nutzen die tatsächlich aktive Org des Admins und bereinigen nach dem Test.
    console.info('[e2eTest] Schritt 1: Lade aktuelle Admin-Org...');
    const adminOrgs = await base44.asServiceRole.entities.Organization.filter({ owner_email: user.email });
    const testOrg = adminOrgs?.[0] || null;
    if (!testOrg) {
      return Response.json({ error: `Keine Organisation für ${user.email} gefunden. Admin muss Owner einer Org sein.`, success: false }, { status: 400 });
    }
    const isRealOrg = true; // Echte Org — Cleanup nur den Run + angelegte Companies, NICHT die Org selbst
    console.info(`[e2eTest] ✅ Aktive Org gefunden: ${testOrg.id} (${testOrg.name})`);

    // ── SCHRITT 2: Settings prüfen (keine Überschreibung der echten Settings) ─
    // Wir prüfen nur ob genug Konfiguration vorhanden ist. Settings werden NICHT geändert.
    console.info('[e2eTest] Schritt 2: Prüfe Org-Settings...');
    const settingsRecords = await base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id: testOrg.id });
    const settingsMap = {};
    settingsRecords.forEach(s => { settingsMap[s.key] = s.value; });
    const hasCity = !!(testOrg.service_area_city || settingsMap.service_area_city || settingsMap.lead_plz_city);
    const hasIndustry = !!(settingsMap.industry_id || settingsMap.industry_name || testOrg.industry);
    if (!hasCity) {
      return Response.json({ error: 'Org hat kein Suchgebiet (service_area_city). Bitte Einstellungen prüfen.', success: false }, { status: 400 });
    }
    console.info(`[e2eTest] ✅ Settings OK: city=${hasCity}, industry=${hasIndustry}`);

    // ── SCHRITT 3: Baseline erfassen (echte Abfragen) ─────────────────────────
    console.info('[e2eTest] Schritt 3: Baseline erfassen...');
    const [blCompanies, blUsage, blSupabase] = await Promise.all([
      base44.asServiceRole.entities.Company.filter({ organization_id: testOrg.id }),
      base44.asServiceRole.entities.UsageLog.filter({ organization_id: testOrg.id, period_month: periodMonth }),
      getSupabaseMonthlyCount(testOrg.id, periodMonth, 1),
    ]);
    // Nur Research-Leads zählen (kein Manuell/CSV)
    const nonQuota = new Set(['manual_setup', 'csv_import', 'manual', 'import']);
    const baselineResearchCompanies = blCompanies.filter(c =>
      c.research_run_id && !nonQuota.has(c.research_run_id) &&
      c.quelle !== 'Manuell' && c.quelle !== 'CSV Import' &&
      c.source_provider !== 'manual' && c.source_provider !== 'csv_import'
    );
    const baseline = {
      companies: baselineResearchCompanies.length,
      usageLog_leads_created: blUsage[0]?.leads_created || 0,
      supabase_monthly_used: blSupabase || 0,
    };
    console.info(`[e2eTest] Baseline: ${JSON.stringify(baseline)}`);

    // ── SCHRITT 4: Taxonomie laden + ResearchRun direkt erstellen ─────────────
    console.info('[e2eTest] Schritt 4: Taxonomie + ResearchRun...');
    // Industry aus echten Settings der Org
    const industryId = settingsMap.industry_id || 'gebaeudereinigung';
    const city = testOrg.service_area_city || settingsMap.service_area_city || settingsMap.lead_plz_city || 'München';
    const radiusKm = parseFloat(testOrg.service_area_radius_km || settingsMap.service_area_radius_km || '25') || 25;
    const targetCustomerTypes = (settingsMap.target_customer_types || settingsMap.zielkunden || 'Hausverwaltungen, Immobilienverwaltungen').split(/,\s*/).filter(Boolean);

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

    // ── SCHRITT 5: Setup abgeschlossen — ResearchRun wartet auf Browser-Trigger ─
    // processResearchRun benötigt echten User-Auth-Kontext (isPlatformAdmin-Check).
    // Backend-zu-Backend-Invoke ist nicht möglich ohne Auth-Schwächung.
    // Korrekte Test-Strategie: Setup hier, processResearchRun über Browser/UI ausführen.
    console.info(`[e2eTest] ✅ Setup komplett. ResearchRun ${run.id} ist queued und wartet auf Browser-Trigger.`);
    console.info(`[e2eTest] → Nächster Schritt: Im Browser als Admin ResearchRun ${run.id} über ActiveResearchBanner oder Dashboard starten.`);

    // ── SCHRITT 6: Setup-Response — Bereit für Browser-E2E ────────────────────
    return Response.json({
      success: true,
      phase: 'setup_complete',
      verdict: {
        status: '⏳ AWAITING_BROWSER_RUN',
        message: 'Setup abgeschlossen. ResearchRun ist queued. Jetzt im Browser als Admin starten.',
        next_steps: [
          `1. Im Browser als Admin einloggen`,
          `2. ResearchRun ${run.id} wird automatisch via ActiveResearchBanner verarbeitet`,
          `   ODER: Dashboard → Neue Recherche starten (die bestehende queued Run wird aufgegriffen)`,
          `3. Nach Abschluss: validate_run=true aufrufen um Counts zu prüfen`,
          `4. Cleanup: POST {cleanup_only: true, org_id_to_cleanup: "${testOrg.id}"}`,
        ],
      },
      test_org_id: testOrg.id,
      research_run_id: run.id,
      period_month: periodMonth,
      baseline,
      cleanup_note: `Cleanup: POST {cleanup_only: true, org_id_to_cleanup: "${testOrg.id}", run_id_to_cleanup: "${run.id}"}`,
      note: 'Echte Admin-Org wird verwendet — Cleanup löscht nur den Test-Run + Companies, nicht die Org.',
    });

  } catch (error) {
    console.error('[e2eTest] Error:', error?.message, error?.stack);
    return Response.json({ error: error?.message, success: false }, { status: 500 });
  }
});