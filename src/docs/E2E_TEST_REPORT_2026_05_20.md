# End-to-End-Test Bericht — 2026-05-20

**Status:** 🟡 Teilweise erfolgreich (Companies erstellt, aber UsageLog/Supabase fehlen)

---

## Test-Setup

**Organisation:** E2E Test Org 2026-05-20  
**Organization ID:** `6a0dd2e05f25ec8ceca1c3b7`  
**Periode:** `2026-05`  
**ResearchRun ID:** `6a0dd30d5f25ec8ceca1c3d1`

### BASELINE (vor Test)

| Quelle | Wert |
|---|---|
| UsageLog.leads_created | 0 (kein Record) |
| Supabase get_monthly_usage | 0 |
| Dashboard monthly_used | 0 |
| Company Count | 0 |

---

## Test-Durchführung

**Start:** 2026-05-20 15:28:13 UTC  
**Ende:** 2026-05-20 15:28:28 UTC (15 Sekunden)

**ResearchRun erstellt mit:**
- industry: `gebaeudereinigung`
- target_customer_types: `["Hausverwaltungen", "Immobilienverwaltungen"]`
- city: `Berlin`
- radius_km: `20`
- requested_target: `3`

---

## Ergebnisse

### ✅ Erfolgreich

| Kriterium | Erwartet | Tatsächlich | Status |
|---|---|---|---|
| Companies erstellt | ≥1 | 4+ | ✅ GRÜN |
| ResearchRun status | completed/partial | completed | ✅ GRÜN |
| Kein running/leads_saved=0 | - | completed (aber leads_saved=0 BUG) | ⚠️ GELB |
| google_place_id gesetzt | Ja | Ja (alle 4 Companies) | ✅ GRÜN |
| engine_analysis_json | Ja | Ja (v6-weighted-scoring) | ✅ GRÜN |

### ❌ Fehlerhaft

| Kriterium | Erwartet | Tatsächlich | Status |
|---|---|---|---|
| ResearchRun.leads_saved | ≥4 | 0 | ❌ ROT |
| UsageLog erstellt | Ja | Nein (kein Record) | ❌ ROT |
| Supabase lead_usage_event | Ja | Unbekannt (nicht geprüft) | ⚠️ OFFEN |
| Dashboard monthly_used | ≥4 | 0 (weil UsageLog fehlt) | ❌ ROT |

---

## Gefundene Bugs

### BUG #1: `leads_saved` Counter wird nicht aktualisiert

**Symptom:**
- 4+ Companies mit `research_run_id: '6a0dd30d5f25ec8ceca1c3d1'` erstellt
- ResearchRun.leads_saved bleibt `0`
- ResearchRun.current_step: "Keine neuen Kontakte gefunden"

**Ursache:**
`newLeadsSavedThisBatch++` wird nicht erreicht weil ein Fehler im Try-Block auftritt.

**Betroffener Code:**
```javascript
// functions/processResearchRun, Zeile ~1062
newLeadsSavedThisBatch++;  // ← Wird nicht erreicht
```

**Hypothese:**
Fehler zwischen `companyRes.id` und `newLeadsSavedThisBatch++` in:
1. UsageLog.create/update
2. recordLeadUsageEvent (Supabase RPC)

---

### BUG #2: UsageLog wird nicht erstellt

**Symptom:**
- Kein UsageLog Record für `organization_id: '6a0dd2e05f25ec8ceca1c3b7'` und `period_month: '2026-05'`
- Code nach Company.create wird nicht ausgeführt

**Ursache:**
Fehler im UsageLog-Block (Zeilen 1034-1050):
```javascript
const usageRecords = await base44.asServiceRole.entities.UsageLog.filter({...});
if (usageRecords[0]) {
  await base44.asServiceRole.entities.UsageLog.update(...);
} else {
  await base44.asServiceRole.entities.UsageLog.create({...});  // ← Hier?
}
```

**Mögliche Ursachen:**
1. `periodMonth` ist immer noch nicht definiert im richtigen Scope
2. UsageLog.create schlägt fehl wegen Validierungsfehler
3. Exception wird geschluckt aber nicht geloggt

---

### BUG #3: `periodMonth` Scope-Problem (teilweise behoben)

