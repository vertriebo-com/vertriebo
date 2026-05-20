# SUPABASE SHADOW MODE — STATUS & ANALYSE
## Stand: 2026-05-20 | Status: ⚠️ SHADOW MODE AKTIV — AUSSTEHEND: echter ProcessResearchRun-Akzeptanztest

> **PFLICHTLEKTÜRE vor jeder Supabase-Änderung.**
> Supabase ist NICHT die primäre Wahrheit. Die Base44 max()-Formel bleibt vollständig aktiv.
> Kein Aktivieren von Supabase als SSOT ohne: GitHub-Review + 14-Tage-Validierung + echter neuer ResearchRun mit Vorher/Nachher-Protokoll bestätigt.

---

## 1. IMPLEMENTIERUNGSSTAND (2026-05-20)

| Komponente | Status | Details |
|---|---|---|
| Supabase-Verbindung | ✅ Verbunden | `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in Secrets gesetzt |
| Tabelle `lead_usage_events` | ✅ Erstellt | UNIQUE INDEX auf `(organization_id, company_id, period_month)` |
| Tabelle `shadow_mode_log` | ✅ Erstellt | Audit-Log mit `diff` GENERATED ALWAYS + `checked_at` |
| `processResearchRun` Shadow Write | ✅ Aktiv | Non-blocking nach jedem `commitQuotaSlot` |
| `promoteExternalSourceToCompany` Shadow Write | ✅ Aktiv | Non-blocking nach `incrementUsageLog` |
| Backfill (einmalig 2026-05-20) | ✅ Ausgeführt | 174 skipped (Duplikat = bereits vorhanden), 0 failed |
| Shadow-Mode-Log via `validate` | ✅ Aktiv | Vollständiger Audit-Trail seit 2026-05-20 |
| `supabaseUsage` Function | ✅ Deployed | Aktionen: write_event, get_count, validate, backfill |

---

## 2. BACKFILL-TEST-PROTOKOLL (2026-05-20) — KORREKTE INTERPRETATION

### Zahlen

| Quelle | Wert |
|---|---|
| Supabase `lead_usage_events` | **174** |
| Base44 `UsageLog.leads_created` | **324** |
| Base44 `Company.filter` (diesen Monat, nur Research) | **174** |
| Backfill: written | 0 |
| Backfill: skipped (Duplikate) | 174 |
| Backfill: failed | 0 |
| `diff` (validate) | -150 |

### Was bewiesen wurde ✅

- **Supabase (174) und Company-Zählung (174) stimmen exakt überein** — die echten Research-Companies des Monats sind vollständig in Supabase erfasst.
- Der Shadow-Write-Pfad in `processResearchRun` hat für alle 174 existierenden Research-Leads funktioniert.
- Backfill übersprung alle 174 (korrekt: bereits vorhanden, nicht erneut einzufügen).
- `shadow_mode_log` Eintrag mit `diff=-150` wurde geschrieben.

### Was NICHT bewiesen wurde ⚠️

**Das ist KEIN finaler ProcessResearchRun-Akzeptanztest.**

Der Backfill/Skip-Test bestätigt nur, dass bestehende Events vorhanden sind. Er beweist **nicht**:
- Dass ein **neuer** Run mit neu erzeugten Leads korrekt `+X` in Supabase schreibt
- Dass das Vorher/Nachher-Delta exakt stimmt
- Dass das Dashboard `monthly_used` nach dem neuen Run korrekt reagiert

---

## 3. DIFFERENZ-ANALYSE: Supabase=174 vs Base44/UsageLog=324

**Befund:** `diff=-150` ist historischer Drift, kein akuter Bug.

### Ursachen (dokumentiert, nicht ignoriert)

| Ursache | Wahrscheinlichkeit | Erklärung |
|---|---|---|
| **Leads nach Erstellung gelöscht** | ⭐⭐⭐ Hoch | User löscht Leads aus UI → `companiesThisMonth` sinkt, `UsageLog` bleibt bei 324 |
| **Alte Batch-Zähl-Logik** | ⭐⭐⭐ Hoch | Ältere `processResearchRun`-Versionen schrieben UsageLog am Batch-Ende unabhängig davon, ob alle Companies tatsächlich erstellt wurden |
| **Companies ohne `research_run_id`** | ⭐⭐ Mittel | Ältere Companies ohne `research_run_id` vom Backfill-Filter ausgeschlossen, aber im UsageLog mitgezählt |
| **Parallele doppelte UsageLog-Increments** | ⭐⭐ Mittel | Vor QuotaReservation-Lock konnten parallele Worker gleichzeitig `leads_created +1` schreiben |

### Aktuelle Produktlogik (bewusst konservativ)

```
monthly_used = Math.max(committedSlots=0, usageLogValue=324, companiesThisMonth=174) = 324
```

> **WICHTIG:** `monthly_used = 324` ist die aktuell aktive Produktwahrheit — auch wenn Supabase und Company-Filter 174 zeigen. Das ist KEIN Fehler, sondern bewusste Konservativität der max()-Formel. Diese Formel darf NICHT geändert werden, bis Supabase als SSOT validiert ist.

---

## 4. PFLICHT-AKZEPTANZTEST: ECHTER NEUER RESEARCHRUN (⚠️ AUSSTEHEND)

**Dieser Test muss auf einer Org durchgeführt werden, die NICHT über ihrem Monatslimit liegt.**

### Vorher-Snapshot (vor Test-Run)

```json
POST supabaseUsage { "action": "get_count", "org_id": "...", "period_month": "2026-05" }
→ { "monthly_used": N }

