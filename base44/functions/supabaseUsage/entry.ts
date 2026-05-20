/**
 * supabaseUsage
 * =============
 * Zentrale Supabase-Usage-Helper-Function für Vertriebo Hybrid-Architektur.
 *
 * Aktionen:
 *   write_event   — Schreibt ein lead_usage_event (Shadow Mode + Produktiv)
 *   get_count     — Liefert monatlichen Verbrauch aus Supabase
 *   validate      — Vergleicht Supabase COUNT mit Base44 UsageLog (Shadow Mode Validierung)
 *   backfill      — Füllt historische Events aus Base44 Companies nach (einmalig)
 *
 * SICHERHEIT: Nur von anderen Base44 Backend Functions aufrufen — nie vom Frontend.
 * SUPABASE_SERVICE_KEY ist nur serverseitig verfügbar.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");

// Kanonische period_month Berechnung (Europe/Berlin) — identisch zu allen anderen Functions
function getPeriodMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  return `${y}-${m}`;
}

// Supabase REST Helper — kein npm-Package nötig
async function supabaseFetch(path, method = 'GET', body = null, extraHeaders = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL oder SUPABASE_SERVICE_KEY nicht gesetzt');
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

/**
 * Schreibt ein Usage-Event für einen Research-Lead.
 * Non-blocking: Supabase-Fehler werden geloggt, aber nicht geworfen.
 * Duplikate werden via Prefer: resolution=ignore-duplicates abgefangen.
 */
