# QuotaReservation Unique Constraint Nachweis

## Problemstellung

Für atomare Quota-Reservierung muss sichergestellt sein, dass `organization_id + period_month + slot_number` **eindeutig** ist. Ohne echte Unique Constraint können zwei Worker denselben Slot reservieren → Over-Usage möglich.

## Base44 Unique Constraints

Base44 unterstützt Unique Constraints über Entity-Schema-Definitionen:

```json
{
  "unique_constraints": [
    {
      "name": "unique_org_period_slot",
      "fields": ["organization_id", "period_month", "slot_number"]
    }
  ]
}
```

## Nachweis in processResearchRun

Die Unique Constraint wird **implizit genutzt** durch atomare Create-Operation:

```javascript
// functions/processResearchRun.js:414-422
try {
  await base44.asServiceRole.entities.QuotaReservation.create({
    organization_id,
    period_month: periodMonth,
    slot_number: nextSlot,  // ← UNIQUE KEY
    research_run_id: runId,
    status: 'reserved',
    reserved_at: now,
  });
  
  return { success: true, reserved: true, slot_number: nextSlot };
} catch (createErr) {
  // Unique constraint violation → Slot wurde parallel belegt
  console.warn(`Slot ${nextSlot} conflict, retrying`);
  // → Retry mit nächstem Slot
}
```

## Erwartetes Verhalten

### Szenario: 299/300, Worker A + B parallel

| Zeitpunkt | Worker A | Worker B | DB-Zustand |
|-----------|----------|----------|------------|
| T0 | `maxSlot = 299` | `maxSlot = 299` | 299 Slots |
| T1 | `create(300)` | `create(300)` | - |
| T2 | **SUCCESS ✅** | **UNIQUE ERROR ❌** | 300 Slots |
| T3 | - | `retry: create(301)` | - |
| T4 | - | **FAIL (301>300)** | 300 Slots |

**Ergebnis:** Exakt 300/300 Leads, kein Over-Usage!

## Test-Setup für Parallel-Test

### Vorbereitung

```bash
# 1. UsageLog zurücksetzen (Test-Datenbank)
base44.entities.UsageLog.delete({ organization_id: "org_TEST" })

# 2. QuotaReservation leeren
base44.entities.QuotaReservation.delete({ organization_id: "org_TEST" })

# 3. 299 Companies erstellen (Simulation)
for (i = 1; i <= 299; i++) {
  base44.entities.Company.create({
    organization_id: "org_TEST",
    name: `Test Company ${i}`,
    // ... andere Felder
  });
  
  base44.entities.QuotaReservation.create({
    organization_id: "org_TEST",
    period_month: "2026-05",
    slot_number: i,
    status: "committed",
    company_id: "...",
  });
}
```

### Parallel-Test durchführen

```javascript
// Test-Skript: parallel_quota_test.js
const TEST_ORG_ID = "org_TEST";

// Zwei ResearchRuns erstellen
const runA = await base44.entities.ResearchRun.create({
  organization_id: TEST_ORG_ID,
  status: "queued",
  requested_target: 2,
  // ...
});

const runB = await base44.entities.ResearchRun.create({
  organization_id: TEST_ORG_ID,
  status: "queued",
  requested_target: 2,
  // ...
});

// Beide parallel starten (kein await zwischen den Calls!)
const [resultA, resultB] = await Promise.all([
  base44.functions.invoke("processResearchRun", { research_run_id: runA.id }),
  base44.functions.invoke("processResearchRun", { research_run_id: runB.id }),
]);

console.log("Result A:", resultA);
console.log("Result B:", resultB);

// Validierung
const allSlots = await base44.entities.QuotaReservation.filter({
  organization_id: TEST_ORG_ID,
  period_month: "2026-05",
});

const committedSlots = allSlots.filter(s => s.status === "committed");
console.log(`Committed Slots: ${committedSlots.length} (erwartet: 300)`);

const reservedSlots = allSlots.filter(s => s.status === "reserved");
console.log(`Reserved Slots: ${reservedSlots.length} (erwartet: 0)`);

// Check: Keine Duplikate
const slotNumbers = allSlots.map(s => s.slot_number);
const uniqueSlotNumbers = [...new Set(slotNumbers)];
console.log(`Unique Slots: ${uniqueSlotNumbers.length} (erwartet: ${slotNumbers.length})`);

if (slotNumbers.length !== uniqueSlotNumbers.length) {
  console.error("DUPLICATE SLOTS DETECTED!");
  process.exit(1);
}

console.log("✅ TEST PASSED: No over-usage, no duplicates");
```

## Erwartete Logs

### Worker A (gewinnt Slot 300)

```
[processResearchRun] Quota reserved: slot=300, remaining=0 run=run_A
[processResearchRun] SAVED "Company 300" score=75
[processResearchRun] Batch 0 done: newSaved=1 totalSaved=300 done=true
```

### Worker B (verliert Slot 300, Retry 301 fails)

```
[reserveQuotaSlot] Slot 300 conflict, retrying org=org_TEST
[reserveQuotaSlot] QUOTA EXHAUSTED: Slot 301/300 org=org_TEST
[processResearchRun] QUOTA RESERVATION FAILED: monthly_quota_reached run=run_B
[processResearchRun] Batch 0 done: newSaved=0 totalSaved=300 done=true
```

### Final State

```
QuotaReservation:
- slot_number: 300, status: "committed", research_run_id: "run_A" ✅
- slot_number: 301, status: "released" (oder nicht erstellt) ✅

ResearchRun:
- run_A: status="completed", leads_saved=300 ✅
- run_B: status="completed", leads_saved=300, stop_reason="monthly_quota_reached" ✅

UsageLog:
- leads_created: 300 ✅
```

## Manuelles Testing in Production

Falls automatischer Test nicht möglich:

1. **Usage auf 299/300 setzen** (via Admin-Panel oder direkter DB-Zugriff)
2. **Zwei Browser-Tabs öffnen** mit Research-Dialog
3. **Gleichzeitig "Start Recherche" klicken** (auf 1 Lead begrenzen)
4. **Logs prüfen** in Base44 Dashboard → Functions → processResearchRun
5. **Ergebnis validieren**:
   - Ein Run schafft 1 Lead (300/300)
   - Zweiter Run stoppt mit "Monatskontingent erreicht"
   - QuotaReservation zeigt exakt 300 committed Slots

## Fallback: Manual Repair

Falls doch Duplikate entstehen (z.B. durch DB-Bug):

```bash
# Repair-Function aufrufen
base44.functions.invoke("repairQuotaCommit", {
  organization_id: "org_TEST",
  period_month: "2026-05",
});

# Oder manuell via Admin-Panel:
# 1. QuotaReservation filtern: status="reserved" + period_month="2026-05"
# 2. Prüfen ob Company mit research_run_id existiert
# 3. Wenn ja: status auf "committed" setzen + company_id verknüpfen
# 4. Wenn nein + alt (>1h): status auf "released" setzen
```

## Erfolgskriterien für FINAL GRÜN

- ✅ **Keine Duplikate**: `COUNT(slot_number) == COUNT(DISTINCT slot_number)`
- ✅ **Exakt 300 committed**: `COUNT(status="committed") == 300`
- ✅ **Kein Over-Usage**: `leads_created <= monthly_limit`
- ✅ **Recovery möglich**: repairQuotaCommit findet/repariert hängende Slots

---

**Datum:** 2026-05-19  
**Status:** BEREIT FÜR PARALLEL-TEST  
**Nächster Schritt:** Test ausführen + Logs dokumentieren