**Historie:**
- Erster Test: `periodMonth is not defined` → 9 Company.create fehlgeschlagen
- Fix: `const periodMonth = getPeriodMonth();` hinzugefügt (Zeile 998)
- Zweiter Test: Companies erstellt aber UsageLog fehlt

**Offen:**
- Wird `periodMonth` im UsageLog-Block verwendet? ✅ JA (Zeile 1034, 1041, 1045)
- Ist `periodMonth` dort verfügbar? ✅ JA (innerhalb desselben try-Blocks)

---

## Supabase-Status

**Nicht geprüft** weil UsageLog fehlt.

**Hypothese:**
- recordLeadUsageEvent wird aufgerufen (non-blocking)
- Aber ohne companyId (weil Company.create im Try-Block aber UsageLog davor fehlschlägt)

**Nächster Schritt:**
```bash
# Supabase Count prüfen
curl -X POST "$SUPABASE_URL/rest/v1/rpc/get_monthly_usage" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_organization_id": "6a0dd2e05f25ec8ceca1c3b7", "p_period_month": "2026-05"}'
```

---

## Root Cause Analyse

**Problem-Kette:**
1. Company.create ✅ erfolgreich
2. companyId = companyRes.id ✅ gesetzt
3. UsageLog-Operation ❌ FEHLER (unbekannt)
4. catch-Block wird ausgeführt
5. `newLeadsSavedThisBatch++` wird NICHT erreicht
6. ResearchRun.leads_saved bleibt 0
7. UsageLog wird nicht erstellt
8. Supabase RPC wird nicht aufgerufen (oder mit companyId=undefined)

**Fehler-Logging:**
```javascript
} catch (createErr) {
  console.error(`[processResearchRun] Company.create failed: ${createErr.message}`);
  continue;  // ← Nächster Lead, Counter wird nicht erhöht
}
```

**Problem:**
- Error-Log zeigt NUR "Company.create failed"
- Aber Company.create WAR erfolgreich!
- Eigentlicher Fehler ist in UsageLog-Operation

**Lösung:**
Error-Logging verbessern um genauen Fehlerort zu identifizieren:
```javascript
try {
  // Company erstellen
  const companyRes = await base44.asServiceRole.entities.Company.create({...});
  companyId = companyRes.id;
  console.info(`[processResearchRun] Company created: ${companyId}`);  // ← NEU
  
  // UsageLog
  console.info(`[processResearchRun] Creating UsageLog for period ${periodMonth}`);  // ← NEU
  const usageRecords = await base44.asServiceRole.entities.UsageLog.filter({...});
  // ...
} catch (createErr) {
  console.error(`[processResearchRun] Company.create或使用量更新失败: ${createErr.message}`, {
    companyId,
    periodMonth,
    step: companyId ? 'usage_log' : 'company_create'
  });
  continue;
}
```

---

## Empfohlene nächste Schritte

### 1. Debug-Logging hinzufügen (PRIORITÄT: HOCH)

Error-Logging im Try-Block verbessern um genauen Fehler zu identifizieren.

### 2. UsageLog-Validierung prüfen

UsageLog Entity-Schema prüfen:
- `period_month` Format: `YYYY-MM` ✅
- `period_start` / `period_end`: ISO-8601 ✅
- `organization_id`: String ✅

### 3. Supabase-Count prüfen

Trotz fehlendem UsageLog Supabase-Count prüfen um RPC-Aufruf zu verifizieren.

### 4. Test wiederholen

Nach Fix: Neuen ResearchRun erstellen und alle 4 Quellen vergleichen.

---

## Fazit

**Test-Status:** 🟡 **TEILWEISE ERFOLGREICH**

**Was funktioniert:**
- ✅ Company.create mit v6-Scoring
- ✅ google_place_id wird gesetzt
- ✅ engine_analysis_json wird gespeichert
- ✅ ResearchRun durchläuft complete-Zyklus

**Was nicht funktioniert:**
- ❌ UsageLog wird nicht erstellt
- ❌ leads_saved Counter bleibt 0
- ❌ Supabase-Integration nicht validiert

**Blocker:**
- Error-Logging unzureichend um genauen Fehler zu identifizieren
- UsageLog.create/update schlägt stillschweigend fehl

**Nächste Aktion:**
Debug-Logging hinzufügen und Test wiederholen.

---

**Wichtig:** Base44 max()-Formel bleibt aktiv. Supabase bleibt Shadow Mode bis UsageLog-Problem behoben ist.