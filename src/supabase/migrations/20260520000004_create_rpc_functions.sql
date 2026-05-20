-- Migration: RPC Functions für atomare Operationen
-- Zweck: Supabase RPCs für Quota-Reservierung, Usage-Tracking
-- Erstellt: 2026-05-20
-- Dokumentation: docs/SUPABASE_HYBRID_ARCHITECTURE.md

-- ── RPC: reserve_quota_slot ────────────────────────────────────────────────
-- Atomare Quota-Reservierung. Gibt slot_number zurück ODER NULL wenn erschöpft.
-- Verwendet UNIQUE INDEX für atomaren Schutz (kein Race Condition möglich).

CREATE OR REPLACE FUNCTION reserve_quota_slot(
  p_organization_id text,
  p_period_month    text,
  p_max_slots       int,
  p_research_run_id text
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_count   int;
  v_slot_number     int;
BEGIN
  -- Zählen committed + reserved (nicht released)
  SELECT COUNT(*) INTO v_current_count
  FROM quota_reservations
  WHERE organization_id = p_organization_id
    AND period_month = p_period_month
    AND status != 'released';

  -- Kontingent erschöpft?
  IF v_current_count >= p_max_slots THEN
    RETURN NULL;
  END IF;

  -- Nächster Slot
  v_slot_number := v_current_count + 1;

  -- INSERT mit UNIQUE-Schutz (Race Condition führt zu unique_violation)
  INSERT INTO quota_reservations
    (organization_id, period_month, slot_number, status, research_run_id)
  VALUES
    (p_organization_id, p_period_month, v_slot_number, 'reserved', p_research_run_id);

  RETURN v_slot_number;

EXCEPTION
  WHEN unique_violation THEN
    -- Race Condition: anderer Worker war schneller → NULL zurückgeben
    RETURN NULL;
  WHEN others THEN
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION reserve_quota_slot IS
  'Atomare Quota-Reservierung via UNIQUE INDEX. Gibt slot_number oder NULL (erschöpft/Race).';


-- ── RPC: get_monthly_usage ─────────────────────────────────────────────────
-- Liefert exakten COUNT für Org+Periode (SSOT nach Validierung).

CREATE OR REPLACE FUNCTION get_monthly_usage(
  p_organization_id text,
  p_period_month    text
) RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::bigint
  FROM lead_usage_events
  WHERE organization_id = p_organization_id
    AND period_month = p_period_month
    AND event_type = 'research_lead_created';
$$;

COMMENT ON FUNCTION get_monthly_usage IS
  'Exakter monatlicher Usage-Count (SSOT nach 14-Tage-Validierung).';


-- ── RPC: record_lead_usage_event ───────────────────────────────────────────
-- Schreibt Usage-Event mit Dedup-Schutz (idempotent).

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
  ON CONFLICT (organization_id, period_month, company_id, event_type)
  DO NOTHING;

  RETURN true;

EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'record_lead_usage_event failed: %', SQLERRM;
    RETURN false;
END;
$$;

COMMENT ON FUNCTION record_lead_usage_event IS
  'Schreibt Usage-Event idempotent (ON CONFLICT DO NOTHING). Non-blocking.';


-- HINWEIS: acquire_org_run_lock und release_org_run_lock sind in
-- 20260520000007_create_lock_rpc_functions.sql — nach Migration 05 (Tabelle).