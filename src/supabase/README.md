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
supabase/config.toml
supabase/migrations/20260520000001_create_lead_usage_events.sql
supabase/migrations/20260520000002_create_shadow_mode_log.sql
```

## Rules

- Do not store SUPABASE_SERVICE_KEY in GitHub.
- Do not expose service role keys in frontend code.
- Do not switch Dashboard/Billing/startResearchRun to Supabase-only usage counts until Shadow Mode validation is complete.
- Keep Base44 fallback active until a documented migration decision is made.

## Apply migrations

Use the Supabase Dashboard SQL editor or Supabase CLI according to the project setup.
