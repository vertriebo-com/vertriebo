/**
 * ============================================================
 * VERTRIEBO - runUnifiedResearch
 * ============================================================
 * Ein-Klick-Firmenrecherche für Kunden.
 * 
 * Orchestriert:
 * 1. Google-Recherche (interne Nutzung von generateLeads)
 * 2. Register-Signale (OpenRegister im Hintergrund)
 * 3. Google-Abgleich (matchExternalSourceWithGooglePlaces)
 * 4. Auto-Übernahme nur bei hoher Sicherheit (ready_for_review + enriched + conf>=70)
 * 5. UsageLog nur für echte Companies-Erstellungen
 * 
 * Kunde sieht: "X Firmenkontakte erstellt"
 * Kunde sieht NICHT: technische Zwischenschritte, interne Kandidaten
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function getPeriodMonth() {
  const n = new Date();
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ============================================================
// MAIN HANDLER
// ============================================================

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { organization_id } = body;

    if (!organization_id) {
      return Response.json(
        { error: 'organization_id fehlt', success: false },
        { status: 400 }
      );
    }

    // ── ACCESS CHECK ──────────────────────────────────────────────────────
    let org, access;
    try {
      const orgs = await base44.asServiceRole.entities.Organization.filter({
        id: organization_id,
      });
      org = orgs[0];
      if (!org) {
        return Response.json(
          { error: 'Organization not found', success: false },
          { status: 404 }
        );
      }

      // Check: owner or org_admin
      if (org.owner_email !== user.email) {
        const members = await base44.asServiceRole.entities.OrganizationMember.filter(
          {
            organization_id,
            user_email: user.email,
            status: 'active',
          }
        );
        if (!members[0]?.role || !['organization_admin'].includes(members[0].role)) {
          return Response.json({ error: 'Forbidden', success: false }, { status: 403 });
        }
        access = { user, org, role: 'organization_admin' };
      } else {
        access = { user, org, role: 'organization_admin' };
      }
    } catch (e) {
      console.error('[runUnifiedResearch] Access check error:', e?.message);
      return Response.json(
        { error: 'Access check failed', success: false },
        { status: 500 }
      );
    }

    // ── ORGANIZATION STATUS CHECKS ────────────────────────────────────────
    const billingOk = ['preview', 'active', 'trialing'].includes(org.billing_status);
    if (!billingOk) {
      return Response.json(
        { error: `Billing status "${org.billing_status}" nicht erlaubt.`, success: false },
        { status: 402 }
      );
    }

    if (user.role !== 'admin' && org.platform_status === 'suspended') {
      return Response.json(
        {
          error: 'organization_suspended',
          message: 'Diese Organisation ist gesperrt.',
          success: false,
        },
        { status: 403 }
      );
    }

    if (org.abuse_status === 'blocked') {
      return Response.json(
        {
          error: 'abuse_blocked',
          message: 'Zugang eingeschränkt.',
          success: false,
        },
        { status: 403 }
      );
    }

    // ── MONTHLY LIMIT CHECK ───────────────────────────────────────────────
    let monthlyContactLimit = 300;
    if (org.plan_id) {
      const plans = await base44.asServiceRole.entities.Plan.filter({
        id: org.plan_id,
      });
      if (plans[0]) monthlyContactLimit = plans[0].max_leads_per_month ?? 300;
    }

    const periodMonth = getPeriodMonth();
    const existingUsage = await base44.asServiceRole.entities.UsageLog.filter({
      organization_id,
      period_month: periodMonth,
    });
    const monthlyContactsUsed = existingUsage[0]?.leads_created || 0;

    if (monthlyContactLimit !== -1 && monthlyContactsUsed >= monthlyContactLimit) {
      return Response.json(
        {
          success: false,
          error: 'monthly_contact_limit_reached',
          message: `Ihr Limit von ${monthlyContactLimit} Firmenkontakten wurde erreicht.`,
        },
        { status: 429 }
      );
    }

    // ── CALL generateLeads (Google Research) ───────────────────────────────
    let googleResult;
    try {
      const isMobile = body.mode === 'fast' || false;
      const effectiveTargetCount = isMobile ? 10 : 25;

      const googleRes = await base44.functions.invoke('generateLeads', {
        organization_id,
        target_count: effectiveTargetCount,
        mode: isMobile ? 'fast' : 'standard',
      });

      if (!googleRes?.data?.success) {
        return Response.json(
          {
            success: false,
            error: googleRes?.data?.error || 'generateLeads failed',
            message:
              googleRes?.data?.error ||
              'Recherche konnte nicht durchgeführt werden.',
          },
          { status: 500 }
        );
      }

      googleResult = googleRes.data;
      console.log(
        `[runUnifiedResearch] generateLeads result: ${googleResult.count} new contacts, chargedLeadGeneration=${googleResult.chargedLeadGeneration}`
      );
    } catch (e) {
      console.error('[runUnifiedResearch] generateLeads error:', e?.message);
      return Response.json(
        { error: 'generateLeads failed', success: false, message: e?.message },
        { status: 500 }
      );
    }

    // ── BACKGROUND: Register Signals (OPTIONAL) ───────────────────────────
    // Nur wenn Kontakte erstellt wurden, prüfe Register-Signale
    // Dies läuft asynchron im Hintergrund, beeinflusst aber nicht die Customer-Response
    let registerCandidatesEnriched = 0;
    if (googleResult.count > 0) {
      try {
        // TODO: Spawn Register-Check als Hintergrund-Task
        // Für MVP: ignorieren, nur Google ist Quelle
        console.log('[runUnifiedResearch] Register-Signal-Check: defer für später');
      } catch (e) {
        console.warn('[runUnifiedResearch] Register check (background) skipped:', e?.message);
      }
    }

    // ── ONLY USE CREATED CONTACTS FOR USER MESSAGE ────────────────────────
    // Nur Companies, die von generateLeads erstellt wurden, zählen für Kunde
    const createdCount = googleResult.count || 0;
    const chargedLeadGeneration = googleResult.chargedLeadGeneration || false;

    // ── USAGE LOG: NUR für echte Company-Erstellungen ──────────────────────
    // Unsichere Kandidaten (ExternalCompanySource mit match_status !== ready_for_review)
    // zählen NICHT gegen Monatslimit
    if (chargedLeadGeneration && createdCount > 0) {
      try {
        const now = new Date().toISOString();
        const start = new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            1
          )
        ).toISOString();
        const end = new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth() + 1,
            0,
            23,
            59,
            59
          )
        ).toISOString();

        const existing = await base44.asServiceRole.entities.UsageLog.filter({
          organization_id,
          period_month: periodMonth,
        });

        if (existing?.[0]) {
          await base44.asServiceRole.entities.UsageLog.update(existing[0].id, {
            lead_generations_used:
              (existing[0].lead_generations_used || 0) +
              (chargedLeadGeneration ? 1 : 0),
            leads_created: (existing[0].leads_created || 0) + createdCount,
            last_lead_generation_at: now,
          });
        } else {
          await base44.asServiceRole.entities.UsageLog.create({
            organization_id,
            period_month: periodMonth,
            period_start: start,
            period_end: end,
            lead_generations_used: chargedLeadGeneration ? 1 : 0,
            leads_created: createdCount,
            last_lead_generation_at: now,
          });
        }
        console.log(
          `[runUnifiedResearch] UsageLog updated: +${createdCount} contacts`
        );
      } catch (e) {
        console.error('[runUnifiedResearch] UsageLog update error:', e?.message);
        // Non-critical: don't fail the response
      }
    }

    // ── CUSTOMER RESPONSE ─────────────────────────────────────────────────
    // Simple, clear message. No technical details visible.
    const monthlyUsageAfter = monthlyContactsUsed + createdCount;
    const monthlyRemaining =
      monthlyContactLimit === -1
        ? -1
        : Math.max(0, monthlyContactLimit - monthlyUsageAfter);

    let userMessage = '';
    if (createdCount > 0) {
      userMessage = `Recherche abgeschlossen. ${createdCount} neue Firmenkontakte wurden erstellt. Sie finden die Kontakte jetzt in Ihrer Leadliste.`;
    } else {
      userMessage = `Keine neuen passenden Firmenkontakte gefunden. Bitte erweitern Sie den Radius oder passen Sie Ihre Zielkunden an.`;
    }

    console.log(
      `[runUnifiedResearch] DONE org=${organization_id} created=${createdCount} user_message="${userMessage}"`
    );

    // ── RETURN TO FRONTEND ────────────────────────────────────────────────
    return Response.json({
      success: true,
      created_contacts_count: createdCount,
      user_message: userMessage,
      monthly_usage: {
        monthly_limit: monthlyContactLimit,
        monthly_used_after: monthlyUsageAfter,
        remaining_after: monthlyRemaining,
      },
      // Internal diagnostics (not shown to customer)
      _debug: {
        google_count: googleResult.count || 0,
        google_run_type: googleResult.runType || 'unknown',
        register_enriched: registerCandidatesEnriched,
        charged_lead_generation: chargedLeadGeneration,
      },
    });
  } catch (error) {
    console.error('[runUnifiedResearch] Error:', error?.message, error?.stack);
    return Response.json(
      {
        success: false,
        error: 'internal_error',
        message: 'Ein interner Fehler ist aufgetreten. Bitte erneut versuchen.',
      },
      { status: 500 }
    );
  }
});