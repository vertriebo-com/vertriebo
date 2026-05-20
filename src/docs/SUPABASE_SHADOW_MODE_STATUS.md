# SUPABASE SHADOW MODE — STATUS & ANALYSE
## Stand: 2026-05-20 | Status: ✅ SHADOW MODE AKTIV

> **PFLICHTLEKTÜRE vor jeder Supabase-Änderung.**
> Supabase ist NICHT die primäre Wahrheit. Die Base44 max()-Formel bleibt vollständig aktiv.
> Kein Aktivieren von Supabase als SSOT ohne: GitHub-Review + 14-Tage-Validierung + Test-Run bestätigt.

---

## 1. IMPLEMENTIERUNGSSTAND (2026-05-20)

| Komponente | Status | Details |
|---|---|---|
| Supabase-Verbindung | ✅ Verbunden | `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in Secrets gesetzt |
| Tabelle `lead_usage_events` | ✅ Erstellt | UNIQUE INDEX auf `(organization_id, company_id, period_month)` |
| Tabelle `shadow_mode_log` | ✅ Erstellt | Audit-Log für Validierungsvergleiche mit `diff` + `checked_at` |
| `processResearchRun` Shadow Write | ✅ Aktiv | Non-blocking nach jedem `commitQuotaSlot` (Zeile ~1083) |
| `promoteExternalSourceToCompany` Shadow Write | ✅ Aktiv | Non-blocking nach `incrementUsageLog` |
| Backfill historische Daten | ✅ Ausgeführt | 174 Events für Org `6a042bdb22ac907a26c5affe`, 2026-05 |
| Shadow-Mode-Log `diff` + `checked_at` | ✅ Aktiv | Vollständiger Audit-Trail seit 2026-05-20 |
| `supabaseUsage` Function | ✅ Deployed | Aktionen: write_event, get_count, validate, backfill |

---

## 2. GITHUB-PFADE (zur Code-Review)

```
functions/setupSupabase/        → Tabellen-Setup + Migration (einmalig)
functions/supabaseUsage/        → Shadow-Mode-Helper (validate, backfill, get_count, write_event)
functions/processResearchRun/   → writeSupabaseUsageEvent() ab Zeile 42 (Helper) + Aufruf Zeile ~1083
functions/promoteExternalSourceToCompany/ → writeSupabaseUsageEvent() am Dateianfang + Aufruf nach incrementUsageLog
```

---

## 3. DIFFERENZ-ANALYSE: Supabase=174 vs Base44/UsageLog=324 (2026-05-20)

**Befund:** `supabase_count=174`, `base44_count=324`, `diff=-150`, `diff_pct=46.3%`

### Was bedeuten die Zahlen?

| Quelle | Wert | Bedeutung |
|---|---|---|
| **Supabase** (Backfill) | 174 | Echte Research-Companies die im Mai 2026 existieren (Company.filter, research_run_id gesetzt, nicht manuell/CSV) |
| **Base44 UsageLog** | 324 | Historisch akkumulierter Zähler: `leads_created` im UsageLog für Org + period_month |
| **Differenz** | 150 | Erklärbar durch mehrere Faktoren (siehe unten) |

### Ursachen der Differenz (priorisiert)

| Ursache | Wahrscheinlichkeit | Erklärung |
|---|---|---|
| **Leads nach Erstellung gelöscht** | ⭐⭐⭐ Hoch | Wenn User Leads aus der UI löscht, sinkt `companiesThisMonth` aber UsageLog bleibt bei 324. Jede Löschung erzeugt dauerhaften Drift. |
| **Alte Batch-Zähl-Logik** | ⭐⭐⭐ Hoch | Ältere `processResearchRun`-Versionen (vor `commitQuotaSlot`) schrieben UsageLog in einem Block am Batch-Ende — unabhängig ob alle geplanten Companies tatsächlich erstellt wurden. |
| **Companies ohne `research_run_id`** | ⭐⭐ Mittel | Ältere Companies ohne `research_run_id` werden vom Backfill-Filter korrekt ausgeschlossen (`if (!c.research_run_id) return false`). Der UsageLog hat diese aber mitgezählt. |
| **Parallele doppelte UsageLog-Increments** | ⭐⭐ Mittel | Vor QuotaReservation-Lock konnten parallele Worker gleichzeitig `leads_created +1` schreiben. Heute durch QuotaReservation verhindert. |
| **promoteExternalSourceToCompany** | ⭐ Niedrig | OpenRegister-Promotes erhöhen UsageLog (`incrementUsageLog`). Wenn diese Companies gelöscht wurden, verbleibt der UsageLog-Count. |

### Warum ist das KEIN akuter Bug?

Die `max()`-Formel in `getDashboardData` und `getUsageSummary` kompensiert genau diesen Drift:
```
monthly_used = Math.max(committedSlots=0, usageLogValue=324, companiesThisMonth=174) = 324
```
Der höchste Wert gewinnt → kein Unter-Zählen möglich. Die Anzeige ist konservativ (zeigt max. Verbrauch).

### Was für zukünftige Runs gilt (ab Shadow Mode aktiv)

Ab jetzt (2026-05-20) schreibt jeder neue Research-Lead:
1. `Company.create` in Base44
2. `commitQuotaSlot` → `UsageLog +1` in Base44
3. `writeSupabaseUsageEvent` → `lead_usage_events INSERT` in Supabase (non-blocking)

**Erwartete neue Abweichung: 0** — alle drei Writes passieren für denselben Lead.

---

## 4. AKZEPTANZTEST: NEUER TEST-RUN (ausstehend)

Für einen Test-Run mit 1-3 neuen Leads muss gelten:

```
Vorher:
  supabaseUsage(get_count) → N

