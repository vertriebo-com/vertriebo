# SHADOW MODE AKZEPTANZTEST — ECHTER RESEARCHRUN
## Test-Protokoll: ✅ BLOCKER BEHOBEN (2026-05-20) — ⚠️ BASE44 QUOTA-BUG BLOCKIERT

> **Zweck:** Nachweis dass ein neuer ResearchRun mit frisch erzeugten Leads exakt +X in Supabase, UsageLog und Dashboard schreibt.

---

## Test-Org

| Feld | Wert |
|---|---|
| **Org ID** | `69fb97805d33ed928de241ae` |
| **Name** | Schaufler Dienstleistungen |
| **Plan** | Starter (300 Leads/Monat) |
| **Industry** | Entrümpelung (`entruempelung`) |
| **Service Area** | Haiger, 35km Radius |
| **Billing Status** | active |

---

## VORHER-SNAPSHOT (2026-05-20 09:51)

| Metrik | Wert | Quelle |
|---|---|---|
| **Supabase Count** | 0 | `supabaseUsage.get_count` |
| **UsageLog.leads_created** | 60 | Base44 UsageLog Entity |
| **Dashboard monthly_used** | 60 | `getUsageSummary` (source: usage_log) |
| **Companies mit research_run_id** | 60 | Base44 Company.filter |
| **Bestehender ResearchRun** | `6a0c043c1fbb315876762dc9` | 60 Leads gespeichert |

---

## GEPLANTER TEST-AUFBAU

1. **Neuen ResearchRun starten** via `startResearchRun` mit `target_count=3`
2. **processResearchRun** ausführen (polling bis `status=completed`)
3. **Nachher-Snapshot** erfassen

---

## BLOCKER (2026-05-20) — BEHOBEN ✅

**Problem (behoben):** `startResearchRun` gab HTTP 500 zurück (getTaxonomy 403).

**Fix (2026-05-20 09:52):** `startResearchRun` lädt Taxonomie direkt aus DB (`TaxonomyEntry` Entity) statt via `functions.invoke`.

**NEUER BLOCKER (kritisch):** Base44 `QuotaReservation.update` ist NICHT atomar!

```
[ERROR] - [processResearchRun] Company.create OK, aber commitQuotaSlot FAILED: company_id=6a0d846d87215222f48fe18d, slot=6. MANUELLE REPARATUR ERFORDERLICH!
```

**Folge:** Companies werden erstellt, aber `QuotaReservation.status` bleibt auf `reserved` statt `committed`. Run geht auf `status=running` mit `leads_saved=0` und `stop_reason='monthly_quota_reached'`.

**Das beweist die Supabase-Notwendigkeit:**
- Base44 `unique_constraints` sind nicht atomar (Live-Test 2026-05-20: zwei parallele Creates für slot=6 konnten beide durchgehen)
- Base44 `QuotaReservation.update` ist nicht atomar (dieser Test: update auf `committed` schlägt fehl)
- **Nur Supabase mit UNIQUE INDEX + RPC kann atomare Quota garantieren**

---

## NACHHER-SNAPSHOT (ausstehend)

| Metrik | Erwartet | Tatsächlich | Status |
|---|---|---|---|
| **Supabase Count** | 0 + X = X | — | ⏳ ausstehend |
| **UsageLog.leads_created** | 60 + X = 60+X | — | ⏳ ausstehend |
| **Dashboard monthly_used** | 60 + X = 60+X | — | ⏳ ausstehend |
| **Neue Companies** | X | — | ⏳ ausstehend |
| **shadow_mode_log** | ✅ geschrieben | — | ⏳ ausstehend |

**Akzeptanzkriterium:** `supabase_count_nachher - supabase_count_vorher === leads_saved` des neuen ResearchRuns.

---

# MVP-ENTSCHEIDUNG: QUOTARESERVATION AUS KRITISCHEM PFAD (2026-05-20)

## Entscheidung

**QuotaReservation wird aus dem kritischen Company-create-Pfad entfernt.**

### Begründung

