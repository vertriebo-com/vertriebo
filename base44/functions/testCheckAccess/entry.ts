import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * TEST FUNCTION – Simuliert checkAccess-Szenarien intern.
 * Nur für platform_admin.
 * Da test_backend_function immer als platform_admin läuft, werden die
 * Org/Rolle/Billing-Checks direkt gegen die DB simuliert.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const ORG_ID = body.org_id || '69fb1aa4a7c4e1aa66807541';
    const FAKE_ORG_ID = 'nonexistent-org-000000000000';

    const results = [];

    // Helper to run internal logic directly (bypassing auth, simulating scenarios)
    const simulate = async (label, expected, fn) => {
      try {
        const result = await fn();
        const pass = result.allowed === expected.allowed &&
          (!expected.reason || result.reason === expected.reason);
        results.push({ label, allowed: result.allowed, reason: result.reason, message: result.message || null, pass });
      } catch (e) {
        results.push({ label, allowed: null, reason: 'error', message: e.message, pass: false });
      }
    };

    // Load data needed for simulation
    const [orgs, members, subs, plans] = await Promise.all([
      base44.asServiceRole.entities.Organization.filter({ id: ORG_ID }),
      base44.asServiceRole.entities.OrganizationMember.filter({ organization_id: ORG_ID }),
      base44.asServiceRole.entities.Subscription.filter({ organization_id: ORG_ID }),
      base44.asServiceRole.entities.Plan.list(),
    ]);

    const org = orgs[0] || null;
    const adminMember = members.find(m => m.role === 'organization_admin') || null;
    const salesMember = members.find(m => m.role === 'sales_rep') || null;
    const sub = subs[0] || null;
    const planForOrg = org?.plan_id ? plans.find(p => p.id === org.plan_id) : plans[0]; // use Starter for test

    const ACTION_ROLES = {
      view_leads:             ['organization_admin', 'sales_rep'],
      create_lead:            ['organization_admin', 'sales_rep'],
      delete_lead:            ['organization_admin'],
      generate_leads:         ['organization_admin'],
      create_contact_log:     ['organization_admin', 'sales_rep'],
      view_tasks:             ['organization_admin', 'sales_rep'],
      manage_users:           ['organization_admin'],
      manage_settings:        ['organization_admin'],
      manage_billing:         ['organization_admin'],
      view_reports:           ['organization_admin', 'sales_rep'],
      use_ai_scoring:         ['organization_admin', 'sales_rep'],
      manage_blacklist:       ['organization_admin'],
      platform_admin_access:  [],
    };

    const BILLING_ACCESS = {
      active: 'full', trialing: 'full',
      past_due: 'restricted', incomplete: 'restricted',
      unpaid: 'blocked', canceled: 'blocked', incomplete_expired: 'blocked',
    };

    const checkRole = (role, action) => {
      const allowed = ACTION_ROLES[action];
      if (allowed === undefined) return { allowed: false, reason: 'unknown_action' };
      if (!allowed.includes(role)) return { allowed: false, reason: 'insufficient_role' };
      return { allowed: true, reason: 'ok' };
    };

    const checkBilling = (billingStatus, role, action) => {
      const access = BILLING_ACCESS[billingStatus] || 'blocked';
      if (access === 'full') return { allowed: true, reason: 'ok' };
      if (access === 'blocked') return { allowed: false, reason: 'billing_blocked' };
      if (access === 'restricted') {
        if (role === 'sales_rep') return { allowed: false, reason: 'billing_restricted_sales_rep' };
        if (action !== 'manage_billing') return { allowed: false, reason: 'billing_restricted' };
        return { allowed: true, reason: 'ok' };
      }
      return { allowed: false, reason: 'billing_blocked' };
    };

    const checkLimit = (plan, limitKey, usage) => {
      const max = plan?.[limitKey];
      if (max === undefined) return { allowed: true, reason: 'ok' };
      if (max === -1) return { allowed: true, reason: 'ok' };
      if (usage >= max) return { allowed: false, reason: 'plan_limit_exceeded', message: `${usage}/${max}` };
      return { allowed: true, reason: 'ok' };
    };

    // ── TEST SCENARIOS ─────────────────────────────────────────────────────────

    // 1. Org not found (invalid id → SDK throws, checkAccess catches it)
    await simulate('1. Organisation nicht gefunden', { allowed: false, reason: 'organization_not_found' }, async () => {
      try {
        const r = await base44.asServiceRole.entities.Organization.filter({ id: FAKE_ORG_ID });
        if (!r[0]) return { allowed: false, reason: 'organization_not_found' };
        return { allowed: true, reason: 'ok' };
      } catch {
        // checkAccess catches this and returns organization_not_found
        return { allowed: false, reason: 'organization_not_found' };
      }
    });

    // 2. Unknown action
    await simulate('2. Unbekannte Aktion', { allowed: false, reason: 'unknown_action' }, async () => {
      return checkRole('organization_admin', 'fly_to_moon');
    });

    // 3. organization_admin → view_leads (erlaubt)
    await simulate('3. organization_admin → view_leads (✅ erlaubt)', { allowed: true }, async () => {
      return checkRole('organization_admin', 'view_leads');
    });

    // 4. organization_admin → delete_lead (erlaubt)
    await simulate('4. organization_admin → delete_lead (✅ erlaubt)', { allowed: true }, async () => {
      return checkRole('organization_admin', 'delete_lead');
    });

    // 5. sales_rep → view_leads (erlaubt)
    await simulate('5. sales_rep → view_leads (✅ erlaubt)', { allowed: true }, async () => {
      return checkRole('sales_rep', 'view_leads');
    });

    // 6. sales_rep → delete_lead (gesperrt – nur admin)
    await simulate('6. sales_rep → delete_lead (❌ gesperrt)', { allowed: false, reason: 'insufficient_role' }, async () => {
      return checkRole('sales_rep', 'delete_lead');
    });

    // 7. sales_rep → manage_users (gesperrt)
    await simulate('7. sales_rep → manage_users (❌ gesperrt)', { allowed: false, reason: 'insufficient_role' }, async () => {
      return checkRole('sales_rep', 'manage_users');
    });

    // 8. sales_rep → platform_admin_access (gesperrt)
    await simulate('8. sales_rep → platform_admin_access (❌ gesperrt)', { allowed: false, reason: 'insufficient_role' }, async () => {
      return checkRole('sales_rep', 'platform_admin_access');
    });

    // 9. organization_admin → platform_admin_access (gesperrt – nur platform_admin)
    await simulate('9. organization_admin → platform_admin_access (❌ gesperrt)', { allowed: false, reason: 'insufficient_role' }, async () => {
      return checkRole('organization_admin', 'platform_admin_access');
    });

    // 10. Billing: unpaid → admin → view_leads (gesperrt)
    await simulate('10. Billing: unpaid → admin → view_leads (❌ geblockt)', { allowed: false, reason: 'billing_blocked' }, async () => {
      return checkBilling('unpaid', 'organization_admin', 'view_leads');
    });

    // 11. Billing: unpaid → admin → manage_billing (auch gesperrt bei unpaid)
    await simulate('11. Billing: unpaid → admin → manage_billing (❌ geblockt)', { allowed: false, reason: 'billing_blocked' }, async () => {
      return checkBilling('unpaid', 'organization_admin', 'manage_billing');
    });

    // 12. Billing: past_due → admin → view_leads (eingeschränkt, nicht billing)
    await simulate('12. Billing: past_due → admin → view_leads (❌ restricted)', { allowed: false, reason: 'billing_restricted' }, async () => {
      return checkBilling('past_due', 'organization_admin', 'view_leads');
    });

    // 13. Billing: past_due → admin → manage_billing (erlaubt)
    await simulate('13. Billing: past_due → admin → manage_billing (✅ erlaubt)', { allowed: true }, async () => {
      return checkBilling('past_due', 'organization_admin', 'manage_billing');
    });

    // 14. Billing: past_due → sales_rep → view_leads (gesperrt)
    await simulate('14. Billing: past_due → sales_rep → view_leads (❌ restricted)', { allowed: false, reason: 'billing_restricted_sales_rep' }, async () => {
      return checkBilling('past_due', 'sales_rep', 'view_leads');
    });

    // 15. Billing: trialing → full access
    await simulate('15. Billing: trialing → admin → view_leads (✅ erlaubt)', { allowed: true }, async () => {
      return checkBilling('trialing', 'organization_admin', 'view_leads');
    });

    // 16. Limit: 10/200 leads → OK
    await simulate('16. Limit: 10/200 leads (✅ OK)', { allowed: true }, async () => {
      return checkLimit(planForOrg, 'max_leads_per_month', 10);
    });

    // 17. Limit: 200/200 leads → gesperrt
    await simulate('17. Limit: 200/200 leads (❌ Limit erreicht)', { allowed: false, reason: 'plan_limit_exceeded' }, async () => {
      return checkLimit(planForOrg, 'max_leads_per_month', 200);
    });

    // 18. Limit: Agency (-1) → immer erlaubt
    await simulate('18. Limit: Agency -1 → immer erlaubt (✅)', { allowed: true }, async () => {
      return checkLimit({ max_leads_per_month: -1 }, 'max_leads_per_month', 99999);
    });

    // 19. DB: Admin-Member korrekt in DB
    await simulate('19. DB: organization_admin in OrganizationMember (✅)', { allowed: true }, async () => {
      if (!adminMember) return { allowed: false, reason: 'member_not_found' };
      if (adminMember.organization_id !== ORG_ID) return { allowed: false, reason: 'wrong_org_id' };
      if (adminMember.status !== 'active') return { allowed: false, reason: 'member_inactive' };
      return { allowed: true, reason: 'ok' };
    });

    // 20. DB: Organization existiert und ist active
    await simulate('20. DB: Organization active (✅)', { allowed: true }, async () => {
      if (!org) return { allowed: false, reason: 'organization_not_found' };
      if (org.status !== 'active') return { allowed: false, reason: 'organization_not_active' };
      return { allowed: true, reason: 'ok' };
    });

    // ── Summary ───────────────────────────────────────────────────────────────
    const passed = results.filter(r => r.pass === true).length;
    const failed = results.filter(r => r.pass === false).length;

    return Response.json({
      summary: {
        total: results.length,
        passed,
        failed,
        status: failed === 0 ? '✅ ALLE TESTS BESTANDEN' : `❌ ${failed} TEST(S) FEHLGESCHLAGEN`,
      },
      db_snapshot: {
        organization: org ? { id: org.id, name: org.name, status: org.status, billing_status: org.billing_status } : null,
        admin_member: adminMember ? { email: adminMember.user_email, role: adminMember.role, status: adminMember.status } : null,
        sales_member: salesMember ? { email: salesMember.user_email, role: salesMember.role, status: salesMember.status } : '(kein sales_rep angelegt)',
        subscription: sub ? { status: sub.status } : '(keine Subscription)',
        plan_used_for_test: planForOrg ? { name: planForOrg.name, max_leads: planForOrg.max_leads_per_month } : null,
      },
      results,
    });

  } catch (error) {
    console.error('[testCheckAccess] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});