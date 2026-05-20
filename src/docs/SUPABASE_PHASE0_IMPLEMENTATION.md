# SUPABASE PHASE 0 — IMPLEMENTATION COMPLETE
## Stand: 2026-05-20 | Migrationen erstellt, bereit für Deployment

---

## ZUSAMMENFASSUNG

Phase 0 der Supabase-Hybrid-Architektur ist abgeschlossen. Alle kritischen Tabellen und RPC-Funktionen für atomare Kernlogik sind erstellt.

### Base44 bleibt für:
- ✅ UI / React-Frontend
- ✅ Dashboard, Leads, Tasks, Settings
- ✅ Admin-Oberflächen (PlatformAdmin, Diagnostics)
- ✅ Taxonomie (TaxonomyEntry)
- ✅ Normale CRUD-Operationen ohne Transaktionsbedarf

### Supabase übernimmt kritische Kernlogik:
- ✅ `lead_usage_events` — Atomares Usage-Tracking (SSOT nach Validierung)
- ✅ `quota_reservations` — Atomare Quota-Reservierung (Unique Index)
- ✅ `research_run_locks` — Worker-Locks (verhindert parallele Verarbeitung)
- ✅ `research_run_audit` — Unveränderlicher Audit-Trail
- ✅ RPCs — `reserve_quota_slot`, `get_monthly_usage`, Lock-Acquire/Release

---

## MIGRATIONEN — ÜBERBLICK

| # | Datei | Tabelle/Funktion | Zweck |
|---|---|---|---|
| 1 | `20260520000001_create_lead_usage_events.sql` | `lead_usage_events` | Usage-Events mit Unique Index (Dedup) |
| 2 | `20260520000002_create_shadow_mode_log.sql` | `shadow_mode_log` | Konsistenz-Audit (Supabase vs. Base44) |
| 3 | `20260520000003_create_quota_reservations.sql` | `quota_reservations` | Atomare Quota mit Unique Index |
| 4 | `20260520000004_create_rpc_functions.sql` | 5 RPCs | `reserve_quota_slot`, `get_monthly_usage`, `record_lead_usage_event`, Lock-RPCs |
| 5 | `20260520000005_create_research_run_locks.sql` | `research_run_locks` | Worker-Locks pro Org |
| 6 | `20260520000006_create_research_run_audit.sql` | `research_run_audit` + RPC | Unveränderlicher Audit-Trail |

---

## TABELLEN — DETAIL-SPEZIFIKATION

### 1. `lead_usage_events` (Prio 1 — SSOT nach Validierung)

```sql
CREATE TABLE lead_usage_events (
  id              BIGSERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL,
  period_month    TEXT NOT NULL,   -- YYYY-MM (Europe/Berlin)
  company_id      TEXT NOT NULL,   -- Base44 Company.id
  research_run_id TEXT,            -- Base44 ResearchRun.id
  event_type      TEXT NOT NULL DEFAULT 'research_lead_created',
  source          TEXT NOT NULL DEFAULT 'research',  -- 'research' | 'openregister'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UNIQUE: Verhindert Duplikate bei Retry
CONSTRAINT uq_lead_usage_event UNIQUE (organization_id, period_month, company_id, event_type)
```

**Integration:**
- `processResearchRun`: nach `Company.create` → `record_lead_usage_event()` RPC
- `promoteExternalSourceToCompany`: identisch (source='openregister')
- Manuelle Leads: KEIN Event (bewusst)

**Lesen:**
- `get_monthly_usage(org_id, period_month)` RPC → exakter COUNT
- Phase 2: `getUsageSummary`, `getDashboardData`, `startResearchRun` nutzen Supabase als SSOT

---

### 2. `quota_reservations` (Prio 2 — Optional, nach Phase 2 stabil)

```sql
CREATE TABLE quota_reservations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  period_month    TEXT NOT NULL,
  slot_number     INT NOT NULL,   -- 1-basiert, max = plan.max_leads_per_month
  status          TEXT NOT NULL DEFAULT 'reserved'
                  CHECK (status IN ('reserved', 'committed', 'released')),
  company_id      TEXT,           -- Base44 Company.id (nach Commit)
  research_run_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at    TIMESTAMPTZ,
  released_at     TIMESTAMPTZ
);

-- UNIQUE: Garantiert atomare Reservierung
CREATE UNIQUE INDEX idx_quota_reservations_slot
  ON quota_reservations (organization_id, period_month, slot_number);
```

**RPC: `reserve_quota_slot(org_id, period_month, max_slots, run_id)`**
- Gibt `slot_number` zurück bei Erfolg
- Gibt `NULL` zurück wenn Kontingent erschöpft ODER Race Condition

