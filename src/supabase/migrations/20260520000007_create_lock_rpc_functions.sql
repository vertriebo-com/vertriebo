-- Migration: Lock RPC Functions
-- Zweck: RPCs für research_run_locks — MUSS nach 05_create_research_run_locks laufen
-- Erstellt: 2026-05-20
-- Abhängigkeit: 20260520000005_create_research_run_locks.sql (Tabelle muss existieren)
-- Dokumentation: docs/SUPABASE_HYBRID_ARCHITECTURE.md

-- ── RPC: acquire_org_run_lock ──────────────────────────────────────────────
-- Atomarer Lock für ResearchRun-Verarbeitung (verhindert parallele Worker).
-- Abhängigkeit: Tabelle research_run_locks (Migration 05)

CREATE OR REPLACE FUNCTION acquire_org_run_lock(
  p_organization_id text,
  p_research_run_id text,
  p_worker_key      text,
  p_lock_duration_ms int DEFAULT 25000
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Schritt 1: Abgelaufene aktive Locks dieser Org auf 'expired' setzen.
  -- Damit gibt der Partial Unique Index (status='active') den Slot frei
  -- bevor wir einen neuen Lock inserieren.
  UPDATE research_run_locks
  SET status = 'expired'
  WHERE organization_id = p_organization_id
    AND status          = 'active'
    AND locked_until   <= now();

  -- Schritt 2: Neuen aktiven Lock inserieren.
  -- Der Partial Unique Index (organization_id, status) WHERE status='active'
  -- wirft unique_violation wenn ein anderer Worker bereits einen gültigen Lock hält.
  INSERT INTO research_run_locks
    (organization_id, research_run_id, worker_key, locked_until, status)
  VALUES
    (p_organization_id, p_research_run_id, p_worker_key,
     now() + (p_lock_duration_ms || ' milliseconds')::interval,
     'active');

  RETURN true;

EXCEPTION
  WHEN unique_violation THEN
    -- Anderer Worker hält aktiven Lock → false zurückgeben (kein Fehler)
    RETURN false;
  WHEN others THEN
    -- Unerwarteter Fehler → false zurückgeben (Caller nutzt Base44-Fallback)
    RETURN false;
END;
$$;

COMMENT ON FUNCTION acquire_org_run_lock IS
  'Atomarer Org-Lock für ResearchRun-Verarbeitung. Verhindert parallele Worker. Abhängigkeit: research_run_locks (Migration 05).';


-- ── RPC: release_org_run_lock ──────────────────────────────────────────────
-- Gibt Lock frei (nach erfolgreicher Verarbeitung oder Fehler).

CREATE OR REPLACE FUNCTION release_org_run_lock(
  p_organization_id text,
  p_worker_key      text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE research_run_locks
  SET status      = 'released',
      released_at = now()
  WHERE organization_id = p_organization_id
    AND worker_key      = p_worker_key
    AND status          = 'active';

  RETURN true;

EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

COMMENT ON FUNCTION release_org_run_lock IS
  'Gibt Org-Run-Lock frei. Immer aufrufen nach Run-Ende (success + error). Abhängigkeit: research_run_locks (Migration 05).';