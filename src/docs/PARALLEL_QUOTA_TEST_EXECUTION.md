# Paralleler Quota-Test: 299/300 → 300/300

## Ziel

Nachweis dass bei 299/300 zwei parallele `processResearchRun`-Aufrufe **exakt einen** weiteren Lead erstellen (300/300), nicht zwei (301/300).

## Voraussetzungen

- ✅ Test-Datenbank aktiviert
- ✅ QuotaReservation-Entity mit Unique Constraint
- ✅ processResearchRun mit atomarer Reservierung
- ✅ repairQuotaCommit verfügbar

## Test-Schritte

### Schritt 1: Test-Organisation vorbereiten

```javascript
// Test-Organisation erstellen oder finden
const testOrgs = await base44.entities.Organization.filter({ 
  owner_email: "test@example.com" 
});

const testOrg = testOrgs[0] || await base44.entities.Organization.create({
  name: "Quota Test Org",
  owner_email: "test@example.com",
  plan_id: "plan_starter", // 300 Leads/Monat
  billing_status: "active",
  trial_stage: "paid",
});

console.log(`Test Org: ${testOrg.id} (${testOrg.name})`);
```

### Schritt 2: Usage auf 299/300 setzen

```javascript
const PERIOD_MONTH = "2026-05";

// 1. Bestehende QuotaReservations löschen (Clean Slate)
await base44.entities.QuotaReservation.delete({
  organization_id: testOrg.id,
  period_month: PERIOD_MONTH,
});

// 2. 299 Companies + Slots erstellen
for (let i = 1; i <= 299; i++) {
  const company = await base44.entities.Company.create({
    organization_id: testOrg.id,
    name: `Test Company ${i}`,
    branche: "Test",
    ort: "Berlin",
    status: "Neu",
    quelle: "manual",
  });

  await base44.entities.QuotaReservation.create({
    organization_id: testOrg.id,
    period_month: PERIOD_MONTH,
    slot_number: i,
    research_run_id: "manual_setup",
    company_id: company.id,
    status: "committed",
    committed_at: new Date().toISOString(),
  });
}

// 3. UsageLog synchronisieren
const usageLogs = await base44.entities.UsageLog.filter({
  organization_id: testOrg.id,
  period_month: PERIOD_MONTH,
});

if (usageLogs[0]) {
  await base44.entities.UsageLog.update(usageLogs[0].id, {
    leads_created: 299,
  });
} else {
  await base44.entities.UsageLog.create({
    organization_id: testOrg.id,
    period_month: PERIOD_MONTH,
    period_start: "2026-05-01T00:00:00Z",
    period_end: "2026-05-31T23:59:59Z",
    leads_created: 299,
    lead_generations_used: 1,
  });
}

console.log("✅ Setup complete: 299/300");
```

### Schritt 3: Zwei ResearchRuns erstellen

```javascript
// ResearchRun A
const runA = await base44.entities.ResearchRun.create({
  organization_id: testOrg.id,
  status: "queued",
  run_type: "new_leads",
  requested_target: 1,
  search_plan_json: JSON.stringify({
    industry: "Test Industry",
    city: "Berlin",
    radiusKm: 10,
    trialStage: "paid",
    effectiveTarget: 1,
    // ... minimaler Suchplan
  }),
  created_by: "test@example.com",
});

// ResearchRun B
const runB = await base44.entities.ResearchRun.create({
  organization_id: testOrg.id,
  status: "queued",
  run_type: "new_leads",
  requested_target: 1,
  search_plan_json: JSON.stringify({
    industry: "Test Industry",
    city: "Berlin",
    radiusKm: 10,
    trialStage: "paid",
    effectiveTarget: 1,
  }),
  created_by: "test@example.com",
});

console.log(`Run A: ${runA.id}`);
console.log(`Run B: ${runB.id}`);
```

### Schritt 4: Beide parallel starten (KRITISCH!)

