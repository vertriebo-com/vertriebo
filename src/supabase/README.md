# Vertriebo Supabase

This folder contains Supabase database assets for the Vertriebo hybrid architecture.

Supabase is used only for critical transactional backend logic such as usage events, quota reservations and future audit/lock tables.

Base44 remains the primary app platform for UI, CRM screens, workflows and normal product iteration.

## Current phase

Status: Shadow Mode Phase 1

- Base44 max-formula remains the active source for production usage display and quota checks.
- Supabase lead_usage_events receives non-blocking shadow writes.
- Supabase is not yet the primary source of truth.
- No Supabase keys or secrets belong in this repository.

## Files

```txt
src/supabase/config.toml
src/supabase/migrations/20260520000001_create_lead_usage_events.sql
src/supabase/migrations/20260520000002_create_shadow_mode_log.sql
src/supabase/migrations/20260520000003_create_quota_reservations.sql
src/supabase/migrations/20260520000004_create_rpc_functions.sql
src/supabase/migrations/20260520000005_create_research_run_locks.sql
src/supabase/migrations/20260520000006_create_research_run_audit.sql
src/supabase/migrations/20260520000007_create_lock_rpc_functions.sql
```

**Wichtig:** Alle Dateien befinden sich unter `src/supabase/`, nicht unter `supabase/` im Root-Verzeichnis.

## Rules

- Do not store SUPABASE_SERVICE_KEY in GitHub.
- Do not expose service role keys in frontend code.
- Do not switch Dashboard/Billing/startResearchRun to Supabase-only usage counts until Shadow Mode validation is complete.
- Keep Base44 fallback active until a documented migration decision is made.

## Apply migrations

### Supabase CLI (recommended)

```bash
# Link zu Supabase-Projekt
supabase link --project-ref <your-project-ref>

# Migrationen mit korrektem Working Directory deployen
supabase db push --db-url "$SUPABASE_DB_URL"
```

### Supabase Dashboard SQL Editor

Copy-paste jede Migration von `src/supabase/migrations/` in den SQL Editor:

1. `20260520000001_create_lead_usage_events.sql`
2. `20260520000002_create_shadow_mode_log.sql`
3. `20260520000003_create_quota_reservations.sql`
4. `20260520000004_create_rpc_functions.sql`
5. `20260520000005_create_research_run_locks.sql`
6. `20260520000006_create_research_run_audit.sql`
7. `20260520000007_create_lock_rpc_functions.sql` (nach 05, da abhängig von Tabelle)

**Wichtig:** Alle Migrationen müssen in dieser Reihenfolge ausgeführt werden, da Migration 07 die Tabelle aus Migration 05 benötigt.