async function writeUsageEvent(orgId, periodMonth, companyId, runId, source = 'research') {
  const res = await supabaseFetch('/lead_usage_events', 'POST', {
    organization_id: orgId,
    period_month: periodMonth,
    company_id: companyId,
    research_run_id: runId || null,
    event_type: 'research_lead_created',
    source,
  }, {
    'Prefer': 'resolution=ignore-duplicates,return=minimal',
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(`[supabaseUsage] writeUsageEvent failed (non-blocking): HTTP ${res.status} — ${text.slice(0, 200)}`);
    return { success: false, status: res.status, error: text };
  }
  return { success: true };
}

/**
 * Liefert monatlichen Lead-Verbrauch aus Supabase (exakter COUNT via UNIQUE-Index).
 * Gibt null zurück wenn Supabase nicht erreichbar (Fallback auf Base44).
 */
async function getMonthlyCount(orgId, periodMonth) {
  const res = await supabaseFetch(
    `/lead_usage_events?organization_id=eq.${encodeURIComponent(orgId)}&period_month=eq.${periodMonth}&event_type=eq.research_lead_created`,
    'GET',
    null,
    { 'Prefer': 'count=exact', 'Range': '0-0' }
  );

  if (!res.ok) {
    console.warn(`[supabaseUsage] getMonthlyCount failed: HTTP ${res.status}`);
    return null;
  }

  // Content-Range: 0-0/TOTAL oder */TOTAL
  const contentRange = res.headers.get('content-range') || '';
  const total = parseInt(contentRange.split('/')[1] || '0', 10);
  return isNaN(total) ? null : total;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Nur admins oder interne Calls
    const isPlatformAdmin = ["admin", "platform_owner", "platform_admin"].includes(user.role);

    let body = {};
    try { body = await req.json(); } catch {}
    const { action, org_id, period_month, company_id, research_run_id, source } = body;

    const periodMonth = period_month || getPeriodMonth();

    // ── ACTION: write_event ───────────────────────────────────────────────────
    if (action === 'write_event') {
      if (!org_id || !company_id) {
        return Response.json({ error: 'org_id und company_id erforderlich' }, { status: 400 });
      }
      const result = await writeUsageEvent(org_id, periodMonth, company_id, research_run_id, source || 'research');
      return Response.json({ success: result.success, action: 'write_event', period_month: periodMonth, ...result });
    }

    // ── ACTION: get_count ─────────────────────────────────────────────────────
    if (action === 'get_count') {
      if (!org_id) return Response.json({ error: 'org_id erforderlich' }, { status: 400 });
      const count = await getMonthlyCount(org_id, periodMonth);
      return Response.json({
        success: count !== null,
        action: 'get_count',
        org_id,
        period_month: periodMonth,
        monthly_used: count,
        source: count !== null ? 'supabase' : 'unavailable',
      });
    }

    // ── ACTION: validate (Shadow Mode — nur Admin) ────────────────────────────
    if (action === 'validate') {
      if (!isPlatformAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!org_id) return Response.json({ error: 'org_id erforderlich' }, { status: 400 });

      const [supabaseCount, usageLogs] = await Promise.all([
        getMonthlyCount(org_id, periodMonth),
        base44.asServiceRole.entities.UsageLog.filter({ organization_id: org_id, period_month: periodMonth }),
      ]);

      const base44Count = usageLogs?.[0]?.leads_created || 0;
      const diff = (supabaseCount ?? 0) - base44Count;
      const diffPct = base44Count > 0 ? Math.abs(diff / base44Count * 100).toFixed(1) : 'n/a';
      const isValid = Math.abs(diff) <= Math.max(1, base44Count * 0.01); // < 1% Abweichung

      // Shadow-Mode-Log schreiben
      if (supabaseCount !== null) {
        await supabaseFetch('/shadow_mode_log', 'POST', {
          organization_id: org_id,
          period_month: periodMonth,
          supabase_count: supabaseCount,
          base44_count: base44Count,
        }, { 'Prefer': 'return=minimal' }).catch(e => console.warn('[supabaseUsage] shadow_log write failed:', e?.message));
      }

      return Response.json({
        success: true,
        action: 'validate',
        org_id,
        period_month: periodMonth,
        supabase_count: supabaseCount,
        base44_count: base44Count,
        diff,
        diff_pct: diffPct + '%',
        is_valid: isValid,
        verdict: isValid ? '✅ Konsistent (< 1% Abweichung)' : `⚠️ Abweichung: ${diff} Leads (${diffPct}%)`,
      });
    }

    // ── ACTION: backfill (einmalig, nur Admin) ────────────────────────────────
    if (action === 'backfill') {
      if (!isPlatformAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!org_id) return Response.json({ error: 'org_id erforderlich' }, { status: 400 });

      // Lade alle Research-Companies dieses Monats aus Base44
      const py = parseInt(periodMonth.split('-')[0]);
      const pm = parseInt(periodMonth.split('-')[1]);
      const periodStart = new Date(Date.UTC(py, pm - 1, 1));
      const periodEnd   = new Date(Date.UTC(py, pm, 1));

      const NON_QUOTA = new Set(['manual_setup', 'csv_import', 'manual', 'import']);
      const companies = await base44.asServiceRole.entities.Company.filter({ organization_id: org_id }, '-created_date', 2000);

      const researchCompanies = companies.filter(c => {
        if (!c.research_run_id) return false;
        if (NON_QUOTA.has(c.research_run_id)) return false;
        if (c.quelle === 'Manuell' || c.quelle === 'CSV Import') return false;
        if (c.source_provider === 'manual' || c.source_provider === 'csv_import') return false;
        const created = new Date(c.created_date);
        return created >= periodStart && created < periodEnd;
      });

      let written = 0, skipped = 0, failed = 0;

      // Batch-Insert in Gruppen von 50
      for (let i = 0; i < researchCompanies.length; i += 50) {
        const batch = researchCompanies.slice(i, i + 50).map(c => ({
          organization_id: org_id,
          period_month: periodMonth,
          company_id: c.id,
          research_run_id: c.research_run_id || null,
          event_type: 'research_lead_created',
          source: c.source_provider === 'openregister' ? 'openregister' : 'research',
        }));

        const res = await supabaseFetch('/lead_usage_events', 'POST', batch, {
          'Prefer': 'resolution=ignore-duplicates,return=minimal',
        });

        if (res.ok) {
          written += batch.length;
        } else {
          const err = await res.text();
          console.error(`[supabaseUsage] backfill batch failed: ${err.slice(0, 200)}`);
          failed += batch.length;
        }
      }

      return Response.json({
        success: true,
        action: 'backfill',
        org_id,
        period_month: periodMonth,
        total_research_companies: researchCompanies.length,
        written,
        skipped,
        failed,
        message: `Backfill abgeschlossen: ${written} Events geschrieben, ${failed} fehlgeschlagen`,
      });
    }

    return Response.json({ error: `Unbekannte action: ${action}. Erlaubt: write_event, get_count, validate, backfill` }, { status: 400 });

  } catch (error) {
    console.error('[supabaseUsage] Error:', error?.message);
    return Response.json({ error: error?.message }, { status: 500 });
  }
});