```javascript
console.log("🚀 Starting parallel research runs...");
const startTime = Date.now();

// WICHTIG: Kein await zwischen den Calls!
const [resultA, resultB] = await Promise.all([
  base44.functions.invoke("processResearchRun", { 
    research_run_id: runA.id 
  }),
  base44.functions.invoke("processResearchRun", { 
    research_run_id: runB.id 
  }),
]);

const duration = Date.now() - startTime;
console.log(`⏱️ Duration: ${duration}ms`);

console.log("\n📊 Result A:", JSON.stringify(resultA, null, 2));
console.log("\n📊 Result B:", JSON.stringify(resultB, null, 2));
```

### Schritt 5: Ergebnisse validieren

```javascript
// 1. QuotaReservations prüfen
const allSlots = await base44.entities.QuotaReservation.filter({
  organization_id: testOrg.id,
  period_month: PERIOD_MONTH,
});

const committedSlots = allSlots.filter(s => s.status === "committed");
const reservedSlots = allSlots.filter(s => s.status === "reserved");

console.log("\n📈 QuotaReservation Status:");
console.log(`  Total Slots: ${allSlots.length}`);
console.log(`  Committed: ${committedSlots.length} (erwartet: 300)`);
console.log(`  Reserved: ${reservedSlots.length} (erwartet: 0)`);

// 2. Duplikate prüfen
const slotNumbers = allSlots.map(s => s.slot_number);
const uniqueSlotNumbers = [...new Set(slotNumbers)];

console.log(`\n🔍 Unique Check:`);
console.log(`  Total: ${slotNumbers.length}`);
console.log(`  Unique: ${uniqueSlotNumbers.length}`);

if (slotNumbers.length !== uniqueSlotNumbers.length) {
  console.error("❌ DUPLICATE SLOTS DETECTED!");
  const duplicates = slotNumbers.filter(
    (num, idx) => slotNumbers.indexOf(num) !== idx
  );
  console.error("  Duplicates:", duplicates);
  process.exit(1);
}

// 3. ResearchRuns prüfen
const updatedRunA = await base44.entities.ResearchRun.get(runA.id);
const updatedRunB = await base44.entities.ResearchRun.get(runB.id);

console.log("\n📋 ResearchRun Status:");
console.log(`  Run A: ${updatedRunA.status}, leads_saved=${updatedRunA.leads_saved}`);
console.log(`  Run B: ${updatedRunB.status}, leads_saved=${updatedRunB.leads_saved}`);

// 4. UsageLog prüfen
const updatedUsage = await base44.entities.UsageLog.filter({
  organization_id: testOrg.id,
  period_month: PERIOD_MONTH,
});

console.log("\n📊 UsageLog:");
console.log(`  leads_created: ${updatedUsage[0]?.leads_created || 0} (erwartet: 300)`);

// 5. Companies prüfen
const newCompanies = await base44.entities.Company.filter({
  organization_id: testOrg.id,
  research_run_id: { $in: [runA.id, runB.id] },
});

console.log("\n🏢 New Companies:");
console.log(`  Count: ${newCompanies.length} (erwartet: 1)`);
console.log(`  From Run A: ${newCompanies.filter(c => c.research_run_id === runA.id).length}`);
console.log(`  From Run B: ${newCompanies.filter(c => c.research_run_id === runB.id).length}`);
```

### Schritt 6: Erfolgskriterien prüfen

