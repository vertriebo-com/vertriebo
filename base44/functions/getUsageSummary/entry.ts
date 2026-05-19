import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Org-ID aus Request-Body oder User-Kontext
    let requestedOrgId = null;
    try {
      const body = await req.json();
      requestedOrgId = body?.org_id || null;
    } catch {}

    // Organisation ermitteln + Zugriff validieren
    const isPlatformAdmin = ["admin", "platform_owner", "platform_admin", "support_agent", "readonly_support"].includes(user.role);
    
    const [ownerOrgs, memberships] = await Promise.all([
      base44.entities.Organization.filter({ owner_email: user.email }),
      base44.entities.OrganizationMember.filter({ user_email: user.email, status: "active" }),
    ]);

    let org = null;
    if (requestedOrgId) {
      const isOwner = ownerOrgs.some(o => o.id === requestedOrgId);
      const memberEntry = memberships.find(m => m.organization_id === requestedOrgId);
      if (isOwner || memberEntry || isPlatformAdmin) {
        const targetOrgs = await base44.asServiceRole.entities.Organization.filter({ id: requestedOrgId });
        org = targetOrgs?.[0] || null;
      } else {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      org = ownerOrgs?.[0] || null;
      if (!org && memberships?.[0]?.organization_id) {
        const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
        org = memberOrgs?.[0] || null;
      }
      if (!org && isPlatformAdmin) {
        const anyOrg = await base44.asServiceRole.entities.Organization.list("-created_date", 1);
        org = anyOrg?.[0] || null;
      }
    }

    if (!org) {
      return Response.json({ error: 'No organization found' }, { status: 404 });
    }

    const orgId = org.id;

    // ── KANONISCHE PERIOD_MONTH-BERECHNUNG (Europe/Berlin) ─────────────────
    // Robuste Implementierung via formatToParts (vermeidet Invalid Date / Split-Fehler)
    const now = new Date();
    const periodParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(now);
    const yearPart = periodParts.find(p => p.type === 'year');
    const monthPart = periodParts.find(p => p.type === 'month');
    const periodMonth = `${yearPart?.value}-${monthPart?.value}`; // z.B. "2026-05"

    // ── RESET-DATUM (erster Tag nächster Kalendermonat Berlin) ─────────────
    const py = parseInt(yearPart?.value || new Date().getFullYear());
    const pm = parseInt(monthPart?.value || 1);
    const resetDate = new Date(Date.UTC(py, pm, 1)); // pm ist 1-basiert → nächster Monat
    const resetDateFormatted = resetDate.toLocaleDateString('de-DE', { 
      day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' 
    });

    // ── USAGELOG LADEN ─────────────────────────────────────────────────────
    const usageLogs = await base44.asServiceRole.entities.UsageLog.filter({ 
      organization_id: orgId, 
      period_month: periodMonth 
    });
    const usageLog = usageLogs?.[0] || null;

    // ── PLAN LADEN ─────────────────────────────────────────────────────────
    const plan = org.plan_id 
      ? (await base44.asServiceRole.entities.Plan.filter({ id: org.plan_id }))?.[0] 
      : null;

    const monthlyLimit = plan?.max_leads_per_month ?? -1;
    const monthlyUsed = usageLog?.leads_created || 0;
    const monthlyRemaining = monthlyLimit === -1 ? null : Math.max(0, monthlyLimit - monthlyUsed);
    const isOverLimit = monthlyLimit !== -1 && monthlyUsed > monthlyLimit;

    // ── CRM-BESTAND (aktuell gespeicherte Companies, ohne Blacklist) ───────
    const blacklist = await base44.entities.Blacklist.filter({ organization_id: orgId });
    const blacklistNames = blacklist.map(b => b.firmenname?.toLowerCase().trim());
    const isBlacklisted = (name) => {
      if (!name) return false;
      const normalized = name.toLowerCase().trim();
      return blacklistNames.some(bl => normalized.includes(bl) || bl.includes(normalized));
    };

    const allCompanies = await base44.entities.Company.filter({ organization_id: orgId }, "-created_date", 2000);
    const crmTotal = allCompanies.filter(c => !isBlacklisted(c.name)).length;

    // ── ZENTRALE USAGE_SUMMARY (Single Source of Truth) ────────────────────
    const usage_summary = {
      period_month: periodMonth,
      plan_name: plan?.name || null,
      monthly_limit: monthlyLimit,
      monthly_used: monthlyUsed,
      monthly_remaining: monthlyRemaining,
      is_over_limit: isOverLimit,
      reset_date: resetDateFormatted,
      crm_total: crmTotal,
      // Erklärung warum monthly_used ≠ crm_total sein kann:
      explanation: {
        monthly_used_description: "Automatisch generierte neue Leads in diesem Kalendermonat",
        crm_total_description: "Aktuell gespeicherte Firmenkontakte (kann auch manuell angelegte enthalten)",
        why_different: monthlyUsed !== crmTotal ? 
          "Der Monatsverbrauch zählt nur automatisch recherchierte Leads. Der CRM-Bestand enthält auch manuell angelegte Kontakte und kann sich durch Löschen/Archivieren unterscheiden." : 
          null,
      },
      // Weitere Usage-Metriken
      research_runs_used: usageLog?.lead_generations_used || 0,
      ai_actions_used: usageLog?.ai_actions_used || 0,
      manual_emails_logged: usageLog?.manual_emails_logged || 0,
      max_research_runs: plan?.max_lead_generations_per_month ?? -1,
      max_ai_actions: plan?.max_ai_scorings_per_month ?? -1,
    };

    return Response.json({
      success: true,
      usage_summary,
      org: {
        id: org.id,
        name: org.name,
        trial_stage: org.trial_stage,
        billing_status: org.billing_status,
      },
    });

  } catch (error) {
    console.error('[getUsageSummary] Error:', error?.message);
    return Response.json({ error: error?.message || 'Unbekannter Fehler', success: false }, { status: 500 });
  }
});