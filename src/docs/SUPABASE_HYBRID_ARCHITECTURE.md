# VERTRIEBO — SUPABASE HYBRID-ARCHITEKTUR
## Stand: 2026-05-20 | Status: PLAN (noch nicht implementiert)

> **Pflichtlektüre vor jeder Supabase-Implementierung.**
> Base44 bleibt für UI, normale CRUD-Logik, Workflows und MVP-Iteration.
> Supabase wird **ausschließlich** für kritische atomare Kernlogik eingesetzt.

---

## WARUM SUPABASE? — ROOT CAUSE

Live-Tests haben gezeigt:

| Problem | Befund | Konsequenz |
|---|---|---|
| Base44 `unique_constraints` nicht atomar | Zwei parallele Company.create für denselben Quota-Slot konnten BEIDE erfolgreich sein | Überbuchen des Monatskontingents möglich |
| Kein echter DB-Lock | Race Conditions bei parallelen ResearchRun-Workern | Workaround: Serial-Lock via `processing_lock_until` Feld |
| Kein `SELECT FOR UPDATE` / Transaktion | Quota-Check und Company.create können nicht atomar sein | max()-Formel als Kompensation nötig |

**Aktueller Workaround (2026-05-20):**
- `monthly_used = Math.max(committedSlots, usageLogValue, companiesThisMonth)` — alle drei Quellen reconciliert
- `startResearchRun` Serial-Lock verhindert parallele Runs pro Org
- Funktioniert für MVP, ist aber nicht produktionssicher bei skalierbarer Last

---

## HYBRID-ARCHITEKTUR — ENTSCHEIDUNGSMATRIX

### Base44 bleibt für:
| Bereich | Begründung |
|---|---|
| UI / React-Frontend | Keine Änderung nötig |
| Admin- und Kundenoberflächen | Vollständig funktional |
| Einfache Entities (Company, Task, ContactLog, etc.) | Kein Transaktionsbedarf |
| Workflows / Automationen | Base44-Feature, kein Ersatz nötig |
| Onboarding, Settings, Leads | Gut funktionierend |
| MVP-Iteration, Prototypen | Schnelle Entwicklung |
| Taxonomie (TaxonomyEntry) | Kein Transaktionsbedarf |

### Supabase einsetzen für:
| Bereich | Begründung |
|---|---|
| **`lead_usage_events`** | Atomares Schreiben pro Company-Create, deduplizierbar per Unique Index |
| **`quota_reservations`** (optional) | Echter Unique Index → parallele Reservierungen schlagen fehl |
| Atomare Limit-Checks | `SELECT COUNT(*) ... FOR UPDATE` + sofortiger INSERT |
| Audit-Logs (kritisch) | Unveränderliche Einträge, nicht editierbar via Base44 |
| Zukünftig: ResearchRun-Queue | Worker-State mit echten DB-Locks |

---

## PRIORITÄT 1: `lead_usage_events` — PRIMÄRE SSOT

### Tabellenschema

```sql
CREATE TABLE lead_usage_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text        NOT NULL,
  period_month    text        NOT NULL,  -- 'YYYY-MM' Europe/Berlin
  company_id      text        NOT NULL,  -- Base44 Company.id
  research_run_id text,
  event_type      text        NOT NULL DEFAULT 'research_lead_created',
  source          text        NOT NULL DEFAULT 'research',  -- 'research' | 'openregister'
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Verhindert doppelte Events für dieselbe Company
CREATE UNIQUE INDEX idx_usage_events_company_dedup
  ON lead_usage_events (organization_id, company_id, event_type);

-- Schnelle Monats-Counts
CREATE INDEX idx_usage_events_org_period
  ON lead_usage_events (organization_id, period_month);
```

### Integrations-Regeln
- Jedes `Company.create` in `processResearchRun` schreibt genau **ein** `lead_usage_events`-Eintrag.
- Jedes `Company.create` in `promoteExternalSourceToCompany` schreibt ebenfalls **ein** Eintrag (source='openregister').
- Manuell angelegte Leads (`AddCompanyDialog`, CSV Import) schreiben **keinen** Eintrag.
- Beim Lesen: `COUNT(*) WHERE organization_id=? AND period_month=?` → das ist `monthly_used`.

### Migrationsstrategie
1. Supabase-Tabelle anlegen (leer)
2. `processResearchRun` schreibt parallel zu Base44-UsageLog auch in Supabase
3. **Validierungsphase** (2 Wochen): Supabase-Count vs. UsageLog-Count vergleichen
4. Nach Bestätigung: `getUsageSummary`/`getDashboardData`/`startResearchRun` lesen aus Supabase
5. Base44-UsageLog bleibt als Fallback/Audit-Trail erhalten

---

## PRIORITÄT 2: `quota_reservations` — ATOMARE QUOTA

### Tabellenschema