```javascript
let passed = true;
const errors = [];

// Kriterium 1: Exakt 300 committed Slots
if (committedSlots.length !== 300) {
  passed = false;
  errors.push(`Expected 300 committed slots, got ${committedSlots.length}`);
}

// Kriterium 2: Keine reserved Slots
if (reservedSlots.length > 0) {
  passed = false;
  errors.push(`Expected 0 reserved slots, got ${reservedSlots.length}`);
}

// Kriterium 3: Keine Duplikate
if (slotNumbers.length !== uniqueSlotNumbers.length) {
  passed = false;
  errors.push("Duplicate slot numbers detected");
}

// Kriterium 4: UsageLog = 300
if (updatedUsage[0]?.leads_created !== 300) {
  passed = false;
  errors.push(`Expected 300 leads_created, got ${updatedUsage[0]?.leads_created}`);
}

// Kriterium 5: Genau 1 neue Company
if (newCompanies.length !== 1) {
  passed = false;
  errors.push(`Expected 1 new company, got ${newCompanies.length}`);
}

// Kriterium 6: Ein Run erfolgreich, einer blocked
const oneSuccess = (updatedRunA.leads_saved === 1 && updatedRunB.leads_saved === 0) ||
                   (updatedRunB.leads_saved === 1 && updatedRunA.leads_saved === 0);

if (!oneSuccess) {
  passed = false;
  errors.push("Expected exactly one run to succeed");
}

// Ergebnis
console.log("\n" + "=".repeat(50));
if (passed) {
  console.log("✅ TEST PASSED: All criteria met!");
  console.log("=".repeat(50));
} else {
  console.log("❌ TEST FAILED:");
  errors.forEach(err => console.log(`  - ${err}`));
  console.log("=".repeat(50));
  process.exit(1);
}
```

## Erwartete Ergebnisse

### Erfolgsfall (300/300)

```
📊 Result A: {
  "success": true,
  "done": true,
  "status": "completed",
  "leads_saved": 300,
  "leads_saved_this_batch": 1,
  "message": "300 neue Firmenkontakte gefunden"
}

📊 Result B: {
  "success": true,
  "done": true,
  "status": "completed",
  "leads_saved": 300,
  "leads_saved_this_batch": 0,
  "stop_reason": "monthly_quota_reached",
  "message": "Monatskontingent erreicht (300/300). Recherche gestoppt."
}

📈 QuotaReservation Status:
  Total Slots: 300
  Committed: 300 ✅
  Reserved: 0 ✅

🔍 Unique Check:
  Total: 300
  Unique: 300 ✅

📋 ResearchRun Status:
  Run A: completed, leads_saved=300 ✅
  Run B: completed, leads_saved=300, stop_reason=monthly_quota_reached ✅

📊 UsageLog:
  leads_created: 300 ✅

🏢 New Companies:
  Count: 1 ✅
  From Run A: 1
  From Run B: 0

✅ TEST PASSED: All criteria met!
```

### Fehlerfall (Over-Usage 301/300)

```
❌ TEST FAILED:
  - Expected 300 committed slots, got 301
  - Expected 1 new company, got 2
  - Duplicate slot numbers detected: [300, 300]
```

**Ursache:** Unique Constraint nicht enforced!

**Lösung:** Base44 Support kontaktieren, Entity-Schema prüfen.

## Cleanup

```javascript
// Test-Daten löschen
await base44.entities.Company.delete({
  organization_id: testOrg.id,
  research_run_id: { $in: [runA.id, runB.id] },
});

await base44.entities.QuotaReservation.delete({
  organization_id: testOrg.id,
  period_month: PERIOD_MONTH,
});

await base44.entities.ResearchRun.delete({
  id: { $in: [runA.id, runB.id] },
});

console.log("🧹 Test cleanup complete");
```

## Logs dokumentieren

Für FINAL GRÜN folgende Logs mitschneiden:

1. **Console-Output** des Test-Skripts
2. **Function-Logs** von processResearchRun (beide Aufrufe)
3. **Database-State** vor/nach dem Test:
   - QuotaReservation COUNT
   - UsageLog.leads_created
   - Company COUNT mit research_run_id

## Alternative: Manueller Test via UI

Falls automatischer Test nicht möglich:

1. **Usage auf 299 setzen** (via Admin-Panel)
2. **Browser DevTools öffnen** (F12)
3. **Zwei Tabs öffnen** mit Research-Dialog
4. **Gleichzeitig klicken** (Stoppuhr verwenden)
5. **Network-Tab prüfen**:
   - Tab A: `processResearchRun` → 200 OK, leads_saved=300
   - Tab B: `processResearchRun` → 200 OK, stop_reason=monthly_quota_reached
6. **Database prüfen** via Admin-Panel

---

**Datum:** 2026-05-19  
**Status:** BEREIT ZUR AUSFÜHRUNG  
**Ausführender:** @test_engineer  
**Review:** @platform_admin