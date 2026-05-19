# Paralleler Quota-Test: Anleitung

## Ziel

Nachweis dass bei **299/300** zwei parallele `processResearchRun`-Aufrufe **exakt einen** weiteren Lead erstellen (300/300), nicht zwei (301/300).

## Voraussetzungen

- ✅ Test-Datenbank aktiviert (User ist im Test-Modus)
- ✅ Function `parallelQuotaTest` deployed
- ✅ Function `processResearchRun` deployed
- ✅ Admin-Zugang für Test-Ausführung

## Test-Ausführung (4 Schritte)

### Schritt 1: SETUP (299/300 simulieren)

**Function aufrufen:**
```javascript
await base44.functions.invoke("parallelQuotaTest", {
  action: "setup"
});
```

**Erwartete Response:**
```json
{
  "success": true,
  "message": "Setup complete: 299/300",
  "test_org_id": "org_TEST123",
  "companies_created": 299,
  "slots_created": 299,
  "current_usage": 299,
  "monthly_limit": 300
}
```

**Was passiert:**
- Test-Organisation wird erstellt (`owner_email: "test+quota@example.com"`)
- 299 Companies + QuotaReservation-Slots werden erstellt
- UsageLog wird auf 299/300 gesetzt
- Alle alten Test-Daten werden bereinigt

---

### Schritt 2: PARALLEL TEST (zwei Runs gleichzeitig)

**Function aufrufen:**
```javascript
await base44.functions.invoke("parallelQuotaTest", {
  action: "run_test"
});
```

**Erwartete Response:**
```json
{
  "success": true,
  "duration_ms": 3500,
  "run_a": {
    "id": "run_ABC123",
    "result": {
      "success": true,
      "done": true,
      "status": "completed",
      "leads_saved": 300,
      "leads_saved_this_batch": 1,
      "message": "1 neue Firmenkontakte gefunden"
    }
  },
  "run_b": {
    "id": "run_DEF456",
    "result": {
      "success": true,
      "done": true,
      "status": "completed",
      "leads_saved": 300,
      "leads_saved_this_batch": 0,
      "stop_reason": "monthly_quota_reached",
      "message": "Monatskontingent erreicht (300/300). Recherche gestoppt."
    }
  },
  "message": "Parallel test complete. Run validate action to check results."
}
```

**Was passiert:**
- Zwei ResearchRuns werden erstellt
- Beide werden **gleichzeitig** gestartet (`Promise.all`)
- Worker A gewinnt Slot 300, Worker B wird blockiert
- Ergebnis: 300/300 (nicht 301/300!)

**Kritische Logs:**
```
[processResearchRun] Quota reserved: slot=300, remaining=0 run=run_ABC123
[processResearchRun] SAVED "Test Company 300" score=75

[reserveQuotaSlot] Slot 300 conflict, retrying org=org_TEST123
[reserveQuotaSlot] QUOTA EXHAUSTED: Slot 301/300 org=org_TEST123
[processResearchRun] QUOTA RESERVATION FAILED: monthly_quota_reached run=run_DEF456
```

---

### Schritt 3: VALIDATE (Ergebnisse prüfen)

**Function aufrufen:**
```javascript
await base44.functions.invoke("parallelQuotaTest", {
  action: "validate"
});
```

**Erwartete Response (SUCCESS):**
```json
{
  "success": true,
  "message": "✅ TEST PASSED: All criteria met!",
  "checks": {
    "committed_slots_300": true,
    "reserved_slots_0": true,
    "no_duplicates": true,
    "usage_300": true,
    "one_company_created": true
  },
  "stats": {
    "total_slots": 300,
    "committed_slots": 300,
    "reserved_slots": 0,
    "unique_slots": 300,
    "has_duplicates": false,
    "usage_leads_created": 300,
    "test_companies_created": 1
  }
}
```

**Was geprüft wird:**
1. ✅ Exakt 300 committed slots
2. ✅ 0 reserved slots (alle abgeschlossen)
3. ✅ Keine Duplikate (unique_slots == total_slots)
4. ✅ UsageLog.leads_created = 300
5. ✅ Genau 1 neue Company erstellt

