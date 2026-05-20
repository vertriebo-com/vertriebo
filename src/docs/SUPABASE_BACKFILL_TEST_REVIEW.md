# SUPABASE BACKFILL-TEST-REVIEW — 2026-05-20
## Review-Entscheidung: ⚠️ NICHT FINAL GRÜN

> Dieses Dokument ergänzt `docs/SUPABASE_SHADOW_MODE_STATUS.md`.
> Es dokumentiert die korrekte Interpretation des Backfill-Tests vom 2026-05-20.

---

## Befund (Testergebnis)

| Metrik | Wert |
|---|---|
| Supabase `lead_usage_events` Count | **174** |
| Base44 `UsageLog.leads_created` | **324** |
| Base44 `Company.filter` (Research, diesen Monat) | **174** |
| Backfill: written | 0 |
| Backfill: skipped (Duplikate = bereits vorhanden) | 174 |
| Backfill: failed | 0 |
| `validate` diff | -150 |
| `shadow_mode_log` Eintrag geschrieben | ✅ |

---

## Bewertung

### Positiv ✅

- Supabase (174) und Company-Zählung (174) stimmen exakt überein — alle echten Research-Companies des Monats sind in Supabase erfasst.
- Shadow-Write-Pfad in `processResearchRun` hat für alle 174 bestehenden Leads funktioniert.
- Backfill übersprung alle 174 korrekt (Duplikat = bereits per echtem Shadow Write vorhanden, nicht durch manuellen Backfill).
- `shadow_mode_log` Eintrag korrekt geschrieben.
- 0 failed — kein technischer Fehler.

### Offen / Ausstehend ⚠️

**Das ist KEIN finaler ProcessResearchRun-Akzeptanztest.**

Der Backfill/Skip-Test bestätigt ausschließlich, dass bestehende Events vorhanden sind. Er beweist NICHT:
- Dass ein **neuer** Run mit frisch erzeugten Leads `+X` in Supabase schreibt
- Dass das Vorher/Nachher-Delta exakt auf Lead-Ebene stimmt
- Dass das Dashboard `monthly_used` nach einem neuen Run korrekt um +X reagiert
- Dass `shadow_mode_log` automatisch bei neuen Runs aktualisiert wird

---

## Wichtige Interpretation: UsageLog=324 vs. Supabase=174

**UsageLog=324 ist wahrscheinlich historischer Drift.**

Ursachen (dokumentiert in `SUPABASE_SHADOW_MODE_STATUS.md §3`):
1. Leads nach Erstellung gelöscht (User-UI)
2. Alte Batch-Zähl-Logik vor QuotaReservation-Lock
3. Companies ohne `research_run_id` (Backfill-Filter korrekt ausgeschlossen)
4. Parallele doppelte UsageLog-Increments (vor Lock)

**Konsequenz:** Die aktive Produktlogik behandelt `monthly_used = 324` (max()-Formel). Das ist bewusst konservativ und korrekt. Es darf NICHT geändert werden, bis Supabase als SSOT validiert ist.

---

## Was Base44 NICHT tun darf

- ❌ Diesen Backfill/Skip-Test als finalen ProcessResearchRun-Akzeptanztest verkaufen
- ❌ Supabase als SSOT aktivieren
- ❌ Base44 max()-Formel entfernen
- ❌ UsageLog=324 rückwirkend überschreiben ohne Produktentscheidung
- ❌ FINAL GRÜN schreiben, bevor echter neuer ResearchRun mit Vorher/Nachher-Protokoll bestanden ist

---

## Nächste Pflichtschritte

1. **Echten neuen ResearchRun** auf einer Org die NICHT über ihrem Monatslimit liegt durchführen
2. **Vorher-Snapshot**: `supabase_count=N`, `UsageLog.leads_created=L`, `Dashboard.monthly_used=U`
3. **Nachher-Snapshot**: alle Werte um exakt `+X` gestiegen (X = neue gespeicherte Leads)
4. Ergebnis in `SUPABASE_SHADOW_MODE_STATUS.md §4` eintragen
5. 14-Tage-Zählung für neue Events starten
6. Delta -150 als legacy-dokumentiert belassen — nicht rückwirkend "reparieren"

---

**Datum:** 2026-05-20
**Status:** ⚠️ Shadow Mode aktiv, aber noch nicht final grün
**Referenz:** `docs/SUPABASE_SHADOW_MODE_STATUS.md` (vollständiges Statusdokument)