import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Helper function for access control (same pattern as analyzeLeadEngine)
async function hasOrganizationAccess(base44, user, organizationId) {
  if (!user) return false;
  if (user.role === 'admin') return true; // Platform admins have full access

  const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organizationId });
  const organization = orgs[0] || null;
  if (!organization) return false;

  // Organization owner always has access
  if (organization.owner_email === user.email) return true;

  // Check if user is an active member with appropriate role
  const members = await base44.asServiceRole.entities.OrganizationMember.filter({
    organization_id: organizationId,
    user_email: user.email,
    status: "active",
  });
  return members.some(m => ['organization_admin', 'sales_rep'].includes(m.role));
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // API-Key AUSSCHLIESSLICH aus Env laden - NIEMALS hardcoden
  const OPENREGISTER_API_KEY = Deno.env.get("OPENREGISTER_API_KEY");

  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      organization_id,
      city,
      radius_km,
      since_date,
      legal_forms,
      limit,
      dry_run = false
    } = body;

    // 1. Pflichtparameter prüfen
    if (!organization_id) {
      return Response.json({ error: 'Missing required parameter: organization_id' }, { status: 400 });
    }

    // 2. API-Key prüfen (NIEMALS loggen oder zurückgeben)
    if (!OPENREGISTER_API_KEY) {
      console.error("[syncOpenRegister] OPENREGISTER_API_KEY is not configured in environment.");
      return Response.json({ error: 'OPENREGISTER_API_KEY missing' }, { status: 500 });
    }

    // 3. Zugriff prüfen (wie bei analyzeLeadEngine)
    if (!(await hasOrganizationAccess(base44, user, organization_id))) {
      return Response.json({ error: 'Forbidden: Insufficient organization permissions' }, { status: 403 });
    }

    // 4. Parameter validieren und Defaults setzen
    const resolvedCity = city || null; // city ist Pflicht für MVP
    const resolvedRadius = typeof radius_km === 'number' ? radius_km : 25;
    const resolvedLimit = Math.min(typeof limit === 'number' ? limit : 50, 50); // Hart auf max. 50 begrenzt
    const resolvedLegalForms = Array.isArray(legal_forms) ? legal_forms : ["GmbH", "UG", "GmbH & Co. KG", "AG", "SE"];
    const resolvedSinceDate = since_date || null;

    // 5. In Schritt 2: KEINE echte API-Logik, KEINE Company-Erstellung
    // Nur Skelett-Response zurückgeben
    return Response.json({
      success: true,
      dry_run: Boolean(dry_run),
      organization_id,
      city: resolvedCity,
      radius_km: resolvedRadius,
      limit: resolvedLimit,
      legal_forms: resolvedLegalForms,
      since_date: resolvedSinceDate,
      message: "syncOpenRegister skeleton ready – API integration not implemented yet. Step 2 complete."
    });

  } catch (error) {
    console.error('[syncOpenRegister] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});