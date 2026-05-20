-- Migration: shadow_mode_log
-- Zweck: Audit-Trail für täglichen Vergleich Supabase vs. Base44 UsageLog
-- Erstellt: 2026-05-20
-- Dokumentation: docs/SUPABASE_SHADOW_MODE_STATUS.md

CREATE TABLE IF NOT EXISTS public.shadow_mode_log (
  id              BIGSERIAL PRIMARY KEY,
  organization_id TEXT        NOT NULL,
  period_month    TEXT        NOT NULL,   -- Format: YYYY-MM
  supabase_count  INT         NOT NULL,   -- COUNT aus lead_usage_events
  base44_count    INT         NOT NULL,   -- UsageLog.leads_created aus Base44
  diff            INT         NOT NULL,   -- supabase_count - base44_count
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für zeitliche Auswertung pro Org
CREATE INDEX IF NOT EXISTS idx_shadow_mode_log_org_period
  ON public.shadow_mode_log (organization_id, period_month, checked_at DESC);

COMMENT ON TABLE public.shadow_mode_log IS
  'Täglicher Validierungslog Shadow Mode: Supabase COUNT vs. Base44 UsageLog. Ziel: neue Abweichung (ab 2026-05-20) < 1% über 14 Tage. Erst dann wird Supabase zur SSOT promoviert.';