**Integration (Phase 3):**
- `processResearchRun`: vor `Company.create` → RPC aufrufen
- Bei `NULL` → HTTP 402 (Quota exhausted)

---

### 3. `research_run_locks` (Prio 3 — Skalierbare Queue-Architektur)

```sql
CREATE TABLE research_run_locks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  research_run_id TEXT NOT NULL,
  worker_key      TEXT NOT NULL,   -- Format: user.email:timestamp
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'released', 'expired')),
  locked_until    TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at     TIMESTAMPTZ
);

-- UNIQUE: Nur EIN aktiver Lock pro Org
CREATE UNIQUE INDEX idx_research_run_locks_org_active
  ON research_run_locks (organization_id, status)
  WHERE status = 'active';
```

**RPCs:**
- `acquire_org_run_lock(org_id, run_id, worker_key, lock_duration_ms)` → `true/false`
- `release_org_run_lock(org_id, worker_key)` → `true/false`

**Integration (Phase 4):**
- Ersetzt Base44 `processing_lock_until` Feld
- Ermöglicht echte Queue-Architektur mit Worker-Pool

---

### 4. `research_run_audit` (Prio 4 — Audit/Compliance)

```sql
CREATE TABLE research_run_audit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  research_run_id TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  event_data      jsonb NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  worker_key      TEXT,
  error_message   TEXT
);
```

**RPC: `audit_research_event(org_id, run_id, event_type, event_data, worker_key, error_message)`**
- Schreibt idempotent (non-blocking)
- Events: `run_started`, `batch_complete`, `company_created`, `quota_reached`, `run_failed`, `run_completed`

---

## RPC-FUNKTIONEN — VOLLSPEZIFIKATION

### `reserve_quota_slot(org_id, period_month, max_slots, run_id) → int | NULL`

```sql
-- Atomare Quota-Reservierung via UNIQUE INDEX
-- Rückgabe: slot_number (1-basiert) ODER NULL wenn erschöpft/Race
```

**Logik:**
1. COUNT committed + reserved (nicht released)
2. Wenn COUNT >= max_slots → NULL
3. INSERT mit UNIQUE-Schutz
4. Bei unique_violation → NULL (Race Condition)

---

### `get_monthly_usage(org_id, period_month) → bigint`

```sql
-- Exakter COUNT aus lead_usage_events
-- SSOT nach 14-Tage-Validierung
```

---

### `record_lead_usage_event(org_id, period_month, company_id, run_id, source) → boolean`

```sql
-- Schreibt Usage-Event idempotent (ON CONFLICT DO NOTHING)
-- Non-blocking: Fehler werden nur geloggt, nicht geworfen
```

---

### `acquire_org_run_lock(org_id, run_id, worker_key, lock_duration_ms) → boolean`

```sql
-- Atomarer Lock für ResearchRun-Verarbeitung
-- UNIQUE INDEX garantiert nur EIN aktiver Lock pro Org
```

---

### `release_org_run_lock(org_id, worker_key) → boolean`

```sql
-- Gibt Lock frei (nach erfolgreicher Verarbeitung)
```

---

### `audit_research_event(org_id, run_id, event_type, event_data, worker_key, error_message) → boolean`

```sql
-- Schreibt Audit-Event (non-blocking)
-- Event-Typen: run_started, batch_complete, company_created, quota_reached, run_failed, run_completed
```

---

## DEPLOYMENT — SCHRITTWEISE ANLEITUNG

### 1. Supabase-Projekt anlegen

```bash
# Supabase CLI installieren (falls nicht vorhanden)
npm install -g supabase

# Login
supabase login

# Neues Projekt (eu-central-1 für DSGVO)
supabase projects create --name vertriebo-prod --region eu-central-1
```

### 2. Secrets in Base44 setzen

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
```

⚠️ **WICHTIG:** `SUPABASE_SERVICE_KEY` niemals im Frontend verwenden!

### 3. Migrationen deployen (Test)

```bash
# Local testen
supabase start
supabase db push

