# Supabase RPC-Testergebnisse — 2026-05-20

## Zusammenfassung

**Status:** ✅ Alle 6 RPCs erfolgreich getestet (Infrastruktur grün)

**Wichtig:** Dieser Test bestätigt nur die **grundlegende RPC-Funktionsfähigkeit**. Er ist **kein End-to-End-Nachweis** für Production-Readiness.

---

## Testprotokoll

### Tabellen-Existenz ✅

| Tabelle | HTTP-Status | Status |
|---|---|---|
| `lead_usage_events` | 206 | ✅ existiert |
| `shadow_mode_log` | 206 | ✅ existiert |
| `quota_reservations` | 200 | ✅ existiert |
| `research_run_locks` | 200 | ✅ existiert |
| `research_run_audit` | 200 | ✅ existiert |

### RPC-Einzelergebnisse ✅

| RPC | Erwartet | Tatsächlich | Status | Notes |
|---|---|---|---|---|
| `record_lead_usage_event` | `true` (boolean) | `true` | ✅ | Idempotenz getestet: 2. Aufruf = ebenfalls `true` (ON CONFLICT DO NOTHING funktioniert) |
| `get_monthly_usage` | `≥ 1` (bigint) | `1` | ✅ | COUNT korrekt nach vorherigem INSERT |
| `reserve_quota_slot` | `integer ≥ 1` oder `null` | `1` | ✅ | Slot atomar reserviert, Race-Condition-Schutz aktiv |
| `acquire_org_run_lock` | `true` | `true` | ✅ | Lock erworben, Konkurrenz-Worker korrekt blockiert (`false`) |
| `release_org_run_lock` | `true` | `true` | ✅ | Lock freigegeben, Re-acquire nach Release erfolgreich |
| `audit_research_event` | `true` | `true` | ✅ | Audit-Event geschrieben |

### Direkt-INSERT-Diagnose ✅

```json
{
  "step": "direct_insert_diagnose",
  "status": 201,
  "ok": true,
  "note": "✅ Direkt-INSERT funktioniert — ON CONFLICT-Key stimmt überein"
}
```

**Bedeutung:** Der UNIQUE INDEX `idx_usage_events_company_dedup` auf `(organization_id, company_id, event_type)` ist aktiv und wird von `record_lead_usage_event` korrekt referenziert (nach Fix in Migration 04b).

---

## Wichtige Einschränkungen

### ❌ Was dieser Test NICHT beweist

1. **Kein End-to-End-Flow-Nachweis**
   - `processResearchRun` wurde nicht im echten Run-Kontext getestet
   - `startResearchRun` Quota-Checks wurden nicht validiert
   - Dashboard/Billing-Integration wurde nicht geprüft

2. **Keine Production-Readiness-Garantie**
   - Lock-Expiration-Handling nicht getestet (abgelaufene Locks)
   - Quota-Reservation-Cleanup nicht validiert
   - Failure-Handling bei parallelen Runs nicht geprüft

3. **Keine SSOT-Transition**
   - Base44 `max()`-Formel bleibt vorerst aktiv
   - Supabase ist **nicht** alleinige Source of Truth
   - Fallback-Logik muss erhalten bleiben

### ✅ Was dieser Test BEWEIST

- Supabase-Infrastruktur ist erreichbar und stabil
- RPC-Funktionen sind korrekt deployed (SECURITY DEFINER aktiv)
- UNIQUE INDEXes funktionieren wie erwartet (atomare Operationen)
- Idempotenz ist gegeben (mehrfache Aufrufe = kein Fehler)

---

## Nächste Schritte (Pflicht vor SSOT-Transition)

### Phase 1: Kontrollierte Integration (JETZT)

1. **ProcessResearchRun anpassen** (nicht-blockierend):
   ```javascript
   // Nach Company.create:
   await recordLeadUsageEvent({ /* ... */ }); // Nicht await, nicht blockierend
   
   // Parallel für Audit:
   await auditResearchEvent({ /* ... */ }); // Nicht-blockierend
   ```

2. **End-to-End-Test mit 1–3 Leads** (kontrolliert):
   - Vorher: Supabase-Count, UsageLog, Dashboard-Stats dokumentieren
   - Ausführen: `startResearchRun` → `processResearchRun` (manuell triggern)
   - Nachher: Alle 4 Quellen vergleichen (Supabase, UsageLog, Dashboard, Company-Count)

3. **Lock-Handling validieren**:
   - Lock-Expiration testen (künstlich ablaufen lassen)
   - Re-acquire nach Expiration prüfen
   - Cleanup-Funktion für stale Locks dokumentieren

4. **Testdaten bereinigen**:
   - `rpc_test_org_01`-Daten als Testdaten markieren oder löschen
   - Quota-Reservation-Cleanup-Funktion prüfen (`repairQuotaCommit`)

### Phase 2: Shadow Mode Validierung (14 Tage)

- Parallele Counts: Supabase vs. Base44 `max()`-Formel
- Diskrepanz-Tracking: `shadow_mode_log` täglich prüfen
- Keine Blocking-Änderungen an Production-Logic

### Phase 3: SSOT-Transition (nach 14 Tagen grün)

- Base44 `max()`-Formel deaktivieren
- Supabase als alleinige Source of Truth aktivieren
- Fallback-Logik entfernen (nur nach erfolgreichem Rollback-Test)

---

## Sicherheitsrelevante Hinweise

### RPC-Nutzung

- **Niemals** RPCs direkt vom Frontend aufrufen
- **Immer** Service Key über Backend-Funktionen (`supabaseUsage`, `processResearchRun`)
- SECURITY DEFINER erfordert strikte Server-seitige Kontrolle

### Secrets

- `SUPABASE_SERVICE_KEY` niemals im Frontend exponieren
- Immer über `Deno.env.get()` in Backend-Funktionen laden
- GitHub: `.env` niemals committen

---

## Rollback-Strategie (bei Problemen)

1. **Sofort-Maßnahme:**
   - `processResearchRun` auf Base44-only Logic umschalten
   - Supabase-Writes deaktivieren (Flag in `PlatformConfig`)

2. **Datenkonsistenz:**
   - Base44 `max()`-Formel bleibt SSOT während Rollback
   - Supabase-Daten können später bereinigt werden

3. **Kommunikation:**
   - Error-Alert via `sendCriticalErrorAlert`
   - Platform-Admin-Dashboard aktualisiert sich automatisch

---

## Fazit

**Infrastruktur-Status:** ✅ Grün (alle RPCs funktionieren)

**Integrations-Status:** 🟡 Gelb (kontrollierte Integration erforderlich)

**SSOT-Status:** ❌ Rot (nicht aktivieren, Base44-Fallback bleibt Pflicht)

**Nächster Schritt:** ProcessResearchRun anpassen + End-to-End-Test mit 1–3 Leads