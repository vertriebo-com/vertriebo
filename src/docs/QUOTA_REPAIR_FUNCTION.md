# QuotaReservation Repair-Function

## Zweck

Repariert QuotaReservation-Slots bei denen:
- `Company.create` erfolgreich war, aber
- `commitQuotaSlot` fehlschlug (Timeout, Network-Error, etc.)

## Szenarien

### Szenario 1: Company existiert, Slot ist noch 'reserved'

**Ursache:** commitQuotaSlot failed nach erfolgreichem Company.create

**Reparatur:**
```javascript
// Slot finden
const slot = { status: "reserved", research_run_id: "run_123" };

// Company finden
const company = companies.find(c => 
  c.research_run_id === "run_123" &&
  Math.abs(new Date(c.created_date) - new Date(slot.reserved_at)) < 5 * 60 * 1000
);

// Commit nachholen
await QuotaReservation.update(slot.id, {
  status: "committed",
  company_id: company.id,
  committed_at: new Date().toISOString(),
});
```

### Szenario 2: Slot ist 'reserved' aber keine Company

**Ursache:** reserveQuotaSlot erfolgreich, aber Company.create nie ausgeführt

**Reparatur:**
```javascript
// Wenn Slot alt (>1 Stunde)
if (Date.now() - new Date(slot.reserved_at) > 60 * 60 * 1000) {
  await QuotaReservation.update(slot.id, {
    status: "released",
    released_at: new Date().toISOString(),
  });
}
```

## Automatischer Betrieb

**Scheduled Automation:** Täglich um 03:00 Uhr (Europe/Berlin)

```
Automation: "Daily Quota Commit Repair"
Function: repairQuotaCommit
Schedule: Every 1 days at 03:00
```

## Manuelle Nutzung

### Via Platform Admin UI

1. Gehe zu **Platform Admin** → **Quota Diagnostics**
2. Klicke **"Run Repair"**
3. Ergebnis anzeigen:
   - Repaired Slots: X
   - Needs Review: Y

### Via Function Call

```javascript
// Alle Organisationen
const result = await base44.functions.invoke("repairQuotaCommit", {});

// Spezifische Organisation
const result = await base44.functions.invoke("repairQuotaCommit", {
  organization_id: "org_123",
  period_month: "2026-05",
});

// Spezifischen Run reparieren
const result = await base44.functions.invoke("repairQuotaCommit", {
  run_id: "run_456",
});
```

## Response-Format

```json
{
  "success": true,
  "repaired": [
    {
      "slot_id": "slot_abc",
      "slot_number": 300,
      "company_id": "comp_xyz",
      "company_name": "Test GmbH",
      "organization_id": "org_123",
      "period_month": "2026-05"
    }
  ],
  "needsReview": [
    {
      "slot_id": "slot_def",
      "slot_number": 301,
      "reason": "Old reservation without company (>1h)",
      "action": "released"
    }
  ],
  "summary": {
    "total_reserved_slots": 5,
    "repaired_count": 3,
    "needs_review_count": 2
  }
}
```

## Monitoring

### Tägliche Prüfung

```javascript
// Reserved Slots älter als 1 Stunde
const oldReserved = await base44.entities.QuotaReservation.filter({
  status: "reserved",
});

const now = Date.now();
const oneHour = 60 * 60 * 1000;

for (const slot of oldReserved) {
  const slotAge = now - new Date(slot.reserved_at).getTime();
  if (slotAge > oneHour) {
    console.warn(`Old reserved slot: ${slot.slot_number} age=${Math.round(slotAge/1000/60)}min`);
  }
}
```

### Alerting

Wenn `needs_review_count > 0` im Repair-Report:
- **Info:** < 5 Slots → Normal, manuell prüfen
- **Warning:** 5-20 Slots → System-Problem untersuchen
- **Critical:** > 20 Slots → Sofortiger Eingriff erforderlich

## Error-Handling

### Company.create OK, commitQuotaSlot FAILED

**Logs:**
```
[processResearchRun] Company.create OK, aber commitQuotaSlot FAILED: 
company_id=comp_123, slot=300. MANUELLE REPARATUR ERFORDERLICH!
```

**Action:**
- Slot bleibt `status="reserved"`
- repairQuotaCommit findet + committet automatisch
- ODER manuell: `status="committed", company_id="comp_123"`

### Company.create FAILED

**Logs:**
```
[processResearchRun] Company.create failed, releasing slot=300: Error message
```

**Action:**
- Slot wird automatisch released via `releaseQuotaSlot()`
- Keine manuelle Intervention nötig

## Testing

### Test-Setup

```javascript
// 1. Reserved Slot ohne Company erstellen
const slot = await base44.entities.QuotaReservation.create({
  organization_id: "org_TEST",
  period_month: "2026-05",
  slot_number: 999,
  status: "reserved",
  research_run_id: "run_TEST",
  reserved_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h alt
});

// 2. Repair ausführen
const result = await base44.functions.invoke("repairQuotaCommit", {
  organization_id: "org_TEST",
  period_month: "2026-05",
});

// 3. Validierung
const updatedSlot = await base44.entities.QuotaReservation.get(slot.id);
console.assert(updatedSlot.status === "released");
console.assert(result.needsReview.length === 1);
```

### Test mit Company

```javascript
// 1. Company + Reserved Slot erstellen
const company = await base44.entities.Company.create({ /* ... */ });
const slot = await base44.entities.QuotaReservation.create({
  organization_id: company.organization_id,
  period_month: "2026-05",
  slot_number: 998,
  status: "reserved",
  research_run_id: company.research_run_id,
  reserved_at: company.created_date,
});

// 2. Repair ausführen
const result = await base44.functions.invoke("repairQuotaCommit", {});

// 3. Validierung
const updatedSlot = await base44.entities.QuotaReservation.get(slot.id);
console.assert(updatedSlot.status === "committed");
console.assert(updatedSlot.company_id === company.id);
console.assert(result.repaired.length === 1);
```

## Troubleshooting

### Problem: Repair findet Company nicht

**Ursache:** research_run_id mismatch oder created_date zu weit auseinander

**Lösung:**
```javascript
// Manuelle Suche
const companies = await base44.entities.Company.filter({
  organization_id: "org_123",
  research_run_id: "run_456",
});

// Company mit passendem Zeitpunkt finden
const matchingCompany = companies.find(c => {
  const slotTime = new Date(slot.reserved_at);
  const companyTime = new Date(c.created_date);
  return Math.abs(companyTime - slotTime) < 10 * 60 * 1000; // 10min Fenster
});

// Manuell committen
if (matchingCompany) {
  await base44.entities.QuotaReservation.update(slot.id, {
    status: "committed",
    company_id: matchingCompany.id,
  });
}
```

### Problem: UsageLog inkonsistent

**Ursache:** commitQuotaSlot schreibt leads_created, aber Repair nicht

**Lösung:**
```javascript
// UsageLog manuell korrigieren
const usageLog = await base44.entities.UsageLog.filter({
  organization_id: "org_123",
  period_month: "2026-05",
});

const expectedLeads = await base44.entities.QuotaReservation.filter({
  organization_id: "org_123",
  period_month: "2026-05",
  status: "committed",
});

await base44.entities.UsageLog.update(usageLog[0].id, {
  leads_created: expectedLeads.length,
});
```

---

**Datum:** 2026-05-19  
**Status:** PRODUKTIONSREIF  
**Automation:** Täglich 03:00 Uhr automatisch