import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
const BILLING_ACCESS = { active:'full', trialing:'full', past_due:'degraded', incomplete:'degraded', unpaid:'blocked', canceled:'blocked', incomplete_expired:'blocked' };
const DEGRADED_BLOCKED = new Set(['create_lead','generate_leads','use_ai_scoring','send_bulk_email']);
const BLOCKED_ADMIN_OK = new Set(['manage_billing','data_export']);
const DEGRADED_SALES_OK = new Set(['view_leads','view_tasks','create_contact_log','update_assigned_lead','complete_task']);

function _allow(r) { return { allowed:true, ...r }; }
function _deny(reason, message, ctx={}) { return { allowed:false, reason, message, user:ctx.user||null, organization:ctx.organization||null, member:ctx.member||null, role:ctx.role||null, plan:ctx.plan||null, subscription:ctx.subscription||null, limits:ctx.limits||null }; }

async function checkAccess(req, { organization_id, action, check_limit=null, current_usage=0 }={}) {
  const b44 = createClientFromRequest(req);
  let user; try { user = await b44.auth.me(); } catch { return _deny('not_authenticated','Nicht eingeloggt.'); }
  if (!user) return _deny('not_authenticated','Nicht eingeloggt.');
  if (user.role === 'admin') return _allow({ reason:'platform_admin', user, organization:null, member:null, role:'platform_admin', plan:null, subscription:null, limits:null });
  if (!organization_id) return _deny('missing_organization_id','Keine organization_id angegeben.');
  let orgs, members;
  try { [orgs, members] = await Promise.all([b44.asServiceRole.entities.Organization.filter({id:organization_id}), b44.asServiceRole.entities.OrganizationMember.filter({organization_id, user_email:user.email})]); }
  catch { return _deny('organization_not_found',`Organisation nicht gefunden.`); }
  const organization = orgs[0]||null;
  if (!organization) return _deny('organization_not_found','Organisation nicht gefunden.');
  if (organization.platform_status==='suspended') return _deny('organization_suspended',`Organisation gesperrt: ${organization.suspended_reason||'kein Grund'}.`, {user,organization,member:null,role:null});
  const member = members[0]||null;
  if (!member) return _deny('not_a_member','Kein Mitglied dieser Organisation.');
  if (member.status!=='active') return _deny('member_inactive',`Mitglied-Status: "${member.status}".`);
  const role = member.role;
  if (action) {
    const ar = ACTION_ROLES[action];
    if (ar===undefined) return _deny('unknown_action',`Unbekannte Aktion: "${action}".`);
    if (!ar.includes(role)) return _deny('insufficient_role',`Rolle "${role}" darf "${action}" nicht.`);
  }
  const [subs, plans] = await Promise.all([b44.asServiceRole.entities.Subscription.filter({organization_id}), organization.plan_id ? b44.asServiceRole.entities.Plan.filter({id:organization.plan_id}) : Promise.resolve([])]);
  const subscription=subs[0]||null, plan=plans[0]||null;
  const billingStatus = subscription?.status || organization.billing_status || 'trialing';
  const billingAccess = BILLING_ACCESS[billingStatus]||'blocked';
  if (action && billingAccess!=='full') {
    const ctx={user,organization,member,role,plan,subscription,limits:null};
    if (billingAccess==='blocked') {
      if (role==='organization_admin' && BLOCKED_ADMIN_OK.has(action)) { /* ok */ }
      else if (role==='sales_rep') return _deny('billing_blocked_sales_rep',`Abo "${billingStatus}": Kein Zugriff für Sales Rep.`,ctx);
      else return _deny('billing_blocked',`Abo "${billingStatus}": Zugriff gesperrt.`,ctx);
    }
    if (billingAccess==='degraded') {
      if (DEGRADED_BLOCKED.has(action)) return _deny('billing_degraded_action_blocked',`Abo "${billingStatus}": "${action}" nicht verfügbar.`,ctx);
      if (role==='sales_rep' && !DEGRADED_SALES_OK.has(action)) return _deny('billing_degraded_sales_rep',`Abo "${billingStatus}": Sales Rep darf "${action}" nicht.`,ctx);
    }
  }
  let limits = null;
  if (plan) {
    limits = { max_users:plan.max_users, max_leads_per_month:plan.max_leads_per_month, max_ai_scorings_per_month:plan.max_ai_scorings_per_month, max_emails_per_month:plan.max_emails_per_month, max_lead_generations_per_month:plan.max_lead_generations_per_month };
    if (check_limit && limits[check_limit]!==undefined) {
      const maxVal=limits[check_limit];
      if (maxVal!==-1 && current_usage>=maxVal) return _deny('plan_limit_exceeded',`Limit "${check_limit}": ${current_usage}/${maxVal}.`,{user,organization,member,role,plan,subscription,limits});
    }
  }
  return _allow({ reason:'ok', user, organization, member, role, plan, subscription, limits });
}
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { companyId, organization_id } = body;

    // ── 1. checkAccess ──────────────────────────────────────────────────────
    if (!organization_id) return Response.json({ error: 'organization_id ist Pflichtparameter' }, { status: 400 });
    const access = await checkAccess(req, { organization_id, action: 'use_ai_scoring' });
    if (!access.allowed) {
      console.warn(`[enrichCompany] Access denied: ${access.reason} – ${access.message}`);
      const statusCode = access.reason === 'organization_suspended' ? 403 : 403;
      return Response.json({ error: access.message, reason: access.reason }, { status: statusCode });
    }

    // ── 2. Company laden – nur innerhalb der Organisation ───────────────────
    if (!companyId) return Response.json({ error: 'companyId ist Pflichtparameter' }, { status: 400 });
    let company = null;
    try {
      const companies = await base44.asServiceRole.entities.Company.filter({ id: companyId, organization_id });
      company = companies[0] || null;
    } catch (_) { company = null; }
    if (!company) return Response.json({ error: 'Firma nicht gefunden oder falsche Organisation' }, { status: 404 });

    // ── 3. Sales Rep nur eigene Leads ───────────────────────────────────────
    if (access.role === 'sales_rep' && company.assigned_to !== access.user.email) {
      return Response.json({ error: 'Sales Rep darf nur zugewiesene Leads anreichern' }, { status: 403 });
    }

    // ── 4. KI-Limit prüfen vor LLM ──────────────────────────────────────────
    const now = new Date();
    const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let currentUsageLog = null;
    try {
      const usageLogs = await base44.asServiceRole.entities.UsageLog.filter({ organization_id, period_month: periodMonth });
      currentUsageLog = usageLogs[0] || null;
    } catch (_) {}

    const aiUsed = (currentUsageLog?.ai_actions_used || 0);

    // Plan-Limit direkt aus DB laden (access.limits ist null bei platform_admin-Pfad)
    let maxAi = 50; // Fallback
    try {
      const orgsForPlan = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
      const planId = orgsForPlan[0]?.plan_id;
      if (planId) {
        const plans = await base44.asServiceRole.entities.Plan.filter({ id: planId });
        if (plans[0]?.max_ai_scorings_per_month !== undefined) {
          maxAi = plans[0].max_ai_scorings_per_month;
        }
      }
    } catch (_) {}
    if (maxAi !== -1 && aiUsed >= maxAi) {
      console.warn(`[enrichCompany] KI-Limit erreicht: ${aiUsed}/${maxAi} für org=${organization_id}`);
      return Response.json({ error: `KI-Aktionslimit erreicht: ${aiUsed}/${maxAi} diesen Monat. Bitte warten Sie bis zum nächsten Monat oder upgraden Sie Ihren Plan.`, limitReached: true }, { status: 403 });
    }

    // ── 5. LLM-Recherche ────────────────────────────────────────────────────
    const llmTimeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("KI-Anfrage hat zu lange gedauert (30s). Bitte erneut versuchen.")), 30000)
    );
    const result = await Promise.race([
      base44.integrations.Core.InvokeLLM({
        prompt: `Recherchiere folgende Firma im Internet und gib mir die offiziellen Kontaktdaten zurück.

Firmenname: ${company.name}
Ort: ${company.ort || 'Neuwied'} ${company.plz || ''}
Branche: ${company.branche || 'Unbekannt'}

WICHTIG: Gib nur Felder zurück, die du mit Sicherheit gefunden hast. Wenn du ein Feld nicht findest, lasse es komplett weg (leerer String). Schreibe NIEMALS das Wort "null" in ein Feld.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            website: { type: "string" }, telefon: { type: "string" },
            email: { type: "string" }, ansprechpartner: { type: "string" }, adresse: { type: "string" },
          }
        }
      }),
      llmTimeoutPromise,
    ]);

    const isValid = (v) => v && typeof v === "string" && v.trim().length > 0 &&
      !["null","n/a","unbekannt","keine","nicht gefunden"].includes(v.trim().toLowerCase());

    const updates = {};
    if (!company.website && isValid(result.website)) updates.website = result.website.trim();
    if (!company.telefon && isValid(result.telefon)) updates.telefon = result.telefon.trim();
    if (!company.email && isValid(result.email)) updates.email = result.email.trim();
    if (!company.ansprechpartner && isValid(result.ansprechpartner)) updates.ansprechpartner = result.ansprechpartner.trim();
    if (!company.adresse && isValid(result.adresse)) updates.adresse = result.adresse.trim();

    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.Company.update(companyId, updates);
    }

    // ── 6. UsageLog: ai_actions_used (period_month) ──────────────────────────
    try {
      if (currentUsageLog) {
        await base44.asServiceRole.entities.UsageLog.update(currentUsageLog.id, {
          ai_actions_used: (currentUsageLog.ai_actions_used || 0) + 1,
        });
      } else {
        const periodStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString();
        const periodEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)).toISOString();
        await base44.asServiceRole.entities.UsageLog.create({
          organization_id, period_month: periodMonth, period_start: periodStart, period_end: periodEnd, ai_actions_used: 1,
        });
      }
    } catch (e) { console.warn('[enrichCompany] UsageLog failed:', e.message); }

    console.info(`[enrichCompany] org=${organization_id} user=${access.user.email} company=${company.name} updates=${Object.keys(updates).length}`);
    return Response.json({ updates, found: Object.keys(updates).length });

  } catch (error) {
    console.error('[enrichCompany] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});