# SHADOW MODE AKZEPTANZTEST — ECHTER RESEARCHRUN
## Test-Protokoll: ⚠️ AUSSTEHEND (Blocker: getTaxonomy 403)

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

## BLOCKER (2026-05-20)

**Problem:** `startResearchRun` gibt HTTP 500 zurück:
```
{
  "success": false,
  "error": "taxonomy_load_error",
  "message": "Taxonomie konnte nicht geladen werden: Request failed with status code 403"
}
```

**Root Cause:** `startResearchRun` ruft `getTaxonomy` via `base44.functions.invoke()` auf. Dieser verschachtelte Function-Invoke trifft auf Base44 Rate-Limit (429 → 403).

**Bekannter Fix (bereits dokumentiert in VERTRIEBO_MERKLISTE.md §15):**
- `startResearchRun` soll `getTaxonomy` NICHT via `functions.invoke` aufrufen
- Stattdessen: Taxonomie-Profil direkt aus DB laden (analog zu `processResearchRun` v6)

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

1. **Blocker beheben:** `startResearchRun` umschreiben um `getTaxonomy` direkt aus DB zu laden (kein `functions.invoke`)
2. **Test wiederholen:** Echten ResearchRun mit 3 Leads starten
3. **Protokoll vervollständigen:** Nachher-Werte eintragen
4. **14-Tage-Zählung starten:** Ab erfolgreichem Test beginnt die Shadow-Mode-Validierungsfrist

---

**Datum:** 2026-05-20
**Status:** ⏳ BLOCKIERT — Test kann nicht durchgeführt werden bis startResearchRun-Taxonomie-Ladebug behoben ist
**Referenz:** `docs/SUPABASE_SHADOW_MODE_STATUS.md` (Shadow Mode Gesamtstatus)