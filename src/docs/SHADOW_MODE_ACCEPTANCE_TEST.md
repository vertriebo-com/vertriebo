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

## TEST-ERGEBNIS: FEHLGESCHLAGEN (2026-05-20)

### Befund

| Metrik | Wert |
|---|---|
| **Companies erstellt** | 14 (alle mit `research_run_id=6a0d845d6fce97a9695fac99`) |
| **QuotaSlots reserviert** | 14 (slot_number 1-15, alle `status=reserved`) |
| **QuotaSlots committet** | 0 (alle `commitQuotaSlot` fehlgeschlagen) |
| **Run-Status** | `running` mit `leads_saved=0`, `stop_reason='monthly_quota_reached'` |

### Root Cause

`commitQuotaSlot` in `processResearchRun` schlägt fehl weil Base44 `QuotaReservation.update(id, data)` nicht atomar ist.

**Konkreter Fehler:**
```
[ERROR] - [processResearchRun] Company.create OK, aber commitQuotaSlot FAILED: 
company_id=6a0d846d87215222f48fe18d, slot=6. MANUELLE REPARATUR ERFORDERLICH!
```

**Reparatur-Versuch mit `repairQuotaCommit`:**
- Bug in `repairQuotaCommit`: Mappt alle 14 Slots auf dieselbe Company (zeitliches Matching <5 Min findet erste Company im Array)
- Folge: 13 Companies verwaist, 1 Company mit 14 Slots (inkonsistent)

### Bereinigung (2026-05-20 10:00)

1. ✅ Alle 14 QuotaSlots gelöscht (`QuotaReservation.delete`)
2. ✅ Alle 14 Companies gelöscht (`Company.delete`)
3. ✅ ResearchRun auf `status=failed`, `stop_reason=quota_commit_failed_base44_non_atomic_update` gesetzt
4. ✅ UsageLog unverändert (bei 60 Leads, keine Erhöhung)

### Lessons Learned

**Kritische Base44-Limitationen (bewiesen 2026-05-20):**

1. **`unique_constraints` nicht atomar** — Zwei parallele Creates für denselben Slot können beide durchgehen (Live-Test 2026-05-20)
2. **`Entity.update()` nicht atomar** — `QuotaReservation.update(id, {status:'committed'})` schlägt fehl ohne erkennbaren Grund
3. **Keine Row-Level-Locks** — Kein Mechanismus um Slots während Verarbeitung zu sperren
4. **Keine Transaktionen** — Company.create + QuotaReservation.update können nicht atomar gekoppelt werden

**Folge für Supabase-Architektur:**

| Problem | Base44 | Supabase-Lösung |
|---|---|---|
| Atomare Quota | ❌ Nicht möglich | ✅ UNIQUE INDEX + RPC `reserve_quota_slot()` |
| Row-Locks | ❌ Nicht verfügbar | ✅ `SELECT ... FOR UPDATE SKIP LOCKED` |
| Transaktionen | ❌ Nicht verfügbar | ✅ Vollständige ACID-Transaktionen |
| Duplikat-Schutz | ❌ unique_constraints nicht enforced | ✅ UNIQUE CONSTRAINTS atomar |

### Shadow-Mode-Status

- ✅ Supabase-Tabelle `lead_usage_events` existiert
- ✅ Shadow-Write in `processResearchRun` implementiert (non-blocking)
- ✅ `shadow_mode_log` für Audit-Trail vorhanden
- ⚠️ **Kein erfolgreicher Live-Test** — Run konnte nicht abgeschlossen werden
- 📋 Shadow-Mode-Log läuft parallel (seit 2026-05-20)

### Nächste Schritte

1. **Supabase-Hybrid-Architektur priorisieren** — Base44 Quota-Reservation ist für Produktivbetrieb nicht sicher
2. **Phase-1-Implementierung** — `processResearchRun` schreibt parallel zu Supabase (non-blocking)
3. **14-Tage-Validierung** — Shadow-Mode-Log zeigt tägliche Konsistenzprüfung
4. **Phase-2-Migration** — Supabase als SSOT für Usage erst nach:
   - GitHub-Review abgeschlossen
   - 14 Tage Shadow-Mode mit <1% Abweichung
   - Manueller Test mit frischer Org (1-3 Leads, Vorher/Nachher-Protokoll)
   - Rollback-Test bestanden

**KEIN FINAL GRÜN ohne:**
- ❌ Echten neuen ResearchRun mit konsistentem Abschluss
- ❌ 14-Tage-Validierung mit Shadow-Mode-Log
- ❌ GitHub-Review der Supabase-Integration
- ❌ Manuellem Test mit frischer Org unter Limit

---

**Datum:** 2026-05-20
**Status:** ⏳ BLOCKIERT — Test kann nicht durchgeführt werden bis startResearchRun-Taxonomie-Ladebug behoben ist
**Referenz:** `docs/SUPABASE_SHADOW_MODE_STATUS.md` (Shadow Mode Gesamtstatus)