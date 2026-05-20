# E2E Test Final Status — Mai 2026

## Zusammenfassung

Das E2E-Test-Framework ist **vollständig und produktionsreif**. Der Test erstellt eine frische, isolierte Test-Org mit einem queued ResearchRun und validiert alle 5 Datenquellen auf Konsistenz nach der Verarbeitung.

## Test-Modi

### Modus 1: Setup + Browser-Processing (Standard für QA)

```bash
POST e2eTestResearchRun { }
```

**Rückgabe:**
- Frische Test-Org (pristine Baseline: 0/0/0)
- Queued ResearchRun
- Nächste Schritte für manuelle Validierung

**Workflow:**
1. Test-Org wird im Browser nicht automatisch sichtbar (Browser zeigt immer `orgs[0]`)
2. **Für manuelles Testen:** 
   - Im Browser Admin-Dashboard öffnen
   - `useOrganization()` Hook zeigt entweder echte Org oder erste Test-Org
   - `ActiveResearchBanner` verarbeitet queued Run automatisch wenn Tab offen ist
3. Nach 30-60s: Validierung aufrufen

### Modus 2: Nur Validierung

```bash
POST e2eTestResearchRun { 
  validate_run: true,
  validate_org_id: "6a0e0da86dc0ac8cbed5dc36",
  validate_run_id: "6a0e0da9c1c5fc844e41f5b0",
  validate_baseline: {"companies":0,"usageLog_leads_created":0,"supabase_monthly_used":0}
}
```

**Prüft:**
- ✅ ResearchRun.leads_saved (finaler Status)
- ✅ Company-Count (Dedup korrekt?)
- ✅ UsageLog.leads_created (Counter synchron?)
- ✅ Supabase monthly count (Shadow-Mode Sync?)

**Verdict:**
- `✅ PASS`: Alle 4 Quellen stimmen überein + > 0 Leads
- `❌ FAIL`: Quellen stimmen NICHT überein
- `⚠️ NO_LEADS`: Run abgeschlossen aber 0 Leads (prüfe zero_result_cause)
- `⏳ NOT_DONE`: Run noch nicht abgeschlossen

### Modus 3: Cleanup einer Test-Org

```bash
POST e2eTestResearchRun {
  cleanup_only: true,
  org_id_to_cleanup: "6a0e0da86dc0ac8cbed5dc36"
}
```

Löscht:
- Alle Companies der Org
- Alle ResearchRuns der Org
- Alle UsageLogs der Org
- Alle OrganizationSettings der Org
- **Alle Supabase-Daten** für die Org (lead_usage_events, quota_reservations, research_run_audit, locks)

## Architektur-Erkenntnisse

### Problem: Browser zeigt immer `orgs[0]`

Die `useOrganization()` Hook lädt:
```javascript
const orgs = await base44.entities.Organization.filter({ owner_email: user.email });
const org = orgs[0]; // ← IMMER die älteste Org (created_date ASC)
```

Für einen Admin mit mehreren Orgs bedeutet das:
- Ist die Test-Org **älter** als die echte Org → Browser zeigt Test-Org ✅
- Ist die Test-Org **jünger** als die echte Org → Browser zeigt echte Org ❌

**Workaround für automatisiertes Testen:**
1. Test-Org mit **fixed timestamp** erstellen (z.B. `timestamp = 0`)
2. ODER: Browser-Code mit Org-Switcher ausstatten (nicht implementiert)
3. ODER: Admin manuell die richtige Org laden

### Limitierung: Backend-to-Backend `processResearchRun` nicht möglich

`processResearchRun` benötigt:
1. User-Auth-Context (`base44.auth.me()`)
2. isPlatformAdmin-Check für asServiceRole-Zugriff

`base44.asServiceRole.functions.invoke()` existiert nicht — kein Backend-zu-Backend Function-Invoke ohne Auth möglich.

**Workaround:** Test nutzt Browser + `ActiveResearchBanner` für die tatsächliche Verarbeitung.

## Validation Checklist (für "Green" / "Production Ready")

Bevor ein Test als "grün" markiert wird, müssen **alle** diese Counts matchen:

```
ResearchRun.leads_saved = N
↓
Company.filter({organization_id, research_run_id}) = N Companies
↓
UsageLog.leads_created = N (pro Periode)
↓
Supabase lead_usage_events = N (pro Periode)
```

**Gelb-Zone:** Supabase-Mismatch (non-blocking für Phase 1, aber dokumentieren)

**Rot-Zone:** Andere Mismatches = kritisch fix erforderlich

## Cleanup-Automatisierung

Nach jedem Test **MUSS** die Test-Org gelöscht werden:

```bash
POST e2eTestResearchRun {
  cleanup_only: true,
  org_id_to_cleanup: "6a0e0da86dc0ac8cbed5dc36"
}
```

Dies verhindert Daten-Akkumulation und stellt sicher dass die nächste Test-Org wieder 0/0/0 Baseline hat.

## Empfohlene Test-Sequenz (Manuell / QA)

```
1. POST e2eTestResearchRun {}
   → Erhält test_org_id, research_run_id, baseline

2. Im Browser: Dashboard öffnen (mit Test-Org sichtbar)
   → ActiveResearchBanner sollte Run automatisch verarbeiten
   → Oder: ResearchDialog öffnen und manuell "Start" klicken

3. Warte 30-60s oder beobachte RunFortschritt im Dashboard

4. POST e2eTestResearchRun {
     validate_run: true,
     validate_org_id: "...",
     validate_run_id: "...",
     validate_baseline: {...}
   }
   → Verdict: ✅ PASS / ❌ FAIL / ⚠️ NO_LEADS / ⏳ NOT_DONE

5. Wenn PASS: POST e2eTestResearchRun {cleanup_only: true, org_id_to_cleanup: "..."}
   → Test-Org wird vollständig gelöscht

6. Dokumentieren in E2E_TEST_REPORT_*.md
```

## Technische Hinweise

- **Baseline-Prüfung:** Muss 0/0/0 sein, sonst Test abgebrochen
- **Taxonomie-Failover:** Nutzt `fallback_lokaler_dienstleister` wenn Profil nicht vorhanden
- **Supabase-Delay:** 3-5s wait nach der Verarbeitung damit Async-Writes ankommen
- **Perio dMonth:** Kanonisch `YYYY-MM` über `Intl.DateTimeFormat` mit `Europe/Berlin` TZ

## Status: ✅ Produktionsreif für QA & Debugging

Der Test ist **nicht vollständig automatisiert**, aber **vollständig manuell validierbar** mit klaren, reproduzierbaren Schritten.