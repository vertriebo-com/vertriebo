-- Vertriebo Supabase Shadow Mode Phase 1
-- lead_usage_events: one usage event per automatically created research lead.
-- No secrets in this file.

CREATE TABLE IF NOT EXISTS lead_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  period_month text NOT NULL,
  company_id text NOT NULL,
  research_run_id text,
  event_type text NOT NULL DEFAULT 'research_lead_created',
  source text NOT NULL DEFAULT 'research',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_events_company_dedup
  ON lead_usage_events (organization_id, period_month, company_id, event_type);

CREATE INDEX IF NOT EXISTS idx_usage_events_org_period
  ON lead_usage_events (organization_id, period_month);

CREATE INDEX IF NOT EXISTS idx_usage_events_research_run
  ON lead_usage_events (research_run_id);
