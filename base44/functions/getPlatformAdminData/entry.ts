import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // ── Access Check ──────────────────────────────────────────────────────
    if (!user || !["admin", "platform_owner", "platform_admin"].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Platform admin access required' }, { status: 403 });
    }

    // ── Load Data via Service Role ────────────────────────────────────────
    const [orgs, plans, usageLogs, researchRuns, supportNotes, auditLogs, platformConfigs] = await Promise.all([
      base44.asServiceRole.entities.Organization.list(),
      base44.asServiceRole.entities.Plan.list(),
      base44.asServiceRole.entities.UsageLog.filter({ period_month: getPeriodMonth() }),
      base44.asServiceRole.entities.ResearchRun.filter({}),
      base44.asServiceRole.entities.SupportNote.filter({}),
      base44.asServiceRole.entities.PlatformAuditLog.filter({}),
      base44.asServiceRole.entities.PlatformConfig.list(),
    ]);

    // ── Build Safe Response ───────────────────────────────────────────────
    const organizations = (orgs || []).map(org => ({
      id: org.id,
      name: org.name,
      owner_email: org.owner_email,
      organization_type: org.organization_type,
      parent_agency_id: org.parent_agency_id || null,
      platform_status: org.platform_status,
      billing_status: org.billing_status,
      plan_id: org.plan_id,
      onboarding_done: org.onboarding_done,
      created_date: org.created_date,
      suspended_reason: org.platform_status === 'suspended' ? org.suspended_reason : null,
      suspended_at: org.platform_status === 'suspended' ? org.suspended_at : null,
      suspended_by: org.platform_status === 'suspended' ? org.suspended_by : null,
      // Aggregated metrics
      leads_count: 0,
      research_runs_count: 0,
      ai_actions_used: 0,
      manual_emails_logged: 0,
    }));

    // ── Add aggregated metrics ────────────────────────────────────────────
    for (const org of organizations) {
      const usage = usageLogs.find(u => u.organization_id === org.id);
      if (usage) {
        org.leads_count = usage.leads_created || 0;
        org.ai_actions_used = usage.ai_actions_used || 0;
        org.manual_emails_logged = usage.manual_emails_logged || 0;
      }

      org.research_runs_count = (researchRuns || []).filter(r => r.organization_id === org.id).length;
    }

    // ── Calculate Summary ─────────────────────────────────────────────────
    const summary = {
      organizations_total: organizations.length,
      active_organizations: organizations.filter(o => o.platform_status === 'active').length,
      suspended_organizations: organizations.filter(o => o.platform_status === 'suspended').length,
      onboarding_not_done: organizations.filter(o => !o.onboarding_done).length,
      active_subscriptions: organizations.filter(o => ['active', 'trialing'].includes(o.billing_status)).length,
      past_due: organizations.filter(o => o.billing_status === 'past_due').length,
      unpaid: organizations.filter(o => ['unpaid', 'canceled', 'incomplete_expired'].includes(o.billing_status)).length,
      research_runs_this_month: (researchRuns || []).length,
      leads_created_this_month: (usageLogs || []).reduce((sum, log) => sum + (log.leads_created || 0), 0),
      ai_actions_this_month: (usageLogs || []).reduce((sum, log) => sum + (log.ai_actions_used || 0), 0),
      manual_emails_this_month: (usageLogs || []).reduce((sum, log) => sum + (log.manual_emails_logged || 0), 0),
      audit_logs_recent: (auditLogs || []).length,
      support_notes_total: (supportNotes || []).length,
    };

    return Response.json({
      success: true,
      organizations,
      summary,
      plans: (plans || []).map(p => ({ id: p.id, name: p.name, type: p.plan_type })),
      supportNotes: (supportNotes || []),
      platform_config: (platformConfigs || [])[0] || null,
    });

  } catch (error) {
    console.error('[getPlatformAdminData] Error:', error.message);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});

function getPeriodMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}