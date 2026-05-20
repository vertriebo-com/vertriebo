-- Migration: research_run_locks
-- Zweck: Atomarer Lock-Mechanismus für ResearchRun-Verarbeitung (verhindert parallele Worker)
-- Erstellt: 2026-05-20
-- Dokumentation: docs/SUPABASE_HYBRID_ARCHITECTURE.md

CREATE TABLE IF NOT EXISTS public.research_run_locks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text        NOT NULL,
  research_run_id text        NOT NULL,
  worker_key      text        NOT NULL,  -- Format: user.email:timestamp
  status          text        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'released', 'expired')),
  locked_until    timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  released_at     timestamptz
);

-- UNIQUE: Nur EIN aktiver Lock pro Organisation (verhindert parallele Worker)
CREATE UNIQUE INDEX idx_research_run_locks_org_active
  ON public.research_run_locks (organization_id, status)
  WHERE status = 'active';

-- Index für Run-spezifische Queries
CREATE INDEX idx_research_run_locks_run_id
  ON public.research_run_locks (research_run_id);

-- Index für abgelaufene Locks (Cleanup-Job)
CREATE INDEX idx_research_run_locks_expired
  ON public.research_run_locks (locked_until)
  WHERE status = 'active';

COMMENT ON TABLE public.research_run_locks IS
  'Atomarer Lock-Mechanismus für ResearchRun-Verarbeitung. Verhindert parallele Worker pro Organisation. Ersetzt Base44 processing_lock_until Feld für skalierbare Queue-Architektur.';