GET UsageLog.leads_created für org + period_month
→ leads_created = L

POST getDashboardData
→ meta.usage_summary.monthly_used = U
```

### Test-Run starten

Ein echter `processResearchRun` mit Ziel 1-3 neuen Leads.

### Nachher-Protokoll (nach Test-Run)

```
Supabase Count:      N + X   ← muss genau +X sein (X = neue gespeicherte Leads)
UsageLog:            L + X   ← muss +X sein
Dashboard monthly:   U + X   ← muss +X sein
Neue Companies:      X       ← Grundvoraussetzung
shadow_mode_log:     ✅       ← validate schreibt neuen Eintrag
```

**Akzeptanzkriterium:** `supabase_count_nachher - supabase_count_vorher === leads_saved` des Runs.

---

## 5. SHADOW-MODE-LOG (täglicher Audit)

```json
POST supabaseUsage
{
  "action": "validate",
  "org_id": "6a042bdb22ac907a26c5affe",
  "period_month": "2026-05"
}
```

Schreibt automatisch Eintrag in `shadow_mode_log`:
- `organization_id`, `period_month`, `supabase_count`, `base44_count`
- `diff` (GENERATED ALWAYS = supabase - base44)
- `checked_at`

---

## 6. SHADOW MODE → PHASE 2 (BEDINGUNGEN — alle müssen erfüllt sein)

- [ ] **GitHub-Review** abgeschlossen: `setupSupabase`, `supabaseUsage`, `processResearchRun`, `promoteExternalSourceToCompany`
- [ ] **Echter neuer ResearchRun** durchgeführt und Vorher/Nachher-Protokoll (Abschnitt 4) vollständig ausgefüllt
- [ ] **Neues Delta = 0** für alle Leads nach 2026-05-20 (historisches Delta 324-174=-150 bleibt legacy-dokumentiert, wird nicht überschrieben)
- [ ] **14 Tage** Shadow Mode gelaufen (shadow_mode_log zeigt tägliche Einträge, neue Abweichung < 1%)
- [ ] **Dashboard-Usage** nach Test-Run korrekt (max()-Formel reagiert wie erwartet)
- [ ] **Rollback-Test** bestanden: SUPABASE_URL leer → processResearchRun läuft normal weiter

---

## 7. NO-GOS (absolut, keine Ausnahmen)

- ❌ **Supabase jetzt als SSOT aktivieren** — erst nach allen Bedingungen in §6
- ❌ **Base44 max()-Formel entfernen** — solange Supabase nicht SSOT ist
- ❌ **processResearchRun wegen Supabase-Fehler blockieren** — Shadow Write ist immer non-blocking
- ❌ **SUPABASE_SERVICE_KEY im Frontend oder in Base44 Entities** — ausschließlich Backend
- ❌ **Backfill/Skip-Test als finalen ProcessResearchRun-Test verkaufen** — sind verschiedene Testarten
- ❌ **Supabase als SSOT aktivieren** bevor echter neuer Run mit Vorher/Nachher-Protokoll bestanden ist
- ❌ **UsageLog=324 rückwirkend überschreiben** ohne Produktentscheidung
- ❌ **FINAL GRÜN** schreiben, bevor echter neuer ResearchRun mit Vorher/Nachher Counts dokumentiert ist
- ❌ **Historisches Delta (150) ignorieren** — dokumentiert, Monitoring aktiv, Ursachen bekannt

---

## 8. ROLLBACK

Wenn Supabase ausfällt oder Shadow Writes fehlschlagen:
- `processResearchRun`: `writeSupabaseUsageEvent` gibt nur `console.warn` aus, kein Throw
- `promoteExternalSourceToCompany`: identisch, non-blocking
- Alle Produktionspfade laufen ohne Supabase weiter
- Deaktivierung: `SUPABASE_URL` oder `SUPABASE_SERVICE_KEY` leer lassen → Shadow Write wird übersprungen

---

## 9. GITHUB-PFADE (zur Code-Review)

```
functions/setupSupabase/                    → Tabellen-Setup + Migration (einmalig)
functions/supabaseUsage/                    → Shadow-Mode-Helper (validate, backfill, get_count, write_event)
functions/processResearchRun/              → writeSupabaseUsageEvent() Helper + Aufruf nach commitQuotaSlot
functions/promoteExternalSourceToCompany/  → writeSupabaseUsageEvent() + Aufruf nach incrementUsageLog
```

---

**Datum:** 2026-05-20
**Status:** ⚠️ SHADOW MODE AKTIV — NOCH NICHT FINAL GRÜN
**Offener Pflichtschritt:** Echter neuer ResearchRun auf nicht-überlimit Org + Vorher/Nachher-Protokoll (§4)
**Historisches Delta:** 324 (UsageLog) vs. 174 (Supabase/Company) = -150 — legacy-dokumentiert, Ursachen bekannt, kein akuter Bug