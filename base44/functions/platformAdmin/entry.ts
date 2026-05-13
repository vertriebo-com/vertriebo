import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Plattform-Admin Authentifizierung
    if (!user || !['admin', 'platform_owner', 'platform_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { action, organization_id, reason, severity, note, trial_stage } = payload;

    if (!action || !organization_id) {
      return Response.json({ error: 'Missing action or organization_id' }, { status: 400 });
    }

    // Organisationen laden
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    if (!orgs || orgs.length === 0) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }
    const org = orgs[0];

    if (action === 'suspendOrganization') {
      if (!reason || !reason.trim()) {
        return Response.json({ error: 'Reason required for suspend' }, { status: 400 });
      }

      // Update Organization
      await base44.asServiceRole.entities.Organization.update(organization_id, {
        platform_status: 'suspended',
        suspended_reason: reason,
        suspended_at: new Date().toISOString(),
        suspended_by: user.email,
      });

      // Audit Log
      await base44.asServiceRole.entities.PlatformAuditLog.create({
        actor_email: user.email,
        actor_role: user.role,
        action: 'suspend_organization',
        target_type: 'organization',
        target_id: organization_id,
        organization_id: organization_id,
        parent_agency_id: org.parent_agency_id || null,
        reason: reason,
      });

      return Response.json({
        success: true,
        action: 'suspendOrganization',
        organization_id,
      });
    }

    if (action === 'unsuspendOrganization') {
      // Update Organization
      await base44.asServiceRole.entities.Organization.update(organization_id, {
        platform_status: 'active',
        suspended_reason: null,
        suspended_at: null,
        suspended_by: null,
      });

      // Audit Log
      await base44.asServiceRole.entities.PlatformAuditLog.create({
        actor_email: user.email,
        actor_role: user.role,
        action: 'unsuspend_organization',
        target_type: 'organization',
        target_id: organization_id,
        organization_id: organization_id,
        parent_agency_id: org.parent_agency_id || null,
      });

      return Response.json({
        success: true,
        action: 'unsuspendOrganization',
        organization_id,
      });
    }

    if (action === 'createSupportNote') {
      if (!note || !note.trim()) {
        return Response.json({ error: 'Note content required' }, { status: 400 });
      }

      const supportNote = await base44.asServiceRole.entities.SupportNote.create({
        organization_id: organization_id,
        created_by: user.email,
        note: note,
        severity: severity || 'info',
      });

      // Audit Log
      await base44.asServiceRole.entities.PlatformAuditLog.create({
        actor_email: user.email,
        actor_role: user.role,
        action: 'create_support_note',
        target_type: 'support_note',
        target_id: supportNote.id,
        organization_id: organization_id,
        parent_agency_id: org.parent_agency_id || null,
        metadata: JSON.stringify({ severity, note: note.substring(0, 100) }),
      });

      return Response.json({
        success: true,
        action: 'createSupportNote',
        support_note_id: supportNote.id,
      });
    }

    if (action === 'updateTrialStage') {
      if (!['free_preview', 'verified_trial', 'paid'].includes(trial_stage)) {
        return Response.json({ error: 'Invalid trial_stage' }, { status: 400 });
      }

      const oldStage = org.trial_stage || 'free_preview';

      // Update Organization trial_stage
      await base44.asServiceRole.entities.Organization.update(organization_id, {
        trial_stage: trial_stage,
      });

      // Audit Log
      await base44.asServiceRole.entities.PlatformAuditLog.create({
        actor_email: user.email,
        actor_role: user.role,
        action: 'update_trial_stage',
        target_type: 'organization',
        target_id: organization_id,
        organization_id: organization_id,
        parent_agency_id: org.parent_agency_id || null,
        metadata: JSON.stringify({ old_stage: oldStage, new_stage: trial_stage }),
        reason: `Admin changed trial_stage from ${oldStage} to ${trial_stage}`,
      });

      console.info(`[platformAdmin] updateTrialStage: ${organization_id} ${oldStage} → ${trial_stage}`);

      return Response.json({
        success: true,
        action: 'updateTrialStage',
        organization_id,
        trial_stage,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[platformAdmin]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});