**Bei FEHLER:**
```json
{
  "success": false,
  "message": "❌ TEST FAILED",
  "errors": [
    "Check failed: committed_slots_300",
    "Check failed: no_duplicates"
  ],
  "checks": { ... },
  "stats": { ... }
}
```

---

### Schritt 4: CLEANUP (Test-Daten löschen)

**Function aufrufen:**
```javascript
await base44.functions.invoke("parallelQuotaTest", {
  action: "cleanup"
});
```

**Erwartete Response:**
```json
{
  "success": true,
  "message": "Cleanup complete",
  "deleted": {
    "companies": 1,
    "slots": 300,
    "usage_logs": 1,
    "research_runs": 2
  }
}
```

---

## Kompletter Test-Ablauf (Copy-Paste)

```javascript
// 1. Setup
console.log("=== SETUP ===");
const setup = await base44.functions.invoke("parallelQuotaTest", { action: "setup" });
console.log(setup);

// Pause für manuelle Prüfung (optional)
// await new Promise(r => setTimeout(r, 5000));

// 2. Parallel Test
console.log("\n=== PARALLEL TEST ===");
const test = await base44.functions.invoke("parallelQuotaTest", { action: "run_test" });
console.log(test);

// 3. Validate
console.log("\n=== VALIDATE ===");
const validate = await base44.functions.invoke("parallelQuotaTest", { action: "validate" });
console.log(validate);

if (!validate.success) {
  console.error("TEST FAILED:", validate.errors);
  process.exit(1);
}

// 4. Cleanup
console.log("\n=== CLEANUP ===");
const cleanup = await base44.functions.invoke("parallelQuotaTest", { action: "cleanup" });
console.log(cleanup);

console.log("\n✅ ALL TESTS PASSED!");
```

---

## Fehlerbehandlung

### Fehler: "Test org not found"

**Ursache:** Setup wurde nicht ausgeführt

**Lösung:**
```javascript
await base44.functions.invoke("parallelQuotaTest", { action: "setup" });
```

---

### Fehler: "monthly_quota_reached" bei beiden Runs

**Ursache:** Setup hat nur 298/300 erstellt

**Lösung:**
```javascript
// Usage prüfen
const usage = await base44.entities.UsageLog.filter({
  organization_id: "org_TEST123",
  period_month: "2026-05"
});
console.log(usage[0].leads_created); // Muss 299 sein!
```

---

### Fehler: Duplikate detected

**KRITISCHER FEHLER!** Unique Constraint nicht enforced.

**Debugging:**
```javascript
// Alle Slots laden
const slots = await base44.entities.QuotaReservation.filter({
  organization_id: "org_TEST123",
  period_month: "2026-05"
});

// Duplikate finden
const counts = {};
slots.forEach(s => {
  counts[s.slot_number] = (counts[s.slot_number] || 0) + 1;
});

const duplicates = Object.entries(counts)
  .filter(([_, count]) => count > 1)
  .map(([num, _]) => num);

console.log("DUPLICATES:", duplicates);
```

**Lösung:** Base44 Support kontaktieren - Entity-Schema prüfen!

---

## Erfolgskriterien für FINAL GRÜN

✅ **Setup:** 299/300 korrekt simuliert  
✅ **Parallel Test:** Ein Run erfolgreich, einer blockiert  
✅ **Validation:** Alle 5 Checks bestanden  
✅ **Cleanup:** Test-Daten vollständig gelöscht  

**Bei Erfolg:**
- ✅ Unique Constraint ist atomar enforced
- ✅ Quota-Reservierung verhindert Over-Usage
- ✅ Double-Counter ist behoben
- ✅ Commit-Fehlerpfad funktioniert
- ✅ **FINAL GRÜN FÜR PRODUKTION** 🟢

---

## Logs dokumentieren

Für Production-Review folgende Logs speichern:

1. **Console-Output** aller 4 Schritte
2. **Function-Logs** von `processResearchRun` (beide Aufrufe)
3. **Database-State** nach Validation:
   - QuotaReservation COUNT
   - UsageLog.leads_created
   - Company COUNT

---

**Datum:** 2026-05-19  
**Status:** BEREIT ZUR AUSFÜHRUNG  
**Test-Owner:** @test_engineer  
**Review:** @platform_admin