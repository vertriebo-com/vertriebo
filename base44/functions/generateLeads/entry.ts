import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const count = body.count || 25;
    const assignTo = body.assign_to || user.email;

    // Get existing companies for duplicate check
    const existingCompanies = await base44.asServiceRole.entities.Company.list('-created_date', 1000);
    const existingNames = new Set(existingCompanies.map(c => c.name?.toLowerCase()));

    // Get blacklist
    const blacklist = await base44.asServiceRole.entities.Blacklist.list('-created_date', 500);
    const blacklistNames = new Set(blacklist.map(b => b.firmenname?.toLowerCase()));

    // Generate leads using LLM
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Generiere ${count} realistische, aber fiktive Firmennamen und Daten für Firmen im Umkreis von 25 km um Neuwied (PLZ 56564), Deutschland. 
      Die Firmen sollen aus verschiedenen Branchen stammen, die typische Kunden für einen Gebäudedienstleister wären (z.B. Bürogebäude, Hotels, Arztpraxen, Einzelhandel, Restaurants, Banken, Versicherungen, Autohäuser, etc.).
      
      Folgende Orte liegen im Umkreis von 25km um Neuwied: Koblenz, Andernach, Bendorf, Bad Hönningen, Linz am Rhein, Dierdorf, Puderbach, Rengsdorf, Asbach, Unkel, Remagen, Sinzig, Bad Breisig, Vallendar, Höhr-Grenzhausen, Ransbach-Baumbach.
      
      Für jede Firma generiere:
      - name: Firmenname (deutsch, realistisch)
      - branche: Branche
      - adresse: Straße + Hausnummer
      - plz: PLZ (reale PLZ aus der Region)
      - ort: Ortsname aus der Region
      - telefon: Telefonnummer im Format 02631/XXXXX oder 0261/XXXXX etc.
      - email: E-Mail Adresse
      - website: Website URL
      - ansprechpartner: Vor- und Nachname
      - latitude: Breitengrad (realistisch für die Region um 50.4-50.6)
      - longitude: Längengrad (realistisch für die Region um 7.3-7.7)
      - entfernung_km: geschätzte Entfernung zu Neuwied in km (max 25)`,
      response_json_schema: {
        type: "object",
        properties: {
          companies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                branche: { type: "string" },
                adresse: { type: "string" },
                plz: { type: "string" },
                ort: { type: "string" },
                telefon: { type: "string" },
                email: { type: "string" },
                website: { type: "string" },
                ansprechpartner: { type: "string" },
                latitude: { type: "number" },
                longitude: { type: "number" },
                entfernung_km: { type: "number" }
              }
            }
          }
        }
      }
    });

    const companies = result.companies || [];
    
    // Get current week number
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);

    // Create weekly batch
    const batch = await base44.asServiceRole.entities.WeeklyBatch.create({
      kalenderwoche: weekNumber,
      jahr: now.getFullYear(),
      anzahl_firmen: 0,
      assigned_to: assignTo,
      status: "Offen"
    });

    let created = 0;
    let skipped = 0;

    for (const company of companies) {
      if (!company.name) continue;
      const nameL = company.name.toLowerCase();
      
      if (existingNames.has(nameL) || blacklistNames.has(nameL)) {
        skipped++;
        continue;
      }

      await base44.asServiceRole.entities.Company.create({
        ...company,
        status: "Neu",
        quelle: "Automatisch",
        assigned_to: assignTo,
        weekly_batch_id: batch.id,
      });
      
      existingNames.add(nameL);
      created++;
    }

    // Update batch count
    await base44.asServiceRole.entities.WeeklyBatch.update(batch.id, { 
      anzahl_firmen: created 
    });

    return Response.json({
      success: true,
      batch_id: batch.id,
      created,
      skipped,
      total_generated: companies.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});