-- Migration: research_run_audit
-- Zweck: Unveränderlicher Audit-Trail für ResearchRun-Ereignisse
-- Erstellt: 2026-05-20

CREATE TABLE IF NOT EXISTS public.research_run_audit (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT        NOT NULL,
  research_run_id TEXT        NOT NULL,
  event_type      TEXT        NOT NULL,
  event_data      JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  worker_key      TEXT,
  error_message   TEXT
);

-- Index für Run-History
CREATE INDEX IF NOT EXISTS idx_research_run_audit_run_id
  ON public.research_run_audit (research_run_id, created_at);

-- Index für Org-Reports
CREATE INDEX IF NOT EXISTS idx_research_run_audit_org
  ON public.research_run_audit (organization_id, created_at);

-- Index für Error-Tracking
CREATE INDEX IF NOT EXISTS idx_research_run_audit_errors
  ON public.research_run_audit (event_type)
  WHERE error_message IS NOT NULL;

COMMENT ON TABLE public.research_run_audit IS
  'Unveränderlicher Audit-Trail für ResearchRun-Ereignisse. Non-blocking Writes via RPC.';


-- ── RPC: audit_research_event ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_research_event(
  p_organization_id text,
  p_research_run_id text,
  p_event_type      text,
  p_event_data      jsonb DEFAULT '{}',
  p_worker_key      text DEFAULT NULL,
  p_error_message   text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO research_run_audit
    (organization_id, research_run_id, event_type, event_data, worker_key, error_message)
  VALUES
    (p_organization_id, p_research_run_id, p_event_type, p_event_data, p_worker_key, p_error_message);

  RETURN true;

EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'audit_research_event failed: %', SQLERRM;
    RETURN false;
END;
$$;

COMMENT ON FUNCTION audit_research_event IS
  'Schreibt Audit-Event non-blocking. Events: run_started, batch_complete, company_created, quota_reached, run_failed, run_completed.';