Neuer Run: X neue Leads gespeichert

Nachher:
  supabaseUsage(get_count) → N + X        ← Supabase erhöht sich genau um X
  getDashboardData.monthly_used → vorher + X  ← Base44 unverändert korrekt
  UsageLog.leads_created → vorher + X     ← UsageLog erhöht sich synchron
  X neue Company-Einträge in DB           ← Grundvoraussetzung
```

Kein Test-Run ohne Protokollierung dieses Ergebnisses.

---

## 5. SHADOW-MODE-LOG SCHREIBEN (täglich empfohlen)

```json
POST supabaseUsage
{
  "action": "validate",
  "org_id": "6a042bdb22ac907a26c5affe",
  "period_month": "2026-05"
}
```

Schreibt automatisch einen Eintrag in `shadow_mode_log` mit:
- `organization_id`
- `period_month`
- `supabase_count`
- `base44_count`
- `diff`
- `checked_at`

---

## 6. SHADOW MODE → PHASE 2 (BEDINGUNGEN)

Erst wenn **alle** Bedingungen erfüllt sind, darf Phase 2 (Supabase als SSOT) gestartet werden:

- [ ] GitHub-Review abgeschlossen: `setupSupabase`, `supabaseUsage`, `processResearchRun`, `promoteExternalSourceToCompany`
- [ ] Mindestens 1 neuer Test-Run durchgeführt und validiert (Supabase count vorher/nachher korrekt)
- [ ] 14 Tage Shadow Mode gelaufen (shadow_mode_log zeigt tägliche Einträge)
- [ ] Neue Abweichung (nur neue Leads seit 2026-05-20) < 1%
- [ ] Dashboard-Usage nach Test-Run weiterhin korrekt (max()-Formel unverändert)
- [ ] Rollback-Test bestanden: SUPABASE_URL leer → processResearchRun läuft normal weiter

---

## 7. NO-GOS (Shadow Mode, absolut)

- ❌ Supabase jetzt als SSOT aktivieren
- ❌ Base44 max()-Formel entfernen oder deaktivieren
- ❌ processResearchRun wegen Supabase-Fehler blockieren (Shadow Write ist immer non-blocking)
- ❌ SUPABASE_SERVICE_KEY im Frontend oder in Base44 Entities
- ❌ 174 vs 324 als „egal" abtun — Ursachen dokumentiert, Monitoring aktiv
- ❌ FINAL GRÜN schreiben — erst nach GitHub-Review + 14-Tage + Test-Run
- ❌ Alte Usage-Zähler (UsageLog, max()-Formel) abschalten
- ❌ supabaseUsage action="validate" ohne shadow_mode_log-Eintrag

---

## 8. ROLLBACK

Wenn Supabase ausfällt oder Shadow Writes fehlschlagen:
- processResearchRun: `writeSupabaseUsageEvent` gibt nur `console.warn` aus, kein Throw
- promoteExternalSourceToCompany: identisch, non-blocking
- Alle Produktionspfade laufen ohne Supabase weiter
- Deaktivierung: SUPABASE_URL oder SUPABASE_SERVICE_KEY leer → Shadow Write wird übersprungen (Guard in Zeile 43: `if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;`)

---

**Datum:** 2026-05-20  
**Status:** ✅ SHADOW MODE AKTIV — Phase 1  
**Nächster Schritt:** GitHub-Review + Test-Run mit 1-3 Leads