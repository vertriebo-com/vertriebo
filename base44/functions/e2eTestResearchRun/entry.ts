/**
 * e2eTestResearchRun
 * ==================
 * Automatisierter E2E-Test für ResearchRun mit frischer Test-Organisation.
 * 
 * Ablauf:
 * 1. Neue Test-Organisation erstellen (mit Owner-User)
 * 2. OrganizationSettings setzen (Branche, Zielkunden, Stadt)
 * 3. Baseline erfassen (Companies, UsageLog, Supabase)
 * 4. startResearchRun aufrufen
 * 5. processResearchRun mehrfach aufrufen bis completed/partial
 * 6. Alle Quellen vergleichen:
 *    - Companies erstellt
 *    - ResearchRun.leads_saved
 *    - UsageLog.leads_created
 *    - Supabase monthly_used
 *    - Dashboard monthly_used
 * 
 * NUR FÜR PLATFORM ADMINS.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TEST_ORG_PREFIX = 'e2e_test_org_';
const TEST_EMAIL_PREFIX = 'e2e_test_';

// KANONISCH: Kalendermonat Europe/Berlin (YYYY-MM)
function getPeriodMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  return `${y}-${m}`;
}

// Supabase REST Helper
async function supabaseFetch(path, method = 'GET', body = null, extraHeaders = {}) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { error: 'Supabase nicht konfiguriert' };
  }
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data, headers: Object.fromEntries(res.headers.entries()) };
}

// Get Supabase monthly count
async function getSupabaseMonthlyCount(orgId, periodMonth) {
  const res = await supabaseFetch(
    `/lead_usage_events?organization_id=eq.${encodeURIComponent(orgId)}&period_month=eq.${periodMonth}&event_type=eq.research_lead_created`,
    'GET',
    null,
    { 'Prefer': 'count=exact', 'Range': '0-0' }
  );
  
  if (!res.ok) return null;
  const contentRange = res.headers.get('content-range') || '';
  const total = parseInt(contentRange.split('/')[1] || '0', 10);
  return isNaN(total) ? null : total;
}

// Cleanup: Test-Organisation und alle abhängigen Daten löschen
async function cleanupTestOrg(base44, orgId) {
  console.info(`[e2eTest] Cleanup: Lösche Test-Organisation ${orgId}`);
  
  try {
    // Companies löschen
    const companies = await base44.asServiceRole.entities.Company.filter({ organization_id: orgId });
    for (const c of companies) {
      await base44.asServiceRole.entities.Company.delete(c.id).catch(() => {});
    }
    
    // ResearchRuns löschen
    const runs = await base44.asServiceRole.entities.ResearchRun.filter({ organization_id: orgId });
    for (const r of runs) {
      await base44.asServiceRole.entities.ResearchRun.delete(r.id).catch(() => {});
    }
    
    // UsageLog löschen
    const usageLogs = await base44.asServiceRole.entities.UsageLog.filter({ organization_id: orgId });
    for (const u of usageLogs) {
      await base44.asServiceRole.entities.UsageLog.delete(u.id).catch(() => {});
    }
    
    // OrganizationSettings löschen
    const settings = await base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id: orgId });
    for (const s of settings) {
      await base44.asServiceRole.entities.OrganizationSettings.delete(s.id).catch(() => {});
    }
    
    // QuotaReservations löschen (Supabase)
    await supabaseFetch(`/quota_reservations?organization_id=eq.${orgId}`, 'DELETE', null, { 'Prefer': 'return=minimal' }).catch(() => {});
    
    // lead_usage_events löschen (Supabase)
    await supabaseFetch(`/lead_usage_events?organization_id=eq.${orgId}`, 'DELETE', null, { 'Prefer': 'return=minimal' }).catch(() => {});
    
    // Organisation löschen
    await base44.asServiceRole.entities.Organization.delete(orgId).catch(() => {});
    
    console.info(`[e2eTest] Cleanup abgeschlossen für ${orgId}`);
  } catch (e) {
    console.error(`[e2eTest] Cleanup Fehler: ${e?.message}`);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !["admin", "platform_owner", "platform_admin"].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Platform Admin required' }, { status: 403 });
    }
    
    let body = {};
    try { body = await req.json(); } catch {}
    const { cleanup_only, org_id_to_cleanup } = body;
    
    // Cleanup-Only Modus
    if (cleanup_only && org_id_to_cleanup) {
      await cleanupTestOrg(base44, org_id_to_cleanup);
      return Response.json({ success: true, message: `Cleanup abgeschlossen für ${org_id_to_cleanup}` });
    }
    
    const timestamp = Date.now();
    const testOrgId = `${TEST_ORG_PREFIX}${timestamp}`;
    const testEmail = `${TEST_EMAIL_PREFIX}${timestamp}@test.vertriebo.com`;
    const periodMonth = getPeriodMonth();
    
    console.info(`[e2eTest] Starte E2E-Test mit Org=${testOrgId}, Email=${testEmail}`);
    
    // ── SCHRITT 1: Test-Organisation erstellen ────────────────────────────────
    console.info('[e2eTest] Schritt 1: Erstelle Test-Organisation...');
    const testOrg = await base44.asServiceRole.entities.Organization.create({
      name: `E2E Test Organisation ${timestamp}`,
      slug: `e2e-test-${timestamp}`,
      owner_email: testEmail,
      organization_type: 'direct_customer',
      billing_status: 'active',
      platform_status: 'active',
      industry: 'Gebäudereinigung',
      service_area_city: 'München',
      service_area_radius_km: 25,
      onboarding_done: true,
      trial_stage: 'paid',
    });
    
    console.info(`[e2eTest] ✅ Organisation erstellt: ${testOrg.id}`);
    
    // ── SCHRITT 2: OrganizationSettings setzen ────────────────────────────────
    console.info('[e2eTest] Schritt 2: Setze OrganizationSettings...');
    const settings = [
      { organization_id: testOrg.id, key: 'industry_id', value: 'gebaeudereinigung' },
      { organization_id: testOrg.id, key: 'industry_name', value: 'Gebäudereinigung' },
      { organization_id: testOrg.id, key: 'target_customer_types', value: 'Hausverwaltungen, Immobilienverwaltungen, Facility Manager' },
      { organization_id: testOrg.id, key: 'service_area_city', value: 'München' },
      { organization_id: testOrg.id, key: 'service_area_radius_km', value: '25' },
    ];
    
    for (const s of settings) {
      await base44.asServiceRole.entities.OrganizationSettings.create(s);
    }
    
    console.info('[e2eTest] ✅ Settings gesetzt');
    
    // ── SCHRITT 3: Baseline erfassen ─────────────────────────────────────────
    console.info('[e2eTest] Schritt 3: Erfasse Baseline...');
    const baseline = {
      companies: 0,
      usageLog_leads_created: 0,
      supabase_monthly_used: 0,
    };
    
    // Alle 3 Quellen parallel
    const [baselineSupabase] = await Promise.all([
      getSupabaseMonthlyCount(testOrg.id, periodMonth),
    ]);
    
    baseline.supabase_monthly_used = baselineSupabase || 0;
    
    console.info(`[e2eTest] Baseline: Companies=${baseline.companies}, UsageLog=${baseline.usageLog_leads_created}, Supabase=${baseline.supabase_monthly_used}`);
    
    // ── SCHRITT 4: startResearchRun aufrufen ──────────────────────────────────
    console.info('[e2eTest] Schritt 4: Starte ResearchRun...');
    const startRes = await base44.functions.invoke('startResearchRun', {
      organization_id: testOrg.id,
      target_count: 5, // Kleines Target für schnellen Test
    });
    
    if (!startRes.success || !startRes.research_run_id) {
      throw new Error(`startResearchRun failed: ${startRes.error || 'unknown'}`);
    }
    
    const runId = startRes.research_run_id;
    console.info(`[e2eTest] ✅ ResearchRun gestartet: ${runId}`);
    
    // ── SCHRITT 5: processResearchRun bis completed ───────────────────────────
    console.info('[e2eTest] Schritt 5: Verarbeite ResearchRun...');
    let maxIterations = 10;
    let iteration = 0;
    let runStatus = 'queued';
    let leadsSaved = 0;
    
    while (iteration < maxIterations && !['completed', 'partial', 'failed'].includes(runStatus)) {
      iteration++;
      console.info(`[e2eTest] Iteration ${iteration}/${maxIterations}...`);
      
      const processRes = await base44.functions.invoke('processResearchRun', {
        research_run_id: runId,
      });
      
      if (!processRes.success) {
        console.warn(`[e2eTest] processResearchRun warning: ${processRes.error || 'unknown'}`);
      }
      
      runStatus = processRes.status || runStatus;
      leadsSaved = processRes.leads_saved || leadsSaved;
      
      console.info(`[e2eTest] Status: ${runStatus}, leads_saved: ${leadsSaved}`);
      
      // Kurze Pause zwischen Iterationen
      if (!['completed', 'partial', 'failed'].includes(runStatus)) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.info(`[e2eTest] ✅ ResearchRun abgeschlossen: ${runStatus}, leads_saved: ${leadsSaved}`);
    
    // ── SCHRITT 6: Alle Quellen vergleichen ───────────────────────────────────
    console.info('[e2eTest] Schritt 6: Vergleiche alle Quellen...');
    
    const results = {
      test_org_id: testOrg.id,
      test_email: testEmail,
      research_run_id: runId,
      period_month: periodMonth,
      baseline,
      final: {},
      comparison: {},
      verdict: null,
    };
    
    // Companies zählen
    const finalCompanies = await base44.asServiceRole.entities.Company.filter({ organization_id: testOrg.id });
    const nonQuotaRunIds = new Set(['manual_setup', 'csv_import', 'manual', 'import']);
    const researchCompanies = finalCompanies.filter(c => 
      c.research_run_id && 
      !nonQuotaRunIds.has(c.research_run_id) &&
      c.quelle !== 'Manuell' &&
      c.quelle !== 'CSV Import' &&
      c.source_provider !== 'manual' &&
      c.source_provider !== 'csv_import'
    );
    results.final.companies_count = researchCompanies.length;
    
    // ResearchRun laden
    const finalRun = await base44.asServiceRole.entities.ResearchRun.filter({ id: runId }).then(r => r[0]);
    results.final.research_run_leads_saved = finalRun?.leads_saved || 0;
    results.final.research_run_status = finalRun?.status || 'unknown';
    
    // UsageLog laden
    const usageLogs = await base44.asServiceRole.entities.UsageLog.filter({ organization_id: testOrg.id, period_month: periodMonth });
    results.final.usageLog_leads_created = usageLogs[0]?.leads_created || 0;
    
    // Supabase count
    const finalSupabase = await getSupabaseMonthlyCount(testOrg.id, periodMonth);
    results.final.supabase_monthly_used = finalSupabase || 0;
    
    // Dashboard monthly_used (max-Formel)
    const quotaSlots = await base44.asServiceRole.entities.QuotaReservation.filter({ organization_id: testOrg.id, period_month: periodMonth });
    const committedSlots = quotaSlots.filter(s => s.status === 'committed').length;
    const dashboardMonthlyUsed = Math.max(
      committedSlots,
      results.final.usageLog_leads_created,
      results.final.companies_count
    );
    results.final.dashboard_monthly_used = dashboardMonthlyUsed;
    
    // Vergleich
    const expectedCount = leadsSaved;
    results.comparison = {
      expected: expectedCount,
      companies_count: results.final.companies_count,
      research_run_leads_saved: results.final.research_run_leads_saved,
      usageLog_leads_created: results.final.usageLog_leads_created,
      supabase_monthly_used: results.final.supabase_monthly_used,
      dashboard_monthly_used: results.final.dashboard_monthly_used,
      all_match: 
        results.final.companies_count === expectedCount &&
        results.final.research_run_leads_saved === expectedCount &&
        results.final.usageLog_leads_created === expectedCount &&
        results.final.supabase_monthly_used === expectedCount &&
        results.final.dashboard_monthly_used === expectedCount,
    };
    
    // Verdict
    if (results.comparison.all_match && expectedCount > 0) {
      results.verdict = {
        status: '✅ PASS',
        message: `Alle Quellen übereinstimmend: ${expectedCount} Leads erstellt und korrekt gezählt`,
        details: [
          `✅ Companies: ${results.final.companies_count}`,
          `✅ ResearchRun.leads_saved: ${results.final.research_run_leads_saved}`,
          `✅ UsageLog.leads_created: ${results.final.usageLog_leads_created}`,
          `✅ Supabase monthly_used: ${results.final.supabase_monthly_used}`,
          `✅ Dashboard monthly_used: ${results.final.dashboard_monthly_used}`,
        ],
      };
    } else if (expectedCount === 0) {
      results.verdict = {
        status: '⚠️ NO_LEADS',
        message: 'Keine Leads erstellt (kann an Google Places API liegen)',
        details: [
          `ResearchRun status: ${finalRun?.status}`,
          `ResearchRun error: ${finalRun?.error_message || 'none'}`,
        ],
      };
    } else {
      const mismatches = [];
      if (results.final.companies_count !== expectedCount) mismatches.push(`Companies: ${results.final.companies_count} ≠ ${expectedCount}`);
      if (results.final.research_run_leads_saved !== expectedCount) mismatches.push(`ResearchRun: ${results.final.research_run_leads_saved} ≠ ${expectedCount}`);
      if (results.final.usageLog_leads_created !== expectedCount) mismatches.push(`UsageLog: ${results.final.usageLog_leads_created} ≠ ${expectedCount}`);
      if (results.final.supabase_monthly_used !== expectedCount) mismatches.push(`Supabase: ${results.final.supabase_monthly_used} ≠ ${expectedCount}`);
      if (results.final.dashboard_monthly_used !== expectedCount) mismatches.push(`Dashboard: ${results.final.dashboard_monthly_used} ≠ ${expectedCount}`);
      
      results.verdict = {
        status: '❌ FAIL',
        message: `Quellen stimmen NICHT überein: ${mismatches.join(', ')}`,
        details: mismatches,
      };
    }
    
    console.info(`[e2eTest] ${results.verdict.status}: ${results.verdict.message}`);
    
    // Cleanup optional (kann im Nachhinein manuell gemacht werden)
    // await cleanupTestOrg(base44, testOrg.id);
    
    return Response.json({
      success: results.comparison.all_match,
      ...results,
      cleanup_note: 'Test-Organisation wurde NICHT gelöscht. Manuell cleanup mit POST {cleanup_only: true, org_id_to_cleanup: "..."}',
    });
    
  } catch (error) {
    console.error('[e2eTest] Error:', error?.message, error?.stack);
    return Response.json({ error: error?.message, success: false }, { status: 500 });
  }
});