```sql
CREATE TABLE quota_reservations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text        NOT NULL,
  period_month    text        NOT NULL,  -- 'YYYY-MM' Europe/Berlin
  slot_number     int         NOT NULL,  -- 1-basiert, max = plan.max_leads_per_month
  status          text        NOT NULL DEFAULT 'reserved'
                  CHECK (status IN ('reserved', 'committed', 'released')),
  company_id      text,                  -- gesetzt nach Company.create
  research_run_id text,
  created_at      timestamptz DEFAULT now()
);

-- Garantiert: nur EIN Worker kann slot_number=300 für eine Org+Periode anlegen
CREATE UNIQUE INDEX idx_quota_reservations_slot
  ON quota_reservations (organization_id, period_month, slot_number);

CREATE INDEX idx_quota_reservations_org_period
  ON quota_reservations (organization_id, period_month);
```

### Supabase RPC für atomare Reservierung

```sql
-- Funktion: reserve_quota_slot
-- Gibt slot_number zurück ODER NULL wenn Kontingent erschöpft
CREATE OR REPLACE FUNCTION reserve_quota_slot(
  p_org_id        text,
  p_period_month  text,
  p_max_slots     int,
  p_run_id        text
) RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
  v_current_count int;
  v_slot_number   int;
BEGIN
  -- Zählen committed + reserved (nicht released)
  SELECT COUNT(*) INTO v_current_count
  FROM quota_reservations
  WHERE organization_id = p_org_id
    AND period_month = p_period_month
    AND status != 'released';

  IF v_current_count >= p_max_slots THEN
    RETURN NULL;  -- Kontingent erschöpft
  END IF;

  v_slot_number := v_current_count + 1;

  INSERT INTO quota_reservations
    (organization_id, period_month, slot_number, status, research_run_id)
  VALUES
    (p_org_id, p_period_month, v_slot_number, 'reserved', p_run_id);

  RETURN v_slot_number;  -- Slot erfolgreich reserviert
EXCEPTION
  WHEN unique_violation THEN
    RETURN NULL;  -- Race Condition: anderer Worker war schneller
END;
$$;
```

---

## INTEGRATIONSMODELL MIT BASE44

### Aufrufmuster (Base44 Function → Supabase REST/RPC)

