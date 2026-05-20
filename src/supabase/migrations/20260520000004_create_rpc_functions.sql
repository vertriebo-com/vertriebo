-- Migration: RPC Functions für atomare Operationen
-- Zweck: Supabase RPCs für Quota-Reservierung, Usage-Tracking, Locks
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
SECURITY DEFINER -- Wichtig: Umgeht RLS für Service-Key-Calls
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
    -- Anderer Fehler → NULL (Caller muss Base44-Fallback nutzen)
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
-- Schreibt Usage-Event mit Dedup-Schutz (Prefer: ignore-duplicates Alternative).

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
  DO NOTHING;  -- Duplikat ignorieren (idempotent)

  RETURN true;

EXCEPTION
  WHEN others THEN
    -- Fehler loggen aber nicht werfen (non-blocking)
    RAISE NOTICE 'record_lead_usage_event failed: %', SQLERRM;
    RETURN false;
END;
$$;

COMMENT ON FUNCTION record_lead_usage_event IS
  'Schreibt Usage-Event idempotent (ON CONFLICT DO NOTHING). Non-blocking.';


-- ── RPC: acquire_org_run_lock ──────────────────────────────────────────────
-- Atomarer Lock für ResearchRun-Verarbeitung (verhindert parallele Worker).

CREATE OR REPLACE FUNCTION acquire_org_run_lock(
  p_organization_id text,
  p_research_run_id text,
  p_worker_key      text,
  p_lock_duration_ms int DEFAULT 25000
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_lock   record;
BEGIN
  -- Prüfen ob bereits aktiver Lock existiert
  SELECT * INTO v_existing_lock
  FROM research_run_locks
  WHERE organization_id = p_organization_id
    AND locked_until > now()
    AND status = 'active';

  IF v_existing_lock IS NOT NULL THEN
    -- Lock existiert bereits → false zurückgeben
    RETURN false;
  END IF;

  -- Neuen Lock erstellen (INSERT mit ON CONFLICT für atomic upsert)
  INSERT INTO research_run_locks
    (organization_id, research_run_id, worker_key, locked_until, status)
  VALUES
    (p_organization_id, p_research_run_id, p_worker_key, 
     now() + (p_lock_duration_ms || ' milliseconds')::interval, 'active')
  ON CONFLICT (organization_id, status) 
  WHERE status = 'active'
  DO UPDATE SET
    research_run_id = p_research_run_id,
    worker_key = p_worker_key,
    locked_until = now() + (p_lock_duration_ms || ' milliseconds')::interval;

  RETURN true;

EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

COMMENT ON FUNCTION acquire_org_run_lock IS
  'Atomarer Org-Lock für ResearchRun-Verarbeitung. Verhindert parallele Worker.';


-- ── RPC: release_org_run_lock ──────────────────────────────────────────────
-- Gibt Lock frei (nach erfolgreicher Verarbeitung).

CREATE OR REPLACE FUNCTION release_org_run_lock(
  p_organization_id text,
  p_worker_key      text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE research_run_locks
  SET status = 'released',
      released_at = now()
  WHERE organization_id = p_organization_id
    AND worker_key = p_worker_key
    AND status = 'active';

  RETURN true;

EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

COMMENT ON FUNCTION release_org_run_lock IS
  'Gibt Org-Run-Lock frei (nach Verarbeitung).';