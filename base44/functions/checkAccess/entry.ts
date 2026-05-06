import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Action → Role Matrix ─────────────────────────────────────────────────────
// Defines which roles are allowed to perform which actions.
// platform_admin bypasses all org-level checks.
const ACTION_ROLES = {
  view_leads:                ['organization_admin', 'sales_rep'],
  create_lead:               ['organization_admin', 'sales_rep'],
  delete_lead:               ['organization_admin'],
  generate_leads:            ['organization_admin'],
  create_contact_log:        ['organization_admin', 'sales_rep'],
  view_tasks:                ['organization_admin', 'sales_rep'],
  manage_users:              ['organization_admin'],
  manage_settings:           ['organization_admin'],
  manage_billing:            ['organization_admin'],
  view_reports:              ['organization_admin', 'sales_rep'],
  use_ai_scoring:            ['organization_admin', 'sales_rep'],
  manage_blacklist:          ['organization_admin'],
  platform_admin_access:     [], // platform_admin only
};

// ─── Billing Status → Access Level ───────────────────────────────────────────
// full: all actions allowed
// restricted: only billing/data-export for admin, sales_rep blocked
// blocked: no access
const BILLING_ACCESS = {
  active:               'full',
  trialing:             'full',
  past_due:             'restricted',
  incomplete:           'restricted',
  unpaid:               'blocked',
  canceled:             'blocked',
  incomplete_expired:   'blocked',
};

// Actions allowed even in restricted/blocked billing state (admin only)
const BILLING_RESTRICTED_ALLOWED = ['manage_billing'];

// ─── Main checkAccess function ────────────────────────────────────────────────
/**
 * checkAccess(req, { organization_id, action, check_limit })
 *
 * @param req         - The incoming Deno request (for auth)
 * @param options
 *   organization_id  - The org to check membership in
 *   action           - Action string (e.g. 'view_leads')
 *   check_limit      - Optional limit key to validate (e.g. 'max_leads_per_month')
 *   current_usage    - Current usage count for the limit check
 *
 * @returns {
 *   allowed: boolean,
 *   reason: string,
 *   user, organization, member, role, plan, subscription, limits
 * }
 */