# Mit linked Project testen
supabase link --project-ref xxx
supabase db push
```

### 4. Migrationen deployen (Production)

```bash
supabase db push --linked
```

### 5. Verbindungstest

Base44 Function aufrufen:
```javascript
const res = await fetch(`${SUPABASE_URL}/rest/v1/lead_usage_events`, {
  headers: {
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'apikey': SUPABASE_SERVICE_KEY,
  }
});
// Erwartet: 200 OK (leere Tabelle)
```

---

## NÄCHSTE SCHRITTE — PHASE 1+

### Phase 1: Shadow Mode (2026-05-20+)

- [ ] `processResearchRun` schreibt parallel zu Base44-UsageLog auch in Supabase
- [ ] `promoteExternalSourceToCompany` identisch
- [ ] `shadow_mode_log` schreibt täglich Konsistenzprüfung
- [ ] Validierung: 14 Tage mit <1% Abweichung

### Phase 2: Usage-SSOT (nach 14 Tagen)

- [ ] `getUsageSummary` liest aus Supabase (max()-Formel als Fallback)
- [ ] `getDashboardData` identisch
- [ ] `startResearchRun` Limit-Check via Supabase COUNT
- [ ] Live-Test: HTTP 402 wenn Supabase COUNT >= limit

### Phase 3: Atomare Quota (Optional)

- [ ] `processResearchRun` ruft `reserve_quota_slot()` vor Company.create
- [ ] Parallele-Slot-Test (identisch zu `parallelQuotaTest`)
- [ ] Unique Violation bei Race Condition → HTTP 402

### Phase 4: Worker-Locks (Optional)

- [ ] `processResearchRun` nutzt `acquire_org_run_lock()` statt Base44 Feld
- [ ] Echte Queue-Architektur mit Worker-Pool
- [ ] Skalierbar auf mehrere parallele Worker

---

## ROLLBACK-STRATEGIE

Falls Supabase Probleme macht:

1. **Shadow Mode deaktivieren:**
   ```
   SUPABASE_WRITE_ENABLED=false (Base44 Secret)
   ```

2. **Reads fallen auf Base44 zurück:**
   - `getUsageSummary` nutzt max()-Formel (committedSlots, usageLogValue, companiesThisMonth)
   - `processResearchRun` schreibt nur Base44-UsageLog

3. **Kein Datenverlust:**
   - Base44-UsageLog bleibt immer erhalten
   - Supabase kann später re-aktiviert werden

---

## AKZEPTANZKRITERIEN — PHASE 0

- ✅ `migrationFilesCreated` — 6 Migrationen erstellt
- ✅ `tablesDocumented` — Alle Tabellen spezifiziert
- ✅ `rpcFunctionsDocumented` — Alle RPCs spezifiziert
- ✅ `deploymentGuideWritten` — Schrittweise Anleitung
- ✅ `rollbackStrategyDocumented`
- ✅ `nextStepsDefined` — Phase 1-4 geplant

### Ausstehend (nach Deployment)

- [ ] `supabaseProjectCreated` — Projekt existiert
- [ ] `secretsSet` — SUPABASE_URL + SUPABASE_SERVICE_KEY in Base44
- [ ] `migrationsDeployed` — Alle 6 Migrationen deployed
- [ ] `connectionTestPassed` — Base44 Function kann Supabase erreichen
- [ ] `shadowModeRunning` — processResearchRun schreibt parallel
- [ ] `shadowModeValidated` — 14 Tage mit <1% Abweichung

---

**Datum:** 2026-05-20  
**Status:** ✅ PHASE 0 ABGESCHLOSSEN — Alle 6 Migrationen im Repo sichtbar  
**Nächste Aktion:** Supabase-Projekt anlegen + Migrationen deployen

### GitHub-Verifikation (2026-05-20)

Alle Migrationen sind jetzt im Repo sichtbar:

| # | Datei | GitHub-Status |
|---|---|---|
| 1 | `20260520000001_create_lead_usage_events.sql` | ✅ Vorhanden |
| 2 | `20260520000002_create_shadow_mode_log.sql` | ✅ Vorhanden |
| 3 | `20260520000003_create_quota_reservations.sql` | ✅ **Neu erstellt** |
| 4 | `20260520000004_create_rpc_functions.sql` | ✅ **Neu erstellt** |
| 5 | `20260520000005_create_research_run_locks.sql` | ✅ **Neu erstellt** |
| 6 | `20260520000006_create_research_run_audit.sql` | ✅ **Neu erstellt** |

**Verifizierte RPCs in Migration 04:**
- `reserve_quota_slot()` — Atomare Quota-Reservierung
- `get_monthly_usage()` — Exakter Usage-Count
- `record_lead_usage_event()` — Idempotentes Writing
- `acquire_org_run_lock()` — Worker-Lock
- `release_org_run_lock()` — Lock-Release
- `audit_research_event()` — Audit-Trail

**Keine Secrets in Migrationen:**
- ✅ Keine API-Keys oder Credentials in SQL-Dateien
- ✅ `SECURITY DEFINER` für RPCs (umgeht RLS für Service-Key-Calls)
- ✅ Alle Secrets ausschließlich in Base44 (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`)