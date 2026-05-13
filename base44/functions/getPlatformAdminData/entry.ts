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
    const periodMonth = getPeriodMonth();
    const [orgs, plans, usageLogs, researchRuns, supportNotes, auditLogs, platformConfigs, orgSettings, learnedSignals] = await Promise.all([
      base44.asServiceRole.entities.Organization.list(),
      base44.asServiceRole.entities.Plan.list(),
      base44.asServiceRole.entities.UsageLog.filter({ period_month: periodMonth }),
      base44.asServiceRole.entities.ResearchRun.filter({}),
      base44.asServiceRole.entities.SupportNote.filter({}),
      base44.asServiceRole.entities.PlatformAuditLog.filter({}),
      base44.asServiceRole.entities.PlatformConfig.list(),
      base44.asServiceRole.entities.OrganizationSettings.filter({}),
      base44.asServiceRole.entities.OrgLearnedSignals.filter({}),
    ]);

    // ── Build Safe Response ───────────────────────────────────────────────
    const organizations = (orgs || []).map(org => {
      // Fix 1: Read industry from both sources
      const industryFromSettings = (orgSettings || []).find(s => 
        s.organization_id === org.id && (s.key === 'own_industry' || s.key === 'industry_name')
      )?.value;
      const industry = org.industry || industryFromSettings || 'N/A';

      return {
        id: org.id,
        name: org.name,
        owner_email: org.owner_email,
        organization_type: org.organization_type,
        parent_agency_id: org.parent_agency_id || null,
        platform_status: org.platform_status,
        billing_status: org.billing_status,
        plan_id: org.plan_id,
        trial_stage: org.trial_stage || 'free_preview',
        trial_leads_granted: org.trial_leads_granted || 0,
        industry,
        service_area_city: org.service_area_city || 'N/A',
        service_area_radius_km: org.service_area_radius_km || 25,
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
        last_lead_generation_at: null,
        estimated_external_cost_cent: 0,
        learned_categories_count: 0,
      };
    });

    // ── Add aggregated metrics ────────────────────────────────────────────
    for (const org of organizations) {
      // Get usage from current month
      const usage = usageLogs.find(u => u.organization_id === org.id);
      if (usage) {
        org.leads_count = usage.leads_created || 0;
        org.ai_actions_used = usage.ai_actions_used || 0;
        org.manual_emails_logged = usage.manual_emails_logged || 0;
        org.estimated_external_cost_cent = usage.estimated_external_cost_cent || 0;
      }

      const orgResearchRuns = (researchRuns || []).filter(r => r.organization_id === org.id);
      org.research_runs_count = orgResearchRuns.length;
      org.last_lead_generation_at = orgResearchRuns.length > 0 
        ? orgResearchRuns.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0].created_date 
        : null;

      // Get learned signals count
      const signals = learnedSignals.find(s => s.organization_id === org.id);
      if (signals) {
        try {
          const cats = JSON.parse(signals.priority_categories || '[]');
          org.learned_categories_count = cats.length;
        } catch (e) {
          org.learned_categories_count = 0;
        }
      }
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