import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { companyId } = await req.json();
    const companies = await base44.entities.Company.filter({ id: companyId });
    const company = companies[0];
    if (!company) return Response.json({ error: 'Firma nicht gefunden' }, { status: 404 });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Recherchiere folgende Firma und gib mir fehlende Kontaktdaten zurück.

Firmenname: ${company.name}
Ort: ${company.ort || 'Neuwied'} ${company.plz || ''}
Branche: ${company.branche || 'Unbekannt'}
Bekannte Website: ${company.website || 'unbekannt'}
Bekannte Telefon: ${company.telefon || 'unbekannt'}
Bekannte E-Mail: ${company.email || 'unbekannt'}

Suche die offiziellen Kontaktdaten dieser Firma. Gib nur Daten zurück die du mit hoher Sicherheit gefunden hast, keine Vermutungen. Wenn du etwas nicht findest, gib null zurück.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          website: { type: "string" },
          telefon: { type: "string" },
          email: { type: "string" },
          ansprechpartner: { type: "string" },
          adresse: { type: "string" },
        }
      }
    });

    // Only update fields that were empty and now have data
    const updates = {};
    if (!company.website && result.website) updates.website = result.website;
    if (!company.telefon && result.telefon) updates.telefon = result.telefon;
    if (!company.email && result.email) updates.email = result.email;
    if (!company.ansprechpartner && result.ansprechpartner) updates.ansprechpartner = result.ansprechpartner;
    if (!company.adresse && result.adresse) updates.adresse = result.adresse;

    if (Object.keys(updates).length > 0) {
      await base44.entities.Company.update(companyId, updates);
    }

    return Response.json({ updates, found: Object.keys(updates).length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});