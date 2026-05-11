import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { company_id, organization_id } = await req.json();
    if (!company_id || !organization_id) {
      return Response.json({ error: 'missing_params' }, { status: 400 });
    }

    // Prüfen: User gehört zur Organisation und ist Admin
    const members = await base44.asServiceRole.entities.OrganizationMember.filter({
      organization_id,
      user_email: user.email,
      status: 'active',
    });

    const isAdmin =
      user.role === 'admin' ||
      members.some(m => ['admin', 'organization_admin'].includes(m.role));

    if (!isAdmin) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }

    // Prüfen: Firma gehört zur Organisation
    const companies = await base44.asServiceRole.entities.Company.filter({
      id: company_id,
      organization_id,
    });

    if (!companies.length) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    // Löschen mit Service Role
    await base44.asServiceRole.entities.Company.delete(company_id);

    console.log(`[deleteCompany] OK: user=${user.email} company=${company_id} org=${organization_id}`);
    return Response.json({ success: true });

  } catch (error) {
    console.error('[deleteCompany] Fehler:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});