```javascript
// In processResearchRun (Deno Backend Function):
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");

async function writeUsageEvent(orgId, periodMonth, companyId, runId, source = 'research') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/lead_usage_events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      'Prefer': 'resolution=ignore-duplicates',  // kein Fehler bei Duplikat (Unique Index)
    },
    body: JSON.stringify({
      organization_id: orgId,
      period_month: periodMonth,
      company_id: companyId,
      research_run_id: runId,
      source,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn(`[writeUsageEvent] Supabase write failed (non-blocking): ${err}`);
    // NICHT werfen — Supabase-Fehler dürfen den Base44-Flow nicht blockieren
  }
}

async function getMonthlyUsedFromSupabase(orgId, periodMonth) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/lead_usage_events?organization_id=eq.${orgId}&period_month=eq.${periodMonth}&select=id`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Prefer': 'count=exact',
        'Range': '0-0',  // Nur Count, keine Daten
      }
    }
  );
  const count = parseInt(res.headers.get('content-range')?.split('/')[1] || '0');
  return count;
}
```

### Sicherheitsregeln
- ❌ **`SUPABASE_SERVICE_KEY` niemals im Frontend** — nur in Base44 Secrets für Backend Functions
- ❌ **Supabase Keys nicht in Base44 Entities speichern**
- ✅ Nur `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` als Base44 Secrets
- ✅ Row Level Security (RLS) in Supabase aktivieren, aber Service Key umgeht RLS (nur serverseitig verwenden)

---

## MVP-REIHENFOLGE — SCHRITTWEISE MIGRATION

### Phase 0: Vorbereitung (Voraussetzung für alles)
- [ ] Supabase-Projekt anlegen (z.B. `vertriebo-prod`)
- [ ] `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` als Base44 Secrets setzen
- [ ] Tabelle `lead_usage_events` mit Unique Index anlegen
- [ ] Verbindungstest: Base44 Function ruft Supabase REST auf

### Phase 1: Paralleles Schreiben (Shadow Mode)
- [ ] `processResearchRun`: nach jedem `Company.create` → `writeUsageEvent()` (non-blocking)
- [ ] `promoteExternalSourceToCompany`: identisch
- [ ] **Kein Lesen aus Supabase** — nur Schreiben
- [ ] Validierung: Supabase COUNT vs. UsageLog.leads_created vergleichen (2 Wochen)
- [ ] Akzeptanzkriterium: Abweichung < 1% über 14 Tage

### Phase 2: Lesen aus Supabase (Usage-SSOT)
- [ ] `getUsageSummary`: Supabase COUNT als primäre Quelle, max()-Formel als Fallback
- [ ] `getDashboardData`: identisch (inline, kein functions.invoke)
- [ ] `startResearchRun`: Limit-Check via Supabase COUNT
- [ ] Live-Test: alle 3 Stellen zeigen identischen Wert
- [ ] Akzeptanzkriterium: `startResearchRun` gibt HTTP 402 wenn Supabase COUNT >= limit

### Phase 3: Atomare Quota (Optional, nach Phase 2 stabil)
- [ ] `quota_reservations`-Tabelle + `reserve_quota_slot()` RPC anlegen
- [ ] `processResearchRun`: vor `Company.create` → `reserve_quota_slot()` aufrufen
- [ ] Parallele-Slot-Test: Gleicher Test wie `parallelQuotaTest` → nur ein Slot reserviert
- [ ] Akzeptanzkriterium: Bei gleichzeitigen Requests bekommt nur einer slot_number=300

### Phase 4: Audit-Logs (Optional)
- [ ] Supabase-Tabelle `billing_audit_log` für kritische Billing-Events
- [ ] Events: quota_reached, plan_changed, subscription_canceled, manual_override

---

## ROLLBACK-STRATEGIE

Falls Supabase-Integration Probleme macht:
1. `SUPABASE_WRITE_ENABLED=false` als Base44 Secret → `writeUsageEvent()` skippt Supabase
2. `getMonthlyUsedFromSupabase()` fällt auf max()-Formel mit Base44-Quellen zurück
3. Base44-UsageLog bleibt immer als Fallback-Quelle erhalten
4. Rollback ohne Datenverlust möglich (Base44 hat alle Daten)

---

## OFFENE FRAGEN VOR IMPLEMENTIERUNG

| Frage | Status |
|---|---|
| Supabase-Region? (EU wegen DSGVO) | ⚠️ Offen — `eu-central-1` (Frankfurt) empfohlen |
| Supabase-Plan? (Free / Pro) | ⚠️ Offen — Free für Phase 0+1, Pro ab Phase 2 |
| RLS-Strategie? (Service Key umgeht RLS) | ⚠️ Offen — Service Key only reicht für Backend-Only-Zugriff |
| Backup-Strategie Supabase → Base44? | ⚠️ Offen — Supabase hat eigene Backups, tägliches Dump empfohlen |
| Monitoring/Alerting Supabase? | ⚠️ Offen — Supabase Dashboard + Base44 `sendCriticalErrorAlert` |

---

## AKZEPTANZKRITERIEN — GESAMTBLOCK

- [ ] `supabaseProjectCreated` — Projekt existiert, Zugangsdaten als Secrets
- [ ] `leadUsageEventsTableCreated` — mit korrektem Unique Index
- [ ] `shadowModeRunning` — processResearchRun schreibt parallel zu Base44
- [ ] `shadowModeValidated` — Abweichung < 1% über 14 Tage
- [ ] `usageSsotMigrated` — getUsageSummary/getDashboardData/startResearchRun lesen aus Supabase
- [ ] `parallelQuotaAtomicVerified` — Unique Violation bei gleichzeitiger Reservierung
- [ ] `noBase44DataLost` — alle Reads haben Fallback auf Base44-Quellen
- [ ] `noSupabaseKeyInFrontend` — Service Key ausschließlich in Backend Functions
- [ ] `rollbackTestedAndDocumented`
- [ ] `merklisteUpdated`

---

**Status:** ✅ PHASE 0 ABGESCHLOSSEN (2026-05-20) — Migrationen erstellt, bereit für Deployment.

### Abgeschlossene Phase 0 (2026-05-20)

| Migration | Datei | Zweck |
|---|---|---|
| `lead_usage_events` | `20260520000001_create_lead_usage_events.sql` | Atomares Usage-Tracking (Shadow Mode Phase 1) |
| `shadow_mode_log` | `20260520000002_create_shadow_mode_log.sql` | Audit-Trail für Konsistenzprüfung |
| `quota_reservations` | `20260520000003_create_quota_reservations.sql` | Atomare Quota mit Unique Index |
| `rpc_functions` | `20260520000004_create_rpc_functions.sql` | `reserve_quota_slot`, `get_monthly_usage`, `record_lead_usage_event`, Lock-RPCs |
| `research_run_locks` | `20260520000005_create_research_run_locks.sql` | Atomarer Worker-Lock pro Org |
| `research_run_audit` | `20260520000006_create_research_run_audit.sql` | Unveränderlicher Run-Audit-Trail |

### Nächste Schritte

1. **Supabase-Projekt anlegen** (eu-central-1 für DSGVO)
2. **Secrets setzen**: `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in Base44
3. **Migrationen deployen**: `supabase db push` (local test) → `supabase db push --linked` (prod)
4. **Verbindungstest**: Base44 Function ruft Supabase REST auf
5. **Phase 1 starten**: Shadow Mode für `processResearchRun` aktivieren

**Nächste Aktion:** Supabase-Projekt anlegen + Migrationen deployen.