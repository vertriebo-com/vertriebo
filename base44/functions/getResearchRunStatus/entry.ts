/**
 * getResearchRunStatus
 * Gibt den aktuellen Status eines ResearchRun zurück.
 * Leichtgewichtig – nur Entity-Lesen, kein Google-API-Call.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht eingeloggt', success: false }, { status: 401 });

    const body = await req.json();
    const { research_run_id, organization_id } = body;
    if (!research_run_id || !organization_id) {
      return Response.json({ error: 'research_run_id und organization_id erforderlich', success: false }, { status: 400 });
    }

    const runs = await base44.asServiceRole.entities.ResearchRun.filter({ id: research_run_id });
    const run = runs[0];
    if (!run) return Response.json({ error: 'ResearchRun nicht gefunden', success: false }, { status: 404 });
    if (run.organization_id !== organization_id) return Response.json({ error: 'Ungültige organization_id', success: false }, { status: 403 });

    const isDone = run.status === 'completed' || run.status === 'failed';
    let message = run.current_step || 'Recherche läuft…';

    if (run.status === 'completed') {
      message = (run.leads_saved || 0) > 0
        ? `${run.leads_saved} neue Firmenkontakte gefunden`
        : 'Keine neuen passenden Firmenkontakte gefunden';
    } else if (run.status === 'failed') {
      message = run.error_message || 'Recherche fehlgeschlagen';
    }

    // Monatliche Nutzung
    const periodMonth = new Date().toISOString().slice(0,7);
    const usageLogs = await base44.asServiceRole.entities.UsageLog.filter({ organization_id, period_month: periodMonth });
    const monthlyUsage = usageLogs[0] ? {
      monthly_used: usageLogs[0].leads_created || 0,
    } : null;

    return Response.json({
      success: true,
      research_run_id,
      status: run.status,
      progress_percent: run.progress_percent || 0,
      current_step: run.current_step || '',
      leads_saved: run.leads_saved || 0,
      raw_hits: run.raw_hits || 0,
      duplicates_skipped: run.duplicates_skipped || 0,
      done: isDone,
      message,
      monthly_usage: monthlyUsage,
      started_at: run.started_at,
      finished_at: run.finished_at,
    });

  } catch (error) {
    console.error('[getResearchRunStatus] Error:', error?.message);
    return Response.json({ error: error?.message || 'Unbekannter Fehler', success: false }, { status: 500 });
  }
});