-- Migration: research_run_audit
-- Zweck: Unveränderlicher Audit-Trail für ResearchRun-Lifecycle
-- Erstellt: 2026-05-20
-- Dokumentation: docs/SUPABASE_HYBRID_ARCHITECTURE.md

CREATE TABLE IF NOT EXISTS public.research_run_audit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text        NOT NULL,
  research_run_id text        NOT NULL,
  event_type      text        NOT NULL,
  event_data      jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  worker_key      text,
  error_message   text
);

-- Index für Run-spezifische Historie
CREATE INDEX idx_research_run_audit_run_id
  ON public.research_run_audit (research_run_id, created_at);

-- Index für Org-übergreifende Analysen
CREATE INDEX idx_research_run_audit_org_period
  ON public.research_run_audit (organization_id, created_at);

-- Index für Error-Tracking
CREATE INDEX idx_research_run_audit_errors
  ON public.research_run_audit (error_message)
  WHERE error_message IS NOT NULL;

COMMENT ON TABLE public.research_run_audit IS
  'Unveränderlicher Audit-Trail für ResearchRun-Lifecycle. Schreibt alle kritischen Events (start, batch_complete, company_created, quota_reached, failed, completed). Nicht editierbar.';

-- ── RPC: audit_research_event ──────────────────────────────────────────────
-- Schreibt Audit-Event (idempotent, non-blocking).

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
    -- Audit-Fehler nie werfen (non-blocking)
    RAISE NOTICE 'audit_research_event failed: %', SQLERRM;
    RETURN false;
END;
$$;

COMMENT ON FUNCTION audit_research_event IS
  'Schreibt Audit-Event für ResearchRun. Non-blocking (Fehler werden nur geloggt).';