import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Setup Platform Accounts (admin@vertriebo.com, support@vertriebo.com)
 * This function prepares invites for the new platform accounts.
 * Call with: base44.functions.invoke('setupPlatformAccounts', {})
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({
        status: 'error',
        message: 'Only Base44 admin can setup platform accounts',
      }, { status: 403 });
    }

    const result = {
      status: 'ok',
      adminVertrieboUserExists: false,
      supportVertrieboUserExists: false,
      adminVertrieboInviteCreated: false,
      supportVertrieboInviteCreated: false,
      backendSlidebnbStatus: null,
      readyForAdminCenter: false,
    };

    // Check if accounts exist
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminVertrieboExists = allUsers.some(u => u.email === 'admin@vertriebo.com');
    const supportVertrieboExists = allUsers.some(u => u.email === 'support@vertriebo.com');
    const backendSlidebnbUser = allUsers.find(u => u.email === 'backend@slidebnb.de');

    result.adminVertrieboUserExists = adminVertrieboExists;
    result.supportVertrieboUserExists = supportVertrieboExists;
    result.backendSlidebnbStatus = {
      email: 'backend@slidebnb.de',
      role: backendSlidebnbUser?.role || 'unknown',
      exists: !!backendSlidebnbUser,
    };

    // If accounts don't exist, user needs to register them first
    if (!adminVertrieboExists) {
      result.adminVertrieboInstructions = {
        step1: "User muss sich unter https://app.vertriebo.com mit admin@vertriebo.com registrieren",
        step2: "Passwort selbst setzen (wird nicht im Code gespeichert)",
        step3: "Nach Registration kann ich die Rolle 'platform_owner' zuweisen",
        estimatedTime: "~2 Minuten"
      };
    }

    if (!supportVertrieboExists) {
      result.supportVertrieboInstructions = {
        step1: "User muss sich unter https://app.vertriebo.com mit support@vertriebo.com registrieren",
        step2: "Passwort selbst setzen (wird nicht im Code gespeichert)",
        step3: "Nach Registration kann ich die Rolle 'support_agent' zuweisen",
        estimatedTime: "~2 Minuten"
      };
    }

    // Verify noreply doesn't exist
    const noreplyExists = allUsers.some(u => u.email === 'noreply@vertriebo.com');
    result.noreplyUserExists = noreplyExists;
    if (noreplyExists) {
      result.warnings = ['noreply@vertriebo.com sollte nicht als User existieren - nur als System-Absender'];
    }

    // Ready check
    result.readyForAdminCenter = backendSlidebnbUser?.role === 'admin' && 
                                (adminVertrieboExists || result.adminVertrieboInstructions) &&
                                (supportVertrieboExists || result.supportVertrieboInstructions);

    console.info('[setupPlatformAccounts] Result:', JSON.stringify(result, null, 2));
    return Response.json(result);
  } catch (error) {
    console.error('[setupPlatformAccounts] Error:', error.message);
    return Response.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
});