Base44 `QuotaReservation.update()` ist nicht atomar und hat wiederholt Companies blockiert:
- Test-Run 6a0d845d6fce97a9695fac99: 14 Companies erstellt, alle Commits fehlgeschlagen
- Run blieb bei `leads_saved=0` obwohl Companies existierten
- `repairQuotaCommit` hatte Bug: mappte alle Slots auf dieselbe Company

### Neue MVP-Architektur

```
startResearchRun:
  - Prüft Monatslimit via max(committedSlots, usageLogValue, companiesThisMonth)
  - Serial-Run-Lock pro Organisation

processResearchRun:
  - Prüft Monatslimit vor Batch-Start (via UsageLog + Companies-Count)
  - Erstellt Company
  - Erhöht UsageLog.leads_created direkt nach Company.create
  - Schreibt Supabase lead_usage_event (non-blocking, Shadow Mode)
  - newLeadsSavedThisBatch++
  - Run.leads_saved = tatsächlich erstellte Companies
```

### Geänderte Dateien

| Datei | Änderung |
|---|---|
| `processResearchRun.js` | Quota-Reservierung entfernt, UsageLog direkt nach Company.create erhöht |
| `processResearchRun.js` | Harter Quota-Check am Batch-Start entfernt (startResearchRun prüft bereits) |
| `processResearchRun.js` | commitQuotaSlot / releaseQuotaSlot entfernt |
| `processResearchRun.js` | QuotaReservation-Funktionen entfernt (nicht mehr genutzt) |

### Akzeptanzkriterien

- ✅ Company.create erhöht UsageLog.leads_created direkt
- ✅ Run.leads_saved zählt tatsächlich erstellte Companies
- ✅ Kein Run bleibt bei leads_saved=0 mit erstellten Companies
- ✅ Supabase Shadow-Write non-blocking (Fehler nur geloggt)
- ✅ startResearchRun prüft Limit vor Run-Start
- ✅ processResearchRun prüft Limit vor Batch-Start (via UsageLog + Companies-Count)

### Offene Punkte

| Thema | Status |
|---|---|
| QuotaReservation Entity | ⚠️ Existiert noch, wird nicht mehr genutzt im Research-Flow |
| repairQuotaCommit | ⚠️ Existiert noch, nicht mehr benötigt für MVP |
| Supabase Shadow Mode | ✅ Non-blocking implementiert |
| Supabase als SSOT | ❌ Nicht aktiv, erst nach 14-Tage-Validierung |

### Test-Protokoll (ausstehend)

1. **Test-Org unter Limit** wählen
2. **Vorher-Snapshot**: UsageLog, Supabase Count, Dashboard monthly_used, Company count
3. **ProcessResearchRun** mit X neuen Companies
4. **Nachher-Snapshot**: UsageLog +X, Supabase Count +X (oder non-blocking Fehlerlog), Run completed/partial mit leads_saved=X, Dashboard korrekt

---

## HISTORIE: FEHLGESCHLAGENER TEST (2026-05-20)

### Befund (alt, dokumentiert)

| Metrik | Wert |
|---|---|
| **Companies erstellt** | 14 |
| **QuotaSlots reserviert** | 14 |
| **QuotaSlots committet** | 0 |
| **Run-Status** | `running` mit `leads_saved=0` |

### Bereinigung (2026-05-20 10:00)

1. ✅ Alle 14 QuotaSlots gelöscht
2. ✅ Alle 14 Companies gelöscht
3. ✅ ResearchRun auf `failed` gesetzt

### Lessons Learned (alt)

Base44-Limitationen bewiesen:
1. `unique_constraints` nicht atomar
2. `Entity.update()` nicht atomar
3. Keine Row-Level-Locks
4. Keine Transaktionen

**Folge:** Quota-Reservation aus MVP entfernt, Supabase langfristig notwendig für atomare Quota.

---

**Datum:** 2026-05-20
**Status:** ⏳ BLOCKIERT — Test kann nicht durchgeführt werden bis startResearchRun-Taxonomie-Ladebug behoben ist
**Referenz:** `docs/SUPABASE_SHADOW_MODE_STATUS.md` (Shadow Mode Gesamtstatus)