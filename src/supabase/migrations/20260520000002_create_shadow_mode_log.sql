-- Migration: shadow_mode_log
-- Zweck: Täglicher Audit-Trail für Supabase vs. Base44 Konsistenzprüfung
-- Erstellt: 2026-05-20

CREATE TABLE IF NOT EXISTS public.shadow_mode_log (
  id              BIGSERIAL PRIMARY KEY,
  organization_id TEXT        NOT NULL,
  period_month    TEXT        NOT NULL,   -- Format: YYYY-MM
  supabase_count  INT         NOT NULL DEFAULT 0,
  base44_count    INT         NOT NULL DEFAULT 0,
  diff            INT         GENERATED ALWAYS AS (supabase_count - base44_count) STORED,
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für Queries nach Org + Periode + Datum
CREATE INDEX IF NOT EXISTS idx_shadow_mode_log_org_period_date
  ON public.shadow_mode_log (organization_id, period_month, checked_at);

COMMENT ON TABLE public.shadow_mode_log IS
  'Täglicher Vergleich Supabase vs. Base44 Usage-Counts. Supabase wird zur SSOT wenn diff=0 über 14 Tage.';