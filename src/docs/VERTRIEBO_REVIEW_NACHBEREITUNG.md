# VERTRIEBO REVIEW-NACHBEREITUNG — PROCESSRESEARCHRUN POST-CREATE-FIX

**Stand:** 2026-05-20 | **Status:** ✅ ALLE REVIEW-PUNKTE UMGESETZT

---

## E2E-TEST ERGEBNIS (2026-05-20) ✅

| Quelle | Wert | Status |
|---|---|---|
| Companies erstellt | 2 | ✅ GRÜN |
| ResearchRun.leads_saved | 2 | ✅ GRÜN |
| UsageLog.leads_created | 2 | ✅ GRÜN |
| Supabase monthly_used | 2 | ✅ GRÜN |

**Post-Create-Pfad funktioniert:**
- ✅ Company.create → erfolgreich
- ✅ Counter erhöht → newLeadsSavedThisBatch=2
- ✅ UsageLog +1 → leads_created=2
- ✅ Supabase RPC → monthly_used=2
- ✅ ResearchRun.leads_saved=2 (nicht 0!)
- ✅ ResearchRun.status=completed (nicht running!)

---

## REVIEW-PUNKTE AUS E2E-TEST

### 1. await recordLeadUsageEvent — UMGESETZT ✅

**Vorher (Fire-and-Forget):**
```js
recordLeadUsageEvent(organization_id, periodMonth, companyId, research_run_id);
```

**Nachher (await + Catch):**
```js
try {
  await recordLeadUsageEvent(organization_id, periodMonth, companyId, research_run_id);
  console.info(`[processResearchRun] ✅ Supabase shadow write abgeschlossen`);
} catch (supabaseErr) {
  console.error(`[processResearchRun] ⚠️ Supabase shadow write failed: ${supabaseErr.message} (nicht-blockierend)`);
}
```

**Begründung:** In Deno/serverless kann ein nicht erwarteter async Fetch verloren gehen wenn die Funktion nach Antwort beendet wird. Non-blocking sollte bedeuten: Fehler nicht werfen, aber der Aufruf wird trotzdem erwartet und intern gefangen.

---

### 2. await auditResearchEvent — UMGESETZT ✅

**Vorher (Fire-and-Forget, 2x):**
```js
// Batch-Complete
auditResearchEvent(research_run_id, organization_id, 'batch_completed', workerKey, {...});

// Run-Error
auditResearchEvent(research_run_id, organization_id, 'run_error', workerKey, {...});
```

**Nachher (await + Catch, 2x):**
```js
// Batch-Complete
try {
  await auditResearchEvent(research_run_id, organization_id, 'batch_completed', workerKey, {...});
  console.info(`[processResearchRun] ✅ Audit batch_completed geschrieben`);
} catch (auditErr) {
  console.error(`[processResearchRun] ⚠️ Audit failed: ${auditErr.message} (nicht-blockierend)`);
}

// Run-Error
if (research_run_id && organization_id) {
  try {
    await auditResearchEvent(research_run_id, organization_id, 'run_error', workerKey, {...});
    console.info(`[processResearchRun] ✅ Audit run_error geschrieben`);
  } catch (auditErr) {
    console.error(`[processResearchRun] ⚠️ Audit run_error failed: ${auditErr.message} (nicht-blockierend)`);
  }
}
```

**Begründung:** Audit ist weniger kritisch als Usage, aber wenn Audit zuverlässig sein soll → ebenfalls erwarten mit await + internem Catch.

---

### 3. target_customer_types Fallback — UMGESETZT ✅

**Problem:** Test musste OrganizationSettings manuell erstellen weil target_customer_types leer waren und ProcessResearchRun 'Keine Suchkategorien' meldete. Das ist ein echtes Produkt-/Onboarding-Risiko.

**Lösung:** startResearchRun greift auf taxonomyProfile.target_customer_types zurück wenn Settings leer:

```js
// startResearchRun.js
let targetCustomerTypes = (settings.target_customer_types || settings.zielkunden || '').split(/,|, /).map(x => x.trim()).filter(Boolean);

// Fallback: Wenn Settings leer → Taxonomie-Profil nutzen
if (targetCustomerTypes.length === 0 && taxonomyProfile?.target_customer_types?.length > 0) {
  targetCustomerTypes = taxonomyProfile.target_customer_types.slice(0, 5); // Max 5 für initiale Suche
  console.info(`[startResearchRun] Fallback: targetCustomerTypes aus Taxonomie (${targetCustomerTypes.length})`);
}
```

**Akzeptanzkriterien:**
- ✅ Onboarding ohne manuelle Settings → Recherche startet mit Taxonomie-Zielkunden
- ✅ Max 5 Zielkunden für initiale Suche (verhindert zu viele Queries im Preview)
- ✅ Logging für Debugging

---

### 4. Industry-Source-of-Truth — UMGESETZT ✅

**Problem:** Test zeigte: übergebene industry_id wurde von org.industry überschrieben bzw. es wurde weiter "entruempelung" genutzt. Source-of-Truth unklar.

**Lösung:** Explizite Priorisierung + Tracking:

