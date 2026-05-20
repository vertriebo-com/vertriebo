-- Migration: Fix record_lead_usage_event ON CONFLICT-Spalten
-- Hintergrund: Migration 01 erstellt UNIQUE INDEX idx_usage_events_company_dedup
--   auf (organization_id, company_id, event_type) — OHNE period_month.
--   Migration 04 hat ON CONFLICT (organization_id, period_month, company_id, event_type)
--   → kein passender UNIQUE INDEX → PostgreSQL wirft invalid_column_reference
--   → EXCEPTION WHEN others → RETURN false.
--
-- Lösung: ON CONFLICT-Klausel auf die tatsächlich existierenden Index-Spalten korrigieren.
-- Erstellt: 2026-05-20

CREATE OR REPLACE FUNCTION record_lead_usage_event(
  p_organization_id text,
  p_period_month    text,
  p_company_id      text,
  p_research_run_id text,
  p_source          text DEFAULT 'research'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO lead_usage_events
    (organization_id, period_month, company_id, research_run_id, source)
  VALUES
    (p_organization_id, p_period_month, p_company_id, p_research_run_id, p_source)
  ON CONFLICT (organization_id, company_id, event_type)
  DO NOTHING;

  RETURN true;

EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'record_lead_usage_event failed: %', SQLERRM;
    RETURN false;
END;
$$;

COMMENT ON FUNCTION record_lead_usage_event IS
  'Schreibt Usage-Event idempotent. ON CONFLICT auf (organization_id, company_id, event_type) — passend zu idx_usage_events_company_dedup aus Migration 01.';