import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── ARCHITEKTUR-HINWEIS ──────────────────────────────────────────────────────
// TODO (Skalierung): Bei 100+ Orgs muss ein Orchestrator salesCoach pro Org
// enqueuen. Derzeit: organization_id als Pflichtparameter = batch-ready.
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
const BILLING_ACCESS = { preview:'full', active:'full', trialing:'full', past_due:'degraded', incomplete:'degraded', unpaid:'blocked', canceled:'blocked', incomplete_expired:'blocked' };
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
  catch { return _deny('organization_not_found','Organisation nicht gefunden.'); }
  const organization = orgs[0]||null;
  if (!organization) return _deny('organization_not_found','Organisation nicht gefunden.');
  if (organization.status==='suspended') return _deny('organization_suspended',`Organisation gesperrt.`);
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
    const body = await req.json().catch(() => ({}));
    const { organization_id, testMode = false, testEmail = null } = body;

    // ── 1. organization_id Pflicht + checkAccess ────────────────────────────
    if (!organization_id) return Response.json({ error: 'organization_id ist Pflichtparameter' }, { status: 400 });
    const access = await checkAccess(req, { organization_id, action: 'view_reports' });
    if (!access.allowed) {
      console.warn(`[salesCoach] Access denied: ${access.reason}`);
      return Response.json({ error: access.message, reason: access.reason }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const dateStr = now.toLocaleDateString('de-DE', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    // ── 2. Alle Daten org-spezifisch laden ─────────────────────────────────
    const [members, contactLogs, tasks] = await Promise.all([
      base44.asServiceRole.entities.OrganizationMember.filter({ organization_id, status: 'active' }),
      base44.asServiceRole.entities.ContactLog.filter({ organization_id }),
      base44.asServiceRole.entities.Task.filter({ organization_id }),
    ]);

    // User-Objekte für full_name
    const memberEmails = members.map(m => m.user_email);
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 200);
    const orgUsers = allUsers.filter(u => memberEmails.includes(u.email));
    const targetUsers = testEmail ? orgUsers.filter(u => u.email === testEmail) : orgUsers;

    const todayLogs = contactLogs.filter(log => new Date(log.created_date) >= todayStart);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0,0,0,0);

    const motivations = [
      { emoji:"🔥", text:"Die besten Deals entstehen durch Konsequenz. Ein Anruf kann alles ändern!" },
      { emoji:"💪", text:"Jeder Kontakt bringt dich näher zum nächsten Abschluss. Fang jetzt an!" },
      { emoji:"🎯", text:"Dein nächster Kunde wartet schon auf deinen Anruf. Greif zum Hörer!" },
      { emoji:"🚀", text:"Vertrieb ist ein Zahlenspiel – je mehr du kontaktierst, desto mehr gewinnst du!" },
      { emoji:"⚡", text:"Ein kurzes Gespräch heute kann morgen ein unterschriebenes Angebot sein!" },
    ];
    const motivation = motivations[now.getDay() % motivations.length];

    const results = [];

    for (const user of targetUsers) {
      if (!user.email) continue;
      const firstName = user.full_name?.split(' ')[0] || user.email.split('@')[0];

      // Hat der User heute schon einen Log? → kein Reminder nötig
      const userTodayLogs = todayLogs.filter(log => log.user_email === user.email);
      if (userTodayLogs.length > 0 && !testMode) {
        console.log(`[salesCoach] ${user.email} already logged ${userTodayLogs.length} contact(s) today. Skipping.`);
        continue;
      }

      // Nur org-spezifische Tasks und Logs
      const openTasks = tasks.filter(t => !t.erledigt && t.assigned_to === user.email);
      const weekLogs = contactLogs.filter(log => log.user_email === user.email && new Date(log.created_date) >= weekStart);

      const emailBody = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#0f4cb3;border-radius:12px 12px 0 0;padding:28px 32px;">
  <div style="font-size:26px;font-weight:800;color:white;">${motivation.emoji} Hey ${firstName}, noch kein Kontakt heute!</div>
  <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:8px;">${dateStr}</div>
</td></tr>
<tr><td style="background:white;padding:28px 32px;border:1px solid #e2e8f0;border-top:none;">
  <div style="background:#eff6ff;border-left:4px solid #0f4cb3;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px;">
    <div style="font-size:15px;font-weight:600;color:#1e40af;">${motivation.text}</div>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
    <td align="center" style="padding:14px 8px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
      <div style="font-size:28px;font-weight:800;color:#0f4cb3;">${weekLogs.length}</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">Kontakte diese Woche</div>
    </td>
    <td width="12"></td>
    <td align="center" style="padding:14px 8px;background:#fff5f5;border-radius:8px;border:1px solid #fecaca;">
      <div style="font-size:28px;font-weight:800;color:#dc2626;">${openTasks.length}</div>
      <div style="font-size:11px;color:#dc2626;margin-top:2px;">Offene Aufgaben</div>
    </td>
    <td width="12"></td>
    <td align="center" style="padding:14px 8px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
      <div style="font-size:28px;font-weight:800;color:#16a34a;">0</div>
      <div style="font-size:11px;color:#16a34a;margin-top:2px;">Heute erfasst</div>
    </td>
  </tr></table>
  <p style="font-size:14px;color:#4b5563;margin-bottom:20px;">Öffne das CRM, ruf die nächste Firma an und trag das Ergebnis ein – es dauert nur 2 Minuten!</p>
  ${openTasks.length > 0 ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-top:16px;">
    <div style="font-size:13px;font-weight:600;color:#92400e;margin-bottom:6px;">⚠️ Du hast ${openTasks.length} offene Aufgabe${openTasks.length>1?'n':''}</div>
    ${openTasks.slice(0,3).map(t => `<div style="font-size:12px;color:#6b7280;padding:4px 0;border-top:1px solid #fde68a;">📋 ${t.titel}${t.company_name?' · '+t.company_name:''}</div>`).join('')}
  </div>` : ''}
</td></tr>
<tr><td style="background:#1e293b;border-radius:0 0 12px 12px;padding:20px 32px;">
  <div style="font-size:12px;color:#94a3b8;">Viele Erfolge heute! 💼 · Huwa Vertrieb-Team</div>
</td></tr>
</table></td></tr></table></body></html>`;

      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "accept":"application/json", "api-key":Deno.env.get("BREVO_API_KEY"), "content-type":"application/json" },
        body: JSON.stringify({
          sender: { name:"Vertriebo Coach", email:"info@huwa-gebaeudedienste.de" },
          to: [{ email:user.email }],
          subject: testMode ? `[TEST] ${motivation.emoji} ${firstName}, noch kein Kontakt heute!` : `${motivation.emoji} ${firstName}, dein Vertriebscoach meldet sich!`,
          htmlContent: emailBody,
        }),
      });
      if (!brevoRes.ok) {
        const err = await brevoRes.json();
        console.error(`[salesCoach] Brevo error for ${user.email}:`, JSON.stringify(err));
        throw new Error(`Brevo: ${JSON.stringify(err)}`);
      }

      console.log(`[salesCoach] Reminder sent to ${user.email} (weekLogs: ${weekLogs.length}, openTasks: ${openTasks.length})`);
      results.push({ user:user.email, sent:true, weekLogs:weekLogs.length, openTasks:openTasks.length });
    }

    // ── 3. UsageLog: emails_sent ────────────────────────────────────────────
    if (results.length > 0) {
      try {
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const periodEnd = new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59).toISOString();
        const usageLogs = await base44.asServiceRole.entities.UsageLog.filter({ organization_id, period_start: periodStart });
        if (usageLogs[0]) {
          await base44.asServiceRole.entities.UsageLog.update(usageLogs[0].id, { emails_sent:(usageLogs[0].emails_sent||0)+results.length });
        } else {
          await base44.asServiceRole.entities.UsageLog.create({ organization_id, period_start:periodStart, period_end:periodEnd, emails_sent:results.length });
        }
      } catch (e) { console.warn('[salesCoach] UsageLog failed:', e.message); }
    }

    console.info(`[salesCoach] org=${organization_id} reminders=${results.length}/${targetUsers.length}`);
    return Response.json({ success:true, checked:targetUsers.length, reminders_sent:results.length, results });

  } catch (error) {
    console.error("salesCoach error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});