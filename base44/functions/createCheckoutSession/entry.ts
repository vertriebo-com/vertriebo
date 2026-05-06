import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

// ─── SOURCE OF TRUTH ARCHITEKTUR ─────────────────────────────────────────────
//
//  Stripe  = Zahlungsquelle (Geld, Rechnungen, Zahlungsmethoden)
//  unsere DB = App-Zugriffsquelle (Rollen, Features, Limits)
//
//  REGEL: Die App fragt NIEMALS Stripe live ab, um Zugriffsrechte zu entscheiden.
//         plan_id kommt immer aus unserer DB → Price-ID niemals vom Frontend.
//
//  Trial-Schutz:
//    Trial nur wenn:
//      - Org hat NOCH NIE eine Subscription gehabt (existingSubs.length === 0)
//      - Org hat kein stripe_customer_id (noch nicht in Stripe registriert)
//    → verhindert Trial-Missbrauch durch mehrfaches Starten
//
//  Parallel-Checkout-Schutz:
//    - Aktive/trialing Subscription → 409, außer allow_upgrade=true
//    - Verhindert mehrere parallele aktive Checkouts
//
//  Stripe Metadata (für Debugging):
//    checkout.session.metadata + subscription_data.metadata enthalten:
//      - organization_id, plan_id, plan_name
//      - initiated_by_user (E-Mail des auslösenden Users)
//      - initiated_by_role (Rolle des auslösenden Users)
//      - app_environment (production/sandbox)
//      - base44_app_id
//
// ─────────────────────────────────────────────────────────────────────────────

// ─── Inline checkAccess ───────────────────────────────────────────────────────
const ACTION_ROLES = {
  view_leads: ['organization_admin','sales_rep'], create_lead: ['organization_admin','sales_rep'],
  update_assigned_lead: ['organization_admin','sales_rep'], delete_lead: ['organization_admin'],
  generate_leads: ['organization_admin'], create_contact_log: ['organization_admin','sales_rep'],
  view_tasks: ['organization_admin','sales_rep'], complete_task: ['organization_admin','sales_rep'],
  manage_users: ['organization_admin'], manage_settings: ['organization_admin'],
  manage_billing: ['organization_admin'], data_export: ['organization_admin'],
  view_reports: ['organization_admin','sales_rep'], use_ai_scoring: ['organization_admin','sales_rep'],
  send_bulk_email: ['organization_admin','sales_rep'], manage_blacklist: ['organization_admin'],
  platform_admin_access: [],
};

function _allow(r) { return { allowed:true, ...r }; }
function _deny(reason, message) { return { allowed:false, reason, message, user:null }; }

