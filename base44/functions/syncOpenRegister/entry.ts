import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Helper function for access control (same pattern as analyzeLeadEngine)
async function hasOrganizationAccess(base44, user, organizationId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organizationId });
  const organization = orgs[0] || null;
  if (!organization) return false;
  if (organization.owner_email === user.email) return true;
  const members = await base44.asServiceRole.entities.OrganizationMember.filter({
    organization_id: organizationId,
    user_email: user.email,
    status: "active",
  });
  return members.some(m => ['organization_admin', 'sales_rep'].includes(m.role));
}

// Normalize strings for deduplication
function normalizeString(str) {
  return str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}

// Calculate freshness score based on registration date
function calculateFreshnessScore(registrationDate) {
  if (!registrationDate) return 30;
  const daysSince = (Date.now() - new Date(registrationDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < 7) return 95;
  if (daysSince < 30) return 80;
  if (daysSince < 90) return 60;
  return 40;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
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
      console.error("[syncOpenRegister] OPENREGISTER_API_KEY is not configured.");
      return Response.json({ error: 'OPENREGISTER_API_KEY missing' }, { status: 500 });
    }

    // 3. Zugriff prüfen
    if (!(await hasOrganizationAccess(base44, user, organization_id))) {
      return Response.json({ error: 'Forbidden: Insufficient organization permissions' }, { status: 403 });
    }

    // 4. Parameter validieren
    const resolvedCity = city || null;
    const resolvedRadius = Math.min(Math.max(Number(radius_km || 25), 1), 100);
    const resolvedLimit = Math.min(Math.max(Number(limit || 25), 1), 50);
    const resolvedLegalForms = Array.isArray(legal_forms) && legal_forms.length
      ? legal_forms
      : ["GmbH", "UG", "GmbH & Co. KG"];
    const resolvedSinceDate = since_date || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // 5. OpenRegister API abrufen (PLACEHOLDER - muss mit echter API ersetzt werden)
    // Hinweis: Da die genaue OpenRegister-API-Dokumentation nicht vorliegt,
    // wird hier eine simulierte Antwort verwendet. In Produktion muss der echte
    // API-Endpoint mit korrekten Parametern verwendet werden.
    console.log(`[syncOpenRegister] Fetching from OpenRegister for city=${resolvedCity}, since=${resolvedSinceDate}`);
    
    // TODO: Echten API-Call implementieren wenn API-Dokumentation vorliegt
    // const response = await fetch(`https://api.openregister.de/v1/companies?city=${resolvedCity}&since=${resolvedSinceDate}`, {
    //   method: "GET",
    //   headers: {
    //     "Authorization": `Bearer ${OPENREGISTER_API_KEY}`,
    //     "Accept": "application/json"
    //   },
    //   signal: AbortSignal.timeout(15000)
    // });
    // if (!response.ok) { ... }
    // const apiData = await response.json();

    // Simulierte API-Antwort für MVP-Testing
    const apiResults = [
      {
        id: `reg-${Date.now()}-1`,
        name: "Beispiel Firma GmbH",
        legalForm: "GmbH",
        address: "Musterstraße 123, 10115 Berlin",
        city: "Berlin",
        registerNumber: "HRB 12345 B",
        registerCourt: "Amtsgericht Berlin (Charlottenburg)",
        registrationDate: new Date().toISOString()
      }
    ];

    const limitedResults = apiResults.slice(0, resolvedLimit);
    
    let importedCount = 0;
    let duplicateCount = 0;
    let outsideRadiusCount = 0;
    let unknownGeoCount = 0;
    const preview = [];

    for (const item of limitedResults) {
      const companyName = item.name || 'Unbekannt';
      const itemCity = item.city || resolvedCity;
      
      let matchStatus = "imported";
      let duplicateCompanyId = null;
      let radiusStatus = "unknown";
      let geoConfidence = "unknown";
      let distanceKm = null;

      // 6. Dedupe gegen ExternalCompanySource
      const existingExternal = await base44.asServiceRole.entities.ExternalCompanySource.filter({
        organization_id,
        source: "openregister",
        $or: [
          { source_id: item.id },
          { register_number: item.registerNumber }
        ]
      });

      if (existingExternal.length > 0) {
        matchStatus = "duplicate";
        duplicateCount++;
        console.log(`[syncOpenRegister] Duplicate in ExternalCompanySource: ${companyName}`);
      } else {
        // 7. Dedupe gegen Company
        const existingCompanies = await base44.asServiceRole.entities.Company.filter({
          organization_id,
          $or: [
            { name: companyName },
            { name: normalizeString(companyName) }
          ]
        });

        if (existingCompanies.length > 0) {
          matchStatus = "duplicate";
          duplicateCompanyId = existingCompanies[0].id;
          duplicateCount++;
          console.log(`[syncOpenRegister] Duplicate in Company: ${companyName}, ID: ${duplicateCompanyId}`);
        }
      }

      // 8. Radius-Status (in Schritt 3A noch ohne echte Koordinaten → unknown_geo)
      if (matchStatus !== "duplicate") {
        // OpenRegister liefert typischerweise keine Koordinaten in MVP
        // Daher erstmal unknown_geo
        radiusStatus = "unknown";
        geoConfidence = "unknown";
        matchStatus = "unknown_geo";
        unknownGeoCount++;
      } else if (matchStatus === "outside_radius") {
        outsideRadiusCount++;
      }

      // 9. Nur bei dry_run=false und nicht duplicate speichern
      if (!dry_run && matchStatus !== "duplicate") {
        await base44.asServiceRole.entities.ExternalCompanySource.create({
          organization_id,
          source: "openregister",
          source_id: item.id,
          raw_data: JSON.stringify(item),
          company_name: companyName,
          legal_form: item.legalForm,
          city: itemCity,
          address: item.address,
          register_number: item.registerNumber,
          register_court: item.registerCourt,
          registration_date: item.registrationDate,
          search_center_city: resolvedCity,
          radius_km: resolvedRadius,
          lat: null,
          lng: null,
          distance_km: distanceKm,
          geo_confidence: geoConfidence,
          radius_status: radiusStatus,
          enrichment_status: "pending",
          match_status: matchStatus,
          duplicate_company_id: duplicateCompanyId,
          freshness_score: calculateFreshnessScore(item.registrationDate),
          official_company_score: 70,
          local_match_score: 0,
          enrichment_confidence: 0,
          source_confidence: 70
        });
        importedCount++;
      }

      // Preview für Response (max 10)
      if (preview.length < 10) {
        preview.push({
          company_name: companyName,
          legal_form: item.legalForm,
          city: itemCity,
          registration_date: item.registrationDate,
          match_status: matchStatus,
          radius_status: radiusStatus,
          duplicate_company_id: duplicateCompanyId
        });
      }
    }

    return Response.json({
      success: true,
      dry_run: Boolean(dry_run),
      organization_id,
      imported_count: importedCount,
      duplicate_count: duplicateCount,
      outside_radius_count: outsideRadiusCount,
      unknown_geo_count: unknownGeoCount,
      preview,
      message: "Fresh lead source sync completed – Step 3A complete. Ready for geocoding/radius logic in Step 3B."
    });

  } catch (error) {
    console.error('[syncOpenRegister] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});