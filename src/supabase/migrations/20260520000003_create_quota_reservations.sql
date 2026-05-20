-- Migration: quota_reservations
-- Zweck: Atomare Quota-Reservierung mit Unique Index (verhindert Over-Booking)
-- Erstellt: 2026-05-20
-- Dokumentation: docs/SUPABASE_HYBRID_ARCHITECTURE.md

CREATE TABLE IF NOT EXISTS public.quota_reservations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text        NOT NULL,
  period_month    text        NOT NULL,  -- Format: YYYY-MM (Europe/Berlin)
  slot_number     int         NOT NULL,  -- 1-basiert, max = plan.max_leads_per_month
  status          text        NOT NULL DEFAULT 'reserved'
                  CHECK (status IN ('reserved', 'committed', 'released')),
  company_id      text,                   -- Base44 Company.id (gesetzt nach Commit)
  research_run_id text,                   -- Base44 ResearchRun.id
  created_at      timestamptz NOT NULL DEFAULT now(),
  committed_at    timestamptz,
  released_at     timestamptz
);

-- UNIQUE: Garantiert dass nur EIN Worker slot_number=300 für Org+Periode anlegen kann
-- Verhindert paralleles Over-Booking (Base44 unique_constraints sind nicht atomar)
CREATE UNIQUE INDEX idx_quota_reservations_slot
  ON public.quota_reservations (organization_id, period_month, slot_number);

-- Index für monatliche COUNT-Queries
CREATE INDEX idx_quota_reservations_org_period
  ON public.quota_reservations (organization_id, period_month);

-- Index für Status-Filter
CREATE INDEX idx_quota_reservations_status
  ON public.quota_reservations (status);

COMMENT ON TABLE public.quota_reservations IS
  'Atomare Quota-Reservierung mit Unique Index. Verhindert Over-Booking bei parallelen ResearchRun-Workern. Phase 3: Ersetzt Base44 QuotaReservation für kritische Pfad.';