export async function checkAccess(req, { organization_id, action, check_limit = null, current_usage = 0 } = {}) {
  const base44 = createClientFromRequest(req);

  // ── 1. Authentication ──────────────────────────────────────────────────────
  let user;
  try {
    user = await base44.auth.me();
  } catch {
    return deny('not_authenticated', 'Nicht eingeloggt.');
  }
  if (!user) return deny('not_authenticated', 'Nicht eingeloggt.');

  const isPlatformAdmin = user.role === 'admin'; // base44 platform admin role

  // ── 2. Platform Admin shortcut ─────────────────────────────────────────────
  if (isPlatformAdmin) {
    console.info(`[checkAccess] platform_admin "${user.email}" accessing action="${action}" org="${organization_id}"`);
    return allow({
      reason: 'platform_admin',
      user,
      organization: null,
      member: null,
      role: 'platform_admin',
      plan: null,
      subscription: null,
      limits: null,
    });
  }

  // ── 3. Organization check ──────────────────────────────────────────────────
  if (!organization_id) return deny('missing_organization_id', 'Keine organisation_id angegeben.');

  let orgs, members;
  try {
    [orgs, members] = await Promise.all([
      base44.asServiceRole.entities.Organization.filter({ id: organization_id }),
      base44.asServiceRole.entities.OrganizationMember.filter({
        organization_id,
        user_email: user.email,
      }),
    ]);
  } catch {
    return deny('organization_not_found', `Organisation "${organization_id}" nicht gefunden.`);
  }

  const organization = orgs[0] || null;
  if (!organization) return deny('organization_not_found', `Organisation "${organization_id}" nicht gefunden.`);

  if (organization.status === 'suspended') {
    return deny('organization_suspended', `Organisation ist gesperrt: ${organization.suspended_reason || 'kein Grund angegeben'}.`);
  }

  // ── 4. Membership & Role check ─────────────────────────────────────────────
  const member = members[0] || null;
  if (!member) return deny('not_a_member', 'Nutzer ist kein Mitglied dieser Organisation.');
  if (member.status !== 'active') return deny('member_inactive', `Mitglied-Status ist "${member.status}", kein Zugriff.`);

  const role = member.role; // 'organization_admin' | 'sales_rep'

  // ── 5. Action permission check ─────────────────────────────────────────────
  if (action) {
    const allowedRoles = ACTION_ROLES[action];
    if (allowedRoles === undefined) return deny('unknown_action', `Unbekannte Aktion: "${action}".`);
    if (!allowedRoles.includes(role)) {
      return deny('insufficient_role', `Rolle "${role}" darf die Aktion "${action}" nicht ausführen.`);
    }
  }

  // ── 6. Billing / Subscription check ───────────────────────────────────────
  let subscription = null;
  let plan = null;
  let limits = null;

  const [subs, plans] = await Promise.all([
    base44.asServiceRole.entities.Subscription.filter({ organization_id }),
    organization.plan_id
      ? base44.asServiceRole.entities.Plan.filter({ id: organization.plan_id })
      : Promise.resolve([]),
  ]);

  subscription = subs[0] || null;
  plan = plans[0] || null;

  // Determine billing access level
  const billingStatus = subscription?.status || organization.billing_status || 'trialing';
  const billingAccess = BILLING_ACCESS[billingStatus] || 'blocked';

  if (action && billingAccess !== 'full') {
    if (billingAccess === 'blocked') {
      return deny(
        'billing_blocked',
        `Abo-Status "${billingStatus}": Zugriff gesperrt. Bitte Zahlung aktualisieren.`,
        { user, organization, member, role, plan, subscription, limits }
      );
    }
    if (billingAccess === 'restricted') {
      // sales_rep is fully blocked in restricted mode
      if (role === 'sales_rep') {
        return deny(
          'billing_restricted_sales_rep',
          `Abo-Status "${billingStatus}": Sales Rep hat keinen Zugriff. Admin muss Zahlung aktualisieren.`,
          { user, organization, member, role, plan, subscription, limits }
        );
      }
      // admin: only billing actions allowed
      if (!BILLING_RESTRICTED_ALLOWED.includes(action)) {
        return deny(
          'billing_restricted',
          `Abo-Status "${billingStatus}": Nur Billing-Aktionen erlaubt. Bitte Zahlung aktualisieren.`,
          { user, organization, member, role, plan, subscription, limits }
        );
      }
    }
  }

  // ── 7. Plan limits check ───────────────────────────────────────────────────
  if (plan) {
    limits = {
      max_users:                    plan.max_users,
      max_leads_per_month:          plan.max_leads_per_month,
      max_ai_scorings_per_month:    plan.max_ai_scorings_per_month,
      max_emails_per_month:         plan.max_emails_per_month,
      max_lead_generations_per_month: plan.max_lead_generations_per_month,
    };

    if (check_limit && limits[check_limit] !== undefined) {
      const maxVal = limits[check_limit];
      if (maxVal !== -1 && current_usage >= maxVal) {
        return deny(
          'plan_limit_exceeded',
          `Plan-Limit für "${check_limit}" erreicht: ${current_usage}/${maxVal}.`,
          { user, organization, member, role, plan, subscription, limits }
        );
      }
    }
  }

  // ── 8. All checks passed ───────────────────────────────────────────────────
  return allow({ reason: 'ok', user, organization, member, role, plan, subscription, limits });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function allow({ reason, user, organization, member, role, plan, subscription, limits }) {
  return { allowed: true, reason, user, organization, member, role, plan, subscription, limits };
}

function deny(reason, message, context = {}) {
  return {
    allowed: false,
    reason,
    message,
    user: context.user || null,
    organization: context.organization || null,
    member: context.member || null,
    role: context.role || null,
    plan: context.plan || null,
    subscription: context.subscription || null,
    limits: context.limits || null,
  };
}

// ─── HTTP Handler (for direct testing via HTTP) ───────────────────────────────
Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await checkAccess(req, {
      organization_id: body.organization_id,
      action: body.action,
      check_limit: body.check_limit,
      current_usage: body.current_usage || 0,
    });
    return Response.json(result);
  } catch (error) {
    console.error('[checkAccess] Unexpected error:', error.message);
    return Response.json({ allowed: false, reason: 'internal_error', message: error.message }, { status: 500 });
  }
});