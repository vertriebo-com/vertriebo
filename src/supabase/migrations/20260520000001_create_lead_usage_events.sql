-- Migration: lead_usage_events
-- Zweck: Atomares Tracking jedes Research-Leads (Shadow Mode Phase 1)
-- Erstellt: 2026-05-20
-- Dokumentation: docs/SUPABASE_SHADOW_MODE_STATUS.md

CREATE TABLE IF NOT EXISTS public.lead_usage_events (
  id              BIGSERIAL PRIMARY KEY,
  organization_id TEXT        NOT NULL,
  period_month    TEXT        NOT NULL,   -- Format: YYYY-MM (Europe/Berlin Kalendermonat)
  company_id      TEXT        NOT NULL,   -- Base44 Company.id
  research_run_id TEXT,                   -- Base44 ResearchRun.id (null bei manuellen Leads)
  event_type      TEXT        NOT NULL DEFAULT 'research_lead_created',
  source          TEXT        NOT NULL DEFAULT 'research',  -- 'research' | 'openregister'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- UNIQUE: verhindert Duplikate bei Retry oder doppeltem Shadow Write
  CONSTRAINT uq_lead_usage_event UNIQUE (organization_id, period_month, company_id, event_type)
);

-- Index für monatliche COUNT-Queries (Haupt-Abfrage-Pattern)
CREATE INDEX IF NOT EXISTS idx_lead_usage_events_org_period
  ON public.lead_usage_events (organization_id, period_month);

-- Index für event_type-Filter
CREATE INDEX IF NOT EXISTS idx_lead_usage_events_event_type
  ON public.lead_usage_events (event_type);

COMMENT ON TABLE public.lead_usage_events IS
  'Atomares Usage-Tracking für Research-Leads. Shadow Mode Phase 1: parallel zu Base44 UsageLog geschrieben. Wird nach Validierung (>14 Tage, <1% Abweichung) zur SSOT für Quota-Enforcement.';