import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Diagnose-Tool für Stripe Checkout Probleme ────────────────────────────────
// Nur für Platform-Admins: Sammelt Debugging-Info für einen Account
// Zeigt:
//   - Organization Status (trial_stage, billing_status)
//   - Subscription Status (stripe_subscription_id, status)
//   - Letzte Billing-Events (webhook logs)
//   - Plan Info
//
// Beispiel:
// POST /diagnoseCheckoutIssue
// {
//   "organization_id": "org_123"
// }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // ─ Nur Platform-Admins ────────────────────────────────────────────────
    if (!user || !['admin', 'platform_owner', 'platform_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Platform-Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { organization_id } = body;

    if (!organization_id) {
      return Response.json({ error: 'organization_id ist Pflichtparameter' }, { status: 400 });
    }

    // ─ Lade Organisation ───────────────────────────────────────────────────
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    const org = orgs[0];

    if (!org) {
      return Response.json({ error: `Organization "${organization_id}" nicht gefunden` }, { status: 404 });
    }

    // ─ Lade Subscriptions ──────────────────────────────────────────────────
    const subs = await base44.asServiceRole.entities.Subscription.filter({ organization_id });
    const activeSub = subs.find(s => ['active', 'trialing'].includes(s.status));
    const allSubs = subs;

    // ─ Lade Plan ───────────────────────────────────────────────────────────
    let plan = null;
    if (org.plan_id) {
      try {
        const plans = await base44.asServiceRole.entities.Plan.filter({ id: org.plan_id });
        plan = plans[0] || null;
      } catch (_) {}
    }

    // ─ Lade Billing Events (letzte 20) ─────────────────────────────────────
    const billingLogs = await base44.asServiceRole.entities.BillingEventLog.filter({ organization_id });
    const sortedLogs = billingLogs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 20);

    // ─ Analysiere Probleme ─────────────────────────────────────────────────
    const issues = [];

    // Issue 1: trial_stage ist free_preview aber billing_status ist active
    if (org.trial_stage === 'free_preview' && org.billing_status === 'active') {
      issues.push({
        severity: 'HIGH',
        code: 'MISMATCH_TRIAL_BILLING',
        message: 'trial_stage="free_preview" aber billing_status="active" — Webhook hat trial_stage nicht aktualisiert',
        hint: 'Reparieren mit repairTrialStage(organization_id, trial_stage="paid")',
      });
    }

    // Issue 2: Keine Active Subscription aber billing_status ist active
    if (!activeSub && org.billing_status === 'active') {
      issues.push({
        severity: 'MEDIUM',
        code: 'NO_ACTIVE_SUBSCRIPTION',
        message: 'billing_status="active" aber keine aktive/trialing Subscription',
        hint: 'Prüfen ob checkout.session.completed Webhook ankam',
      });
    }

    // Issue 3: checkout.session.completed mit error/ignored
    const checkoutEvents = sortedLogs.filter(l => l.event_type === 'checkout.session.completed');
    const failedCheckouts = checkoutEvents.filter(l => l.status === 'error' || l.status === 'ignored');
    if (failedCheckouts.length > 0) {
      issues.push({
        severity: 'HIGH',
        code: 'CHECKOUT_FAILED',
        message: `${failedCheckouts.length} fehlgeschlagene checkout.session.completed Events`,
        details: failedCheckouts.slice(0, 5).map(l => ({
          event_id: l.stripe_event_id,
          status: l.status,
          error_message: l.error_message,
          created_date: l.created_date,
        })),
        hint: 'Webhook hat einen Fehler bekommen — Stripe hat retried. Prüfen ob letzter Retry erfolgreich war.',
      });
    }

    // Issue 4: Keine Webhooks für diese Org
    if (sortedLogs.length === 0 && org.billing_status === 'active') {
      issues.push({
        severity: 'HIGH',
        code: 'NO_WEBHOOK_LOGS',
        message: 'Kein BillingEventLog für diese Org obwohl billing_status=active',
        hint: 'Webhooks kamen möglicherweise gar nicht an — prüfen Stripe Webhook Delivery in Stripe Dashboard',
      });
    }

    console.info(`[diagnoseCheckoutIssue] org=${organization_id} issues=${issues.length} by=${user.email}`);

    return Response.json({
      organization: {
        id: org.id,
        name: org.name,
        owner_email: org.owner_email,
        created_date: org.created_date,
        trial_stage: org.trial_stage,
        billing_status: org.billing_status,
        plan_id: org.plan_id,
        stripe_customer_id: org.stripe_customer_id,
        onboarding_done: org.onboarding_done,
      },
      plan: plan ? {
        id: plan.id,
        name: plan.name,
        price_monthly: plan.price_monthly,
        stripe_product_id: plan.stripe_product_id,
      } : null,
      subscriptions: {
        count: allSubs.length,
        active: activeSub ? {
          id: activeSub.id,
          stripe_subscription_id: activeSub.stripe_subscription_id,
          status: activeSub.status,
          current_period_start: activeSub.current_period_start,
          current_period_end: activeSub.current_period_end,
          trial_start: activeSub.trial_start,
          trial_end: activeSub.trial_end,
        } : null,
        all: allSubs.map(s => ({
          id: s.id,
          stripe_subscription_id: s.stripe_subscription_id,
          status: s.status,
          created_date: s.created_date,
        })),
      },
      billing_events: {
        count: sortedLogs.length,
        latest: sortedLogs.slice(0, 10).map(l => ({
          event_type: l.event_type,
          status: l.status,
          stripe_event_id: l.stripe_event_id,
          error_message: l.error_message,
          created_date: l.created_date,
        })),
      },
      issues,
      recommendation: issues.length > 0 
        ? `Es wurden ${issues.length} Problem(e) gefunden. Bitte oben stehende Hints befolgen.`
        : 'Kein Problem erkannt — Account scheint OK zu sein.',
    });
  } catch (error) {
    console.error('[diagnoseCheckoutIssue] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});