async function checkAccess(req, { organization_id, action }={}) {
  const b44 = createClientFromRequest(req);
  let user; try { user = await b44.auth.me(); } catch { return _deny('not_authenticated','Nicht eingeloggt.'); }
  if (!user) return _deny('not_authenticated','Nicht eingeloggt.');
  if (user.role === 'admin') return _allow({ reason:'platform_admin', user, organization:null, member:null, role:'platform_admin' });
  if (!organization_id) return _deny('missing_organization_id','Keine organization_id angegeben.');
  let orgs, members;
  try { [orgs, members] = await Promise.all([b44.asServiceRole.entities.Organization.filter({id:organization_id}), b44.asServiceRole.entities.OrganizationMember.filter({organization_id, user_email:user.email})]); }
  catch { return _deny('organization_not_found','Organisation nicht gefunden.'); }
  const organization = orgs[0]||null;
  if (!organization) return _deny('organization_not_found','Organisation nicht gefunden.');
  const member = members[0]||null;
  if (!member) return _deny('not_a_member','Kein Mitglied dieser Organisation.');
  if (member.status!=='active') return _deny('member_inactive',`Mitglied-Status: "${member.status}".`);
  const role = member.role;
  if (action) {
    const ar = ACTION_ROLES[action];
    if (!ar || !ar.includes(role)) return _deny('insufficient_role',`Rolle "${role}" darf "${action}" nicht.`);
  }
  return _allow({ reason:'ok', user, organization, member, role });
}
// ─────────────────────────────────────────────────────────────────────────────

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// app_environment: sandbox wenn kein echter Stripe live key
function getAppEnvironment() {
  const key = Deno.env.get('STRIPE_SECRET_KEY') || '';
  return key.startsWith('sk_live_') ? 'production' : 'sandbox';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { organization_id, plan_id, success_url, cancel_url, allow_upgrade = false } = body;

    // ── 1. Pflichtparameter ─────────────────────────────────────────────────
    if (!organization_id) return Response.json({ error: 'organization_id ist Pflichtparameter' }, { status: 400 });
    if (!plan_id) return Response.json({ error: 'plan_id ist Pflichtparameter' }, { status: 400 });

    // ── 2. Nur organization_admin darf Billing starten ──────────────────────
    const access = await checkAccess(req, { organization_id, action: 'manage_billing' });
    if (!access.allowed) {
      console.warn(`[createCheckoutSession] Access denied: ${access.reason}`);
      return Response.json({ error: access.message, reason: access.reason }, { status: 403 });
    }
    const user = access.user;
    const userRole = access.role;

    // ── 3. Plan aus DB laden (Price-ID NIEMALS vom Frontend übernehmen) ─────
    let plan = null;
    try {
      const plans = await base44.asServiceRole.entities.Plan.filter({ id: plan_id });
      plan = plans[0] || null;
    } catch (_) { plan = null; }
    if (!plan) return Response.json({ error: `Plan "${plan_id}" nicht gefunden` }, { status: 404 });
    if (!plan.stripe_price_id) return Response.json({ error: `Plan hat keine Stripe Price ID – bitte zuerst Stripe Products anlegen` }, { status: 400 });
    if (!plan.is_active) return Response.json({ error: `Plan ist nicht buchbar` }, { status: 400 });

    // ── 4. Organisation laden ───────────────────────────────────────────────
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    const org = orgs[0] || null;
    if (!org) return Response.json({ error: 'Organisation nicht gefunden' }, { status: 404 });

    // ── 5. Existierende Subscriptions prüfen ───────────────────────────────
    const existingSubs = await base44.asServiceRole.entities.Subscription.filter({ organization_id });
    const activeSub = existingSubs.find(s => ['active', 'trialing'].includes(s.status));

    // ── 5a. Doppel-Checkout-Schutz (aktive oder laufende Trial-Sub) ─────────
    if (activeSub && !allow_upgrade) {
      return Response.json({
        error: 'Organisation hat bereits eine aktive Subscription',
        subscription_status: activeSub.status,
        hint: 'Sende allow_upgrade=true für Plan-Wechsel oder nutze das Kundenportal',
      }, { status: 409 });
    }

    // ── 5b. Trial-Missbrauch-Schutz ─────────────────────────────────────────
    // Trial nur wenn ALLE der folgenden Bedingungen erfüllt sind:
    //   1. Org hat noch KEINE Subscription in der DB (weder aktiv noch historisch)
    //   2. Org hat noch keinen stripe_customer_id (noch nie bezahlt)
    // Zusätzliche Absicherung: Auch wenn stripe_customer_id leer, aber Subscription
    // vorhanden → kein Trial (verhindert Race Conditions / manuelle DB-Eingriffe)
    const hadAnySubscription = existingSubs.length > 0;
    const hadStripeCustomer = !!org.stripe_customer_id;
    // Trial-Berechtigung: BEIDE Bedingungen müssen erfüllt sein
    const isEligibleForTrial = !hadAnySubscription && !hadStripeCustomer;
    const trialDays = isEligibleForTrial ? 14 : 0;

    console.info(`[createCheckoutSession] trial_check org=${organization_id} had_subs=${hadAnySubscription} had_customer=${hadStripeCustomer} eligible=${isEligibleForTrial}`);

    console.info(`[createCheckoutSession] org=${organization_id} trial_eligible=${isEligibleForTrial} had_subs=${hadAnySubscription} had_customer=${hadStripeCustomer}`);

    // ── 6. Stripe Customer: bestehende ID nutzen oder neu anlegen ───────────
    let stripeCustomerId = org.stripe_customer_id || null;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: {
          organization_id,
          owner_email: org.owner_email,
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          app_environment: getAppEnvironment(),
        },
      });
      stripeCustomerId = customer.id;
      await base44.asServiceRole.entities.Organization.update(organization_id, { stripe_customer_id: stripeCustomerId });
      console.info(`[createCheckoutSession] Stripe Customer erstellt: ${stripeCustomerId} für org ${organization_id}`);
    }

    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const successRedirect = success_url || `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelRedirect = cancel_url || `${origin}/landing`;
    const appEnv = getAppEnvironment();

    // ── 7. Checkout Session erstellen ───────────────────────────────────────
    // Metadata enthält vollständige Debugging-Infos (initiated_by_user, initiated_by_role, app_environment)
    const sessionParams = {
      mode: 'subscription',
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: successRedirect,
      cancel_url: cancelRedirect,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        organization_id,
        plan_id,
        plan_name: plan.name,
        initiated_by_user: user.email,
        initiated_by_role: userRole,
        app_environment: appEnv,
        ...(activeSub?.stripe_subscription_id ? { upgrade_from_subscription_id: activeSub.stripe_subscription_id } : {}),
      },
      subscription_data: {
        metadata: {
          organization_id,
          plan_id,
          plan_name: plan.name,
          initiated_by_user: user.email,
          initiated_by_role: userRole,
          app_environment: appEnv,
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
        },
      },
    };

    if (trialDays > 0) {
      sessionParams.subscription_data.trial_period_days = trialDays;
      console.info(`[createCheckoutSession] Trial aktiviert: ${trialDays} Tage für org ${organization_id}`);
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.info(`[createCheckoutSession] OK – org=${organization_id} user=${user.email} plan=${plan.name} session=${session.id} trial=${trialDays}d upgrade=${allow_upgrade} env=${appEnv}`);
    return Response.json({
      url: session.url,
      session_id: session.id,
      trial_days: trialDays,
      plan_name: plan.name,
    });

  } catch (error) {
    console.error('[createCheckoutSession] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});