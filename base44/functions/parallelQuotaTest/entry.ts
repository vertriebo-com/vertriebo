/**
 * PARALLEL QUOTA TEST - 299/300 → 300/300
 * =========================================
 * 
 * Test-Szenario:
 * 1. Setup: 299/300 Leads simulieren
 * 2. Zwei parallele processResearchRun-Aufrufe starten
 * 3. Validieren: Nur EIN Run erstellt Lead 300
 * 4. Endstand muss exakt 300/300 sein
 * 
 * Ausführung:
 * - In Test-Datenbank (data_env="dev")
 * - Via Backend Function oder direkt im Console
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TEST_ORG_OWNER = "test+quota@example.com";
const PERIOD_MONTH = "2026-05";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Admin-only für Tests
    if (!user || !["admin", "platform_owner", "platform_admin"].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body || {};

    // ── ACTION: SETUP ────────────────────────────────────────────────────────
    if (action === 'setup') {
      return Response.json(await setupTest(base44));
    }

    // ── ACTION: PARALLEL TEST ───────────────────────────────────────────────
    if (action === 'run_test') {
      return Response.json(await runParallelTest(base44));
    }

    // ── ACTION: VALIDATE ────────────────────────────────────────────────────
    if (action === 'validate') {
      return Response.json(await validateResults(base44));
    }

    // ── ACTION: CLEANUP ─────────────────────────────────────────────────────
    if (action === 'cleanup') {
      return Response.json(await cleanupTest(base44));
    }

    return Response.json({
      error: 'Unknown action. Use: setup, run_test, validate, cleanup',
      actions: {
        setup: 'Create test org + 299/300 leads',
        run_test: 'Start two parallel research runs',
        validate: 'Check results (300/300)',
        cleanup: 'Delete test data',
      },
    });

  } catch (error) {
    console.error('[parallelQuotaTest] Error:', error?.message);
    return Response.json({ error: error?.message || 'Unbekannter Fehler', success: false }, { status: 500 });
  }
});

// ── SETUP: 299/300 SIMULATION ───────────────────────────────────────────────

async function setupTest(base44) {
  console.log('[setupTest] Starting setup...');

  // 1. Test-Organisation erstellen
  let testOrg = (await base44.asServiceRole.entities.Organization.filter({ 
    owner_email: TEST_ORG_OWNER 
  }))[0];

  if (!testOrg) {
    testOrg = await base44.asServiceRole.entities.Organization.create({
      name: "Quota Test Org",
      owner_email: TEST_ORG_OWNER,
      plan_id: "plan_starter", // 300 Leads/Monat
      billing_status: "active",
      trial_stage: "paid",
      onboarding_done: true,
    });
    console.log(`[setupTest] Created test org: ${testOrg.id}`);
  }

  // 2. Bestehende QuotaReservations löschen
  const existingSlots = await base44.asServiceRole.entities.QuotaReservation.filter({
    organization_id: testOrg.id,
    period_month: PERIOD_MONTH,
  });

  for (const slot of existingSlots) {
    await base44.asServiceRole.entities.QuotaReservation.delete({ id: slot.id });
  }
  console.log(`[setupTest] Deleted ${existingSlots.length} existing slots`);

  // 3. 299 Companies + Slots erstellen
  console.log('[setupTest] Creating 299 companies + slots...');
  for (let i = 1; i <= 299; i++) {
    const company = await base44.asServiceRole.entities.Company.create({
      organization_id: testOrg.id,
      name: `Test Company ${i}`,
      branche: "Test Branche",
      ort: "Berlin",
      plz: "10115",
      adresse: `Teststraße ${i}`,
      status: "Neu",
      quelle: "manual",
      research_run_id: "manual_setup",
    });

    await base44.asServiceRole.entities.QuotaReservation.create({
      organization_id: testOrg.id,
      period_month: PERIOD_MONTH,
      slot_number: i,
      research_run_id: "manual_setup",
      company_id: company.id,
      status: "committed",
      committed_at: new Date().toISOString(),
    });

    if (i % 50 === 0) {
      console.log(`[setupTest] Progress: ${i}/299`);
    }
  }

  // 4. UsageLog synchronisieren
  const usageLogs = await base44.asServiceRole.entities.UsageLog.filter({
    organization_id: testOrg.id,
    period_month: PERIOD_MONTH,
  });

  const [y, m] = PERIOD_MONTH.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59)).toISOString();

  if (usageLogs[0]) {
    await base44.asServiceRole.entities.UsageLog.update(usageLogs[0].id, {
      leads_created: 299,
      lead_generations_used: 1,
      period_start: start,
      period_end: end,
    });
  } else {
    await base44.asServiceRole.entities.UsageLog.create({
      organization_id: testOrg.id,
      period_month: PERIOD_MONTH,
      period_start: start,
      period_end: end,
      leads_created: 299,
      lead_generations_used: 1,
    });
  }

  console.log('[setupTest] Setup complete: 299/300');

  return {
    success: true,
    message: 'Setup complete: 299/300',
    test_org_id: testOrg.id,
    companies_created: 299,
    slots_created: 299,
    current_usage: 299,
    monthly_limit: 300,
  };
}

// ── PARALLEL TEST: TWO RUNS ─────────────────────────────────────────────────

async function runParallelTest(base44) {
  console.log('[runParallelTest] Starting parallel test...');
  const startTime = Date.now();

  // Test-Organisation finden
  const testOrgs = await base44.asServiceRole.entities.Organization.filter({ 
    owner_email: TEST_ORG_OWNER 
  });
  const testOrg = testOrgs[0];

  if (!testOrg) {
    throw new Error('Test org not found. Run setup first.');
  }

  // Minimalen Suchplan erstellen
  const searchPlan = {
    industry: "Test Industry",
    industryId: "test_industry",
    city: "Berlin",
    radiusKm: 10,
    radiusMeters: 10000,
    trialStage: "paid",
    effectiveTarget: 1,
    targetCustomerTypes: ["Test Customer"],
    excludedCustomerTypes: [],
    cityCoords: { lat: 52.52, lng: 13.405 },
    allPoints: [{ lat: 52.52, lng: 13.405, centerLat: 52.52, centerLng: 13.405, centerCity: "Berlin" }],
    allCenters: [{ lat: 52.52, lng: 13.405, city: "Berlin" }],
    taxonomyProfile: {
      searchableBusinessCategories: ["Test Business"],
      searchKeywordVariants: { "Test Business": ["Test Business Berlin"] },
      queryPriority: ["Test Business"],
      targetCustomerTypes: ["Test Customer"],
      scoringSignals: ["test"],
      scoringSignalWeights: { "test": 12 },
      badFitSignals: [],
      badFitSignalWeights: {},
      negativeKeywords: [],
      searchStrategy: "target_customer_search",
      placeTypeConfidence: "medium",
      googlePlaceTypes: [],
    },
    taxonomyHash: "test_hash",
    taxonomyVersion: "test_v1",
  };

  // Zwei ResearchRuns erstellen
  const [runA, runB] = await Promise.all([
    base44.asServiceRole.entities.ResearchRun.create({
      organization_id: testOrg.id,
      status: "queued",
      run_type: "new_leads",
      requested_target: 1,
      search_plan_json: JSON.stringify(searchPlan),
      created_by: TEST_ORG_OWNER,
    }),
    base44.asServiceRole.entities.ResearchRun.create({
      organization_id: testOrg.id,
      status: "queued",
      run_type: "new_leads",
      requested_target: 1,
      search_plan_json: JSON.stringify(searchPlan),
      created_by: TEST_ORG_OWNER,
    }),
  ]);

  console.log(`[runParallelTest] Run A: ${runA.id}`);
  console.log(`[runParallelTest] Run B: ${runB.id}`);

  // BEIDE PARALLEL STARTEN (KRITISCH: Kein await zwischen den Calls!)
  console.log('[runParallelTest] 🚀 Starting both runs in parallel...');
  
  const [resultA, resultB] = await Promise.all([
    base44.functions.invoke("processResearchRun", { research_run_id: runA.id }),
    base44.functions.invoke("processResearchRun", { research_run_id: runB.id }),
  ]);

  const duration = Date.now() - startTime;
  console.log(`[runParallelTest] ⏱️ Duration: ${duration}ms`);

  // Ergebnisse loggen
  console.log('[runParallelTest] Result A:', JSON.stringify(resultA, null, 2));
  console.log('[runParallelTest] Result B:', JSON.stringify(resultB, null, 2));

  return {
    success: true,
    duration_ms: duration,
    run_a: {
      id: runA.id,
      result: resultA,
    },
    run_b: {
      id: runB.id,
      result: resultB,
    },
    message: 'Parallel test complete. Run validate action to check results.',
  };
}

// ── VALIDATE: CHECK RESULTS ─────────────────────────────────────────────────

async function validateResults(base44) {
  console.log('[validateResults] Starting validation...');

  // Test-Organisation finden
  const testOrgs = await base44.asServiceRole.entities.Organization.filter({ 
    owner_email: TEST_ORG_OWNER 
  });
  const testOrg = testOrgs[0];

  if (!testOrg) {
    throw new Error('Test org not found');
  }

  // 1. QuotaReservations prüfen
  const allSlots = await base44.asServiceRole.entities.QuotaReservation.filter({
    organization_id: testOrg.id,
    period_month: PERIOD_MONTH,
  });

  const committedSlots = allSlots.filter(s => s.status === "committed");
  const reservedSlots = allSlots.filter(s => s.status === "reserved");

  console.log(`[validateResults] Total slots: ${allSlots.length}`);
  console.log(`[validateResults] Committed: ${committedSlots.length}`);
  console.log(`[validateResults] Reserved: ${reservedSlots.length}`);

  // 2. Duplikate prüfen
  const slotNumbers = allSlots.map(s => s.slot_number);
  const uniqueSlotNumbers = [...new Set(slotNumbers)];
  const hasDuplicates = slotNumbers.length !== uniqueSlotNumbers.length;

  console.log(`[validateResults] Unique check: ${uniqueSlotNumbers.length}/${slotNumbers.length}`);
  if (hasDuplicates) {
    const duplicates = slotNumbers.filter((num, idx) => slotNumbers.indexOf(num) !== idx);
    console.error('[validateResults] DUPLICATES:', duplicates);
  }

  // 3. UsageLog prüfen
  const usageLogs = await base44.asServiceRole.entities.UsageLog.filter({
    organization_id: testOrg.id,
    period_month: PERIOD_MONTH,
  });
  const usageLog = usageLogs[0];

  console.log(`[validateResults] UsageLog.leads_created: ${usageLog?.leads_created || 0}`);

  // 4. Companies prüfen
  const newCompanies = await base44.asServiceRole.entities.Company.filter({
    organization_id: testOrg.id,
    research_run_id: { $in: ["manual_setup"] },
  });

  // Nur Companies aus diesem Test (exclude manual_setup)
  const testCompanies = await base44.asServiceRole.entities.Company.filter({
    organization_id: testOrg.id,
  });
  
  const testRunCompanies = testCompanies.filter(c => 
    c.research_run_id && c.research_run_id !== "manual_setup"
  );

  console.log(`[validateResults] Total companies: ${testCompanies.length}`);
  console.log(`[validateResults] Test run companies: ${testRunCompanies.length}`);

  // 5. Erfolgskriterien prüfen
  const errors = [];
  const checks = {
    committed_slots_300: committedSlots.length === 300,
    reserved_slots_0: reservedSlots.length === 0,
    no_duplicates: !hasDuplicates,
    usage_300: (usageLog?.leads_created || 0) === 300,
    one_company_created: testRunCompanies.length === 1,
  };

  for (const [check, passed] of Object.entries(checks)) {
    console.log(`[validateResults] ${passed ? '✅' : '❌'} ${check}: ${passed}`);
    if (!passed) {
      errors.push(`Check failed: ${check}`);
    }
  }

  const passed = errors.length === 0;

  return {
    success: passed,
    message: passed ? '✅ TEST PASSED: All criteria met!' : '❌ TEST FAILED',
    errors,
    checks,
    stats: {
      total_slots: allSlots.length,
      committed_slots: committedSlots.length,
      reserved_slots: reservedSlots.length,
      unique_slots: uniqueSlotNumbers.length,
      has_duplicates: hasDuplicates,
      usage_leads_created: usageLog?.leads_created || 0,
      test_companies_created: testRunCompanies.length,
    },
  };
}

// ── CLEANUP: DELETE TEST DATA ───────────────────────────────────────────────

async function cleanupTest(base44) {
  console.log('[cleanupTest] Starting cleanup...');

  const testOrgs = await base44.asServiceRole.entities.Organization.filter({ 
    owner_email: TEST_ORG_OWNER 
  });
  const testOrg = testOrgs[0];

  if (!testOrg) {
    return { success: false, error: 'Test org not found' };
  }

  // Companies löschen (außer manual_setup)
  const companies = await base44.asServiceRole.entities.Company.filter({
    organization_id: testOrg.id,
  });
  
  const testCompanies = companies.filter(c => 
    c.research_run_id && c.research_run_id !== "manual_setup"
  );

  for (const company of testCompanies) {
    await base44.asServiceRole.entities.Company.delete({ id: company.id });
  }
  console.log(`[cleanupTest] Deleted ${testCompanies.length} companies`);

  // QuotaReservations löschen
  const slots = await base44.asServiceRole.entities.QuotaReservation.filter({
    organization_id: testOrg.id,
    period_month: PERIOD_MONTH,
  });

  for (const slot of slots) {
    await base44.asServiceRole.entities.QuotaReservation.delete({ id: slot.id });
  }
  console.log(`[cleanupTest] Deleted ${slots.length} slots`);

  // UsageLog löschen
  const usageLogs = await base44.asServiceRole.entities.UsageLog.filter({
    organization_id: testOrg.id,
    period_month: PERIOD_MONTH,
  });

  for (const log of usageLogs) {
    await base44.asServiceRole.entities.UsageLog.delete({ id: log.id });
  }
  console.log(`[cleanupTest] Deleted ${usageLogs.length} usage logs`);

  // ResearchRuns löschen
  const runs = await base44.asServiceRole.entities.ResearchRun.filter({
    organization_id: testOrg.id,
  });

  for (const run of runs) {
    await base44.asServiceRole.entities.ResearchRun.delete({ id: run.id });
  }
  console.log(`[cleanupTest] Deleted ${runs.length} research runs`);

  return {
    success: true,
    message: 'Cleanup complete',
    deleted: {
      companies: testCompanies.length,
      slots: slots.length,
      usage_logs: usageLogs.length,
      research_runs: runs.length,
    },
  };
}