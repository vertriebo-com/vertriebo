-- Vertriebo Supabase Shadow Mode Phase 1
-- shadow_mode_log: stores validation snapshots between Supabase and Base44 counters.
-- No secrets in this file.

CREATE TABLE IF NOT EXISTS shadow_mode_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  period_month text NOT NULL,
  supabase_count int NOT NULL DEFAULT 0,
  base44_count int NOT NULL DEFAULT 0,
  diff int GENERATED ALWAYS AS (supabase_count - base44_count) STORED,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shadow_log_org_period
  ON shadow_mode_log (organization_id, period_month);

CREATE INDEX IF NOT EXISTS idx_shadow_log_checked_at
  ON shadow_mode_log (checked_at DESC);
