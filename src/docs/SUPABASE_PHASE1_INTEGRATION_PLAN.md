# Supabase Phase 1 — Kontrollierte Integration

**Stand:** 2026-05-20  
**Status:** 🟡 In Arbeit (kontrollierte Integration)

---

## Zusammenfassung

**Infrastruktur:** ✅ Alle 6 RPCs getestet und funktionsfähig (docs/SUPABASE_RPC_TEST_RESULTS_2026_05_20.md)

**Integration:** `processResearchRun` schreibt jetzt nicht-blockierend:
1. `record_lead_usage_event` nach jedem Company.create
2. `audit_research_event` bei Batch-Complete und Run-Error

**Wichtig:** Base44 `max()`-Formel bleibt SSOT. Supabase ist Shadow Mode.

---

## Durchgeführte Änderungen

### `processResearchRun` angepasst

**Vorher:**
```javascript
// REST POST direkt an Tabelle (nicht idempotent)
writeSupabaseUsageEvent(orgId, periodMonth, companyId, runId);
```

**Nachher:**
```javascript
// RPC-Aufruf (idempotent, ON CONFLICT DO NOTHING)
recordLeadUsageEvent(orgId, periodMonth, companyId, runId);

// Audit-Events bei Batch-Complete + Error
auditResearchEvent(runId, orgId, 'batch_completed', workerKey, {...});
auditResearchEvent(runId, orgId, 'run_error', workerKey, {...});
```

**Vorteile:**
- ✅ Idempotenz garantiert (mehrfache Aufrufe = kein Fehler)
- ✅ Strukturierte Audit-Logs für Run-Lifecycle
- ✅ Non-blocking (Fehler werden geloggt, brechen nicht ab)

---

## Nächster Schritt: End-to-End-Test (1–3 Leads)

### Vorbereitung

1. **Baseline dokumentieren** (vor Test):
   ```
   Organization: <org_id>
   Periode: 2026-05
   
   Base44 UsageLog.leads_created: <wert>
   Supabase lead_usage_events COUNT: <wert>
   Dashboard-Anzeige: <wert>
   Company-Count (dieser Monat): <wert>
   ```

2. **Test-Run starten**:
   ```bash
   # startResearchRun auslösen (UI oder API)
   # processResearchRun automatisch via Automation
   ```

3. **Monitoring** (während Test):
   - ResearchRun.status auf `running` → `completed`
   - `leads_saved` inkrementiert korrekt
   - Keine `running`-Zustände ohne Fortschritt

### Erfolgskriterien

**Nach Test (1–3 Leads):**

| Quelle | Erwartet | Tatsächlich | Status |
|---|---|---|---|
| Base44 UsageLog.leads_created | +X | ? | ? |
| Supabase lead_usage_events COUNT | +X | ? | ? |
| Dashboard-Anzeige | +X | ? | ? |
| Company-Count | +X | ? | ? |

**Alle 4 Werte müssen übereinstimmen.**

### Rollback bei Problemen

1. **Sofort-Maßnahme:**
   - Supabase-Writes in `processResearchRun` auskommentieren
   - PlatformConfig: `google_places_api_enabled = false` (Kill-Switch)

2. **Daten bereinigen:**
   ```sql
   DELETE FROM lead_usage_events WHERE organization_id = '<org_id>' AND period_month = '2026-05';
   ```

3. **Base44 bleibt SSOT:**
   - `max()`-Formel zeigt korrekte Werte
   - Keine Aktion nötig

---

## Lock-Handling (Offene Punkte)

### acquire_org_run_lock — Expiration testen

**Test-Szenario:**
1. Lock erwerben mit `acquire_org_run_lock(org, run, worker, 10000ms)`
2. Warten bis Lock abläuft (10 Sekunden)
3. Zweiter Worker versucht Lock zu erwerben → muss `true` liefern

**Erwartung:**
- Abgelaufene Locks werden automatisch freigegeben (Partial Unique Index WHERE status='active')
- Zweiter Worker kann Lock erfolgreich erwerben

### Cleanup für stale Locks

**Empfehlung:**
- Täglicher Cleanup-Job (Automation) der `research_run_locks` mit `locked_until < now() - interval '1 day'` auf `status='expired'` setzt

**SQL:**
```sql
UPDATE research_run_locks
SET status = 'expired', released_at = now()
WHERE status = 'active' AND locked_until < now() - interval '1 day';
```

---

## Quota-Reservation — Testdaten bereinigen

**Problem:** `testSupabaseRpcs` erstellt Test-Reservierungen (`rpc_test_org_01`)

**Lösung:**
```javascript
// repairQuotaCommit aufrufen mit Filter
POST /functions/repairQuotaCommit
{ organization_id: "rpc_test_org_01" }
```

**Oder manuell:**
```sql
DELETE FROM quota_reservations WHERE organization_id = 'rpc_test_org_01';
```

---

## Security-Checkliste

- [x] RPCs verwenden SECURITY DEFINER (Server-seitig)
- [x] Service Key nur in Backend-Funktionen (`Deno.env.get()`)
- [ ] Frontend hat KEINEN direkten Zugriff auf Supabase-RPCs
- [ ] Error-Handling ist non-blocking (keine Production-Impact)
- [ ] Audit-Logs enthalten keine PII (nur IDs, Metadaten)

---

## Timeline

| Phase | Status | Dauer | Kriterium |
|---|---|---|---|
| Phase 0: Infrastruktur | ✅ Grün | Abgeschlossen | Alle RPCs getestet |
| Phase 1: Integration | 🟡 Gelb | Jetzt | End-to-End-Test (1–3 Leads) |
| Phase 2: Shadow Mode | ❌ Rot | 14 Tage | <1% Diskrepanz täglich |
| Phase 3: SSOT-Transition | ❌ Rot | Nach Phase 2 | Rollback-Test erfolgreich |

---

## Fazit

**Bereit für End-to-End-Test.**

**Nächste Aktion:** 1–3 Leads testen, alle 4 Quellen vergleichen (Base44, Supabase, Dashboard, Company-Count).

**Nicht aktivieren:** Supabase bleibt Shadow Mode bis Phase 2 grün ist.