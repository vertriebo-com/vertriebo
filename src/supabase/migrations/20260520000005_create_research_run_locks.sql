-- Migration: research_run_locks
-- Zweck: Worker-Locks pro Organisation (verhindert parallele ResearchRun-Verarbeitung)
-- Erstellt: 2026-05-20

CREATE TABLE IF NOT EXISTS public.research_run_locks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT        NOT NULL,
  research_run_id TEXT        NOT NULL,
  worker_key      TEXT        NOT NULL,   -- Format: user.email:timestamp
  status          TEXT        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'released', 'expired')),
  locked_until    TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at     TIMESTAMPTZ
);

-- UNIQUE: Nur EIN aktiver Lock pro Organisation
-- Partial Index: nur Zeilen mit status='active' sind eindeutig
CREATE UNIQUE INDEX IF NOT EXISTS idx_research_run_locks_org_active
  ON public.research_run_locks (organization_id)
  WHERE status = 'active';

-- Index für Run-spezifische Lookups
CREATE INDEX IF NOT EXISTS idx_research_run_locks_run_id
  ON public.research_run_locks (research_run_id);

-- Index für Cleanup abgelaufener Locks
CREATE INDEX IF NOT EXISTS idx_research_run_locks_locked_until
  ON public.research_run_locks (locked_until)
  WHERE status = 'active';

COMMENT ON TABLE public.research_run_locks IS
  'Worker-Locks für ResearchRun-Verarbeitung. Partial Unique Index garantiert nur EIN aktiver Lock pro Org. Ersetzt Base44 processing_lock_until Feld (Phase 4).';