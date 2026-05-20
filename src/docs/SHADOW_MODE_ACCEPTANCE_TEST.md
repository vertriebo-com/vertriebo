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

## NÄCHSTE SCHRITTE

1. ✅ **startResearchRun-Blocker behoben** (2026-05-20 09:52) — Taxonomie direkt aus DB
2. ⚠️ **Base44 Quota-Bug dokumentiert** — `commitQuotaSlot` scheitert an nicht-atomarem Update
3. 📋 **Shadow-Mode-Validierung kann beginnen** — Supabase schreibt parallel, Base44 max()-Formel bleibt aktiv
4. ⏳ **Echter Test benötigt Org unter Limit** — Test-Org (69fb97805d33ed928de241ae) hat 269/300 → kann nicht getestet werden

**Empfehlung:**
- Shadow-Mode-Log (`shadow_mode_log`) läuft bereits parallel (seit 2026-05-20)
- Nach 14 Tagen (2026-06-03) kann Delta analysiert werden
- Supabase-SSOT (Phase 2) erst nach: GitHub-Review + 14-Tage-Validierung + manuellem Test mit frischer Org

---

**Datum:** 2026-05-20
**Status:** ⏳ BLOCKIERT — Test kann nicht durchgeführt werden bis startResearchRun-Taxonomie-Ladebug behoben ist
**Referenz:** `docs/SUPABASE_SHADOW_MODE_STATUS.md` (Shadow Mode Gesamtstatus)