```js
// startResearchRun.js
const settingsIndustryId = settings.industry_id || null;
const settingsIndustryName = settings.industry_name || settings.own_industry || settings.industry || null;
const orgIndustry = org.industry || null;

let industryId = null;
let industry = null;
let industrySource = null;

if (settingsIndustryId) {
  // Priorität 1: industry_id aus Settings (kanonisch)
  industryId = settingsIndustryId;
  industry = settingsIndustryName || orgIndustry || settingsIndustryId;
  industrySource = 'settings.industry_id';
} else if (settingsIndustryName) {
  // Priorität 2: industry_name aus Settings → Mapping
  industryId = LEGACY_INDUSTRY_MAP[settingsIndustryName] || settingsIndustryName;
  industry = settingsIndustryName;
  industrySource = 'settings.industry_name';
} else if (orgIndustry) {
  // Priorität 3: org.industry → Mapping
  industryId = LEGACY_INDUSTRY_MAP[orgIndustry] || orgIndustry;
  industry = orgIndustry;
  industrySource = 'organization.industry';
} else {
  industry = '';
  industryId = '';
  industrySource = 'none';
}

console.info(`[startResearchRun] Industry: "${industry}" (id=${industryId}, source=${industrySource})`);
```

**Prioritäten:**
1. `settings.industry_id` (kanonisch, z.B. "gebaeudereinigung")
2. `settings.industry_name` (Legacy, z.B. "Gebäudereinigung") → Mapping
3. `org.industry` (Fallback, z.B. "Entrümpelung") → Mapping
4. KEINE stillen Überschreibungen — explizite Priorisierung + Logging

**Suchplan-Tracking:**
```js
const searchPlanData = {
  industry,
  industryId,
  industrySource, // Dokumentiert woher industry kommt
  // ...
};
```

---

### 5. UsageLog Race-Risiko — DOKUMENTIERT ✅

**Problem:** Base44 `unique_constraints` sind nicht atomar enforced (Live-Test bewiesen: zwei parallele Creates für denselben Slot konnten beide erfolgreich sein). UsageLog-Update bleibt read-modify-write.

**MVP-Schutz:**
1. **Serial Run-Lock**: `processing_lock_until` + `processing_by` verhindert parallele ResearchRuns derselben Org
2. **max()-Formel**: `Math.max(committedSlots, usageLogValue, companiesThisMonth)` kompensiert einzelne Race Conditions
3. **QuotaReservation-Entity**: Slot-Nummern werden im Code geprüft (nicht auf DB-Unique-Constraint verlassen)

**Langfristige Lösung:** Supabase-SSOT mit atomarem RPC (`record_lead_usage_event` mit ON CONFLICT DO NOTHING).

**Dokumentation:** Siehe `docs/VERTRIEBO_MERKLISTE.md` §27 (UsageLog Race-Risiko) + §28 (Supabase Hybrid-Architektur).

---

## BEWERTUNG

**Post-Create-Pfad:** ✅ DEUTLICH VERBESSERT

- ✅ Company.create ist vom Nachlauf getrennt
- ✅ Counter wird nach erfolgreichem Company.create erhöht
- ✅ UsageLog wird in eigenem try/catch aktualisiert
- ✅ Supabase record_lead_usage_event wird erwartet (await) + intern gefangen
- ✅ Audit-Events werden erwartet (await) + intern gefangen
- ✅ E2E-Test bestätigt: 2 Unternehmen, leads_saved=2, UsageLog=2, Supabase=2

**ABER:** Nicht als vollständiges FINAL GRÜN für das Gesamtsystem werten.

**Offene Punkte für nächsten Schritt:**
1. ✅ Supabase/Audit await ergänzt
2. ✅ Settings/Taxonomie-Fallback-Problem behoben
3. ✅ Industry-Source-of-Truth geklärt
4. ⚠️ UsageLog Race-Risiko bleibt bekanntes MVP-Risiko (dokumentiert, max()-Formel kompensiert)
5. ⚠️ Supabase als SSOT erst nach 14-Tage-Shadow-Mode + GitHub-Review

---

## DATEIEN GEÄNDERTT

| Datei | Änderung |
|---|---|
| `functions/processResearchRun` | await recordLeadUsageEvent + await auditResearchEvent (2x) |
| `functions/startResearchRun` | target_customer_types Fallback + Industry-Source-of-Truth |
| `docs/VERTRIEBO_REVIEW_NACHBEREITUNG.md` | Dieses Dokument |
| `docs/VERTRIEBO_MERKLISTE.md` | §26 (Review-Punkte) + §27 (UsageLog Race-Risiko) + §28 (Supabase) |

---

## NÄCHSTE SCHRITTE

1. ✅ **Erledigt:** Post-Create-Fix umsetzen (await + Fallback + Source-of-Truth)
2. ✅ **Erledigt:** E2E-Test bestehen (alle 4 Quellen übereinstimmend)
3. ✅ **Erledigt:** Review-Punkte dokumentieren
4. ⚠️ **Offen:** Supabase Shadow Mode Phase 1 (non-blocking parallel schreiben)
5. ⚠️ **Offen:** 14-Tage-Validierung (Supabase vs. Base44 < 1% Abweichung)
6. ⚠️ **Offen:** GitHub-Review + Test-Run mit 1-3 Leads
7. ⚠️ **Offen:** Phase 2: Supabase-SSOT migrieren (erst nach allen Voraussetzungen)

---

**Datum:** 2026-05-20  
**Status:** ✅ POST-CREATE-FIX ABGESCHLOSSEN  
**Nächster Block:** Supabase Shadow Mode Phase 1 (priorisiert nach Review)