-- Migration: quota_reservations
-- Zweck: Atomare Quota-Verwaltung mit Unique Index (Phase 3 — kritischer Pfad)
-- Erstellt: 2026-05-20

CREATE TABLE IF NOT EXISTS public.quota_reservations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT        NOT NULL,
  period_month    TEXT        NOT NULL,
  slot_number     INT         NOT NULL,   -- 1-basiert, max = plan.max_leads_per_month
  status          TEXT        NOT NULL DEFAULT 'reserved'
                  CHECK (status IN ('reserved', 'committed', 'released')),
  company_id      TEXT,                   -- Base44 Company.id (nach Commit)
  research_run_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at    TIMESTAMPTZ,
  released_at     TIMESTAMPTZ
);

-- UNIQUE: Garantiert atomare Slot-Reservierung (verhindert Race Conditions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_quota_reservations_slot
  ON public.quota_reservations (organization_id, period_month, slot_number);

-- Index für monatliche COUNT-Queries
CREATE INDEX IF NOT EXISTS idx_quota_reservations_org_period
  ON public.quota_reservations (organization_id, period_month);

-- Index für Status-Filter
CREATE INDEX IF NOT EXISTS idx_quota_reservations_status
  ON public.quota_reservations (status);

COMMENT ON TABLE public.quota_reservations IS
  'Atomare Quota-Reservierung via Unique Index. Phase 3: kritischer Pfad für Slot-Reservierung vor Company.create.';