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
      prompt: `Recherchiere folgende Firma im Internet und gib mir die offiziellen Kontaktdaten zurück.

Firmenname: ${company.name}
Ort: ${company.ort || 'Neuwied'} ${company.plz || ''}
Branche: ${company.branche || 'Unbekannt'}

WICHTIG: Gib nur Felder zurück, die du mit Sicherheit gefunden hast. Wenn du ein Feld nicht findest, lasse es komplett weg (leerer String). Schreibe NIEMALS das Wort "null" in ein Feld. Nur echte, verifizierte Daten.`,
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

    // Only update fields that were empty and now have a real string value (not null, "null", "N/A" etc.)
    const isValid = (v) => v && typeof v === "string" && v.trim().length > 0 && !["null", "n/a", "unbekannt", "keine", "nicht gefunden"].includes(v.trim().toLowerCase());

    const updates = {};
    if (!company.website && isValid(result.website)) updates.website = result.website.trim();
    if (!company.telefon && isValid(result.telefon)) updates.telefon = result.telefon.trim();
    if (!company.email && isValid(result.email)) updates.email = result.email.trim();
    if (!company.ansprechpartner && isValid(result.ansprechpartner)) updates.ansprechpartner = result.ansprechpartner.trim();
    if (!company.adresse && isValid(result.adresse)) updates.adresse = result.adresse.trim();

    if (Object.keys(updates).length > 0) {
      await base44.entities.Company.update(companyId, updates);
    }

    return Response.json({ updates, found: Object.keys(updates).length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});