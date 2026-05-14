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

// Calculate freshness score based on registration date (0-100 scale)
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

    // 2. city ist PFLICHT für MVP
    if (!city || !String(city).trim()) {
      return Response.json({ error: 'Missing required parameter: city' }, { status: 400 });
    }
    const resolvedCity = String(city).trim();

    // 3. API-Key prüfen (NIEMALS loggen oder zurückgeben)
    if (!OPENREGISTER_API_KEY) {
      console.error("[syncOpenRegister] OPENREGISTER_API_KEY is not configured.");
      return Response.json({ error: 'OPENREGISTER_API_KEY missing' }, { status: 500 });
    }

    // 4. Zugriff prüfen
    if (!(await hasOrganizationAccess(base44, user, organization_id))) {
      return Response.json({ error: 'Forbidden: Insufficient organization permissions' }, { status: 403 });
    }

    // 5. Parameter validieren
    const resolvedRadius = Math.min(Math.max(Number(radius_km || 25), 1), 100);
    const resolvedLimit = Math.min(Math.max(Number(limit || 25), 1), 50);
    const resolvedLegalForms = Array.isArray(legal_forms) && legal_forms.length
      ? legal_forms
      : ["GmbH", "UG", "GmbH & Co. KG"];
    const resolvedSinceDate = since_date || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // 6. Echten API-Call prüfen – SICHERHEIT: Simulation NUR mit dry_run
    const isEndpointImplemented = false; // TODO: Auf true setzen wenn Endpoint ready
    
    // apiResults initialisieren
    let apiResults = [];

    // Wenn Endpoint nicht implementiert ist: NUR dry_run erlaubt
    if (!isEndpointImplemented) {
      if (!dry_run) {
        return Response.json({
          error: "OpenRegister endpoint not implemented yet – simulation requires dry_run=true",
          reason: "real_endpoint_required",
          hint: "Use dry_run=true for testing simulation, or implement the real endpoint."
        }, { status: 501 });
      }
      
      // dry_run=true: Simulation nur für Preview, nichts speichern
      console.log(`[syncOpenRegister] DRY_RUN mode for city=${resolvedCity}, radius=${resolvedRadius}km`);
      apiResults = [
        {
          id: `reg-sim-1`,
          name: "Beispiel Firma GmbH",
          legalForm: "GmbH",
          address: "Musterstraße 123, 10115 Berlin",
          city: "Berlin",
          registerNumber: "HRB 12345 B",
          registerCourt: "Amtsgericht Berlin (Charlottenburg)",
          registrationDate: new Date().toISOString()
        }
      ];
    } else {
      // TODO: Echten API-Call implementieren wenn API-Dokumentation vorliegt
      console.log(`[syncOpenRegister] LIVE mode for city=${resolvedCity}`);
      apiResults = [];
    }

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

      // 8. Dedupe gegen ExternalCompanySource (separate Queries für Base44-Kompatibilität)
      let isDuplicate = false;
      
      // Check by source_id
      const existingBySourceId = await base44.asServiceRole.entities.ExternalCompanySource.filter({
        organization_id,
        source: "openregister",
        source_id: item.id
      });
      
      if (existingBySourceId.length > 0) {
        isDuplicate = true;
        console.log(`[syncOpenRegister] Duplicate by source_id: ${companyName}`);
      } else {
        // Check by register_number (separate query)
        const existingByRegisterNumber = await base44.asServiceRole.entities.ExternalCompanySource.filter({
          organization_id,
          source: "openregister",
          register_number: item.registerNumber
        });
        
        if (existingByRegisterNumber.length > 0) {
          isDuplicate = true;
          console.log(`[syncOpenRegister] Duplicate by register_number: ${companyName}`);
        }
      }

      if (isDuplicate) {
        matchStatus = "duplicate";
        duplicateCount++;
      } else {
        // 9. Dedupe gegen Company (separate Queries)
        const existingCompaniesByName = await base44.asServiceRole.entities.Company.filter({
          organization_id,
          name: companyName
        });

        if (existingCompaniesByName.length > 0) {
          matchStatus = "duplicate";
          duplicateCompanyId = existingCompaniesByName[0].id;
          duplicateCount++;
          console.log(`[syncOpenRegister] Duplicate in Company: ${companyName}, ID: ${duplicateCompanyId}`);
        }
      }

      // 10. Radius-Status (in Schritt 3A noch ohne echte Koordinaten → unknown_geo)
      if (matchStatus !== "duplicate") {
        radiusStatus = "unknown";
        geoConfidence = "unknown";
        matchStatus = "unknown_geo";
        unknownGeoCount++;
      }

      // 11. NICHT speichern wenn dry_run – Simulation darf nie in DB landen
      if (!dry_run && matchStatus !== "duplicate") {
        // Dieser Block wird nur ausgeführt wenn isEndpointImplemented=true
        // Da isEndpointImplemented aktuell false, wird hier nie gespeichert
        console.warn(`[syncOpenRegister] Would save ${companyName} but endpoint not implemented – skipping`);
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
          duplicate_company_id: duplicateCompanyId,
          freshness_score: calculateFreshnessScore(item.registrationDate)
        });
      }
    }

    return Response.json({
      success: true,
      dry_run: Boolean(dry_run),
      simulated: !isEndpointImplemented,
      organization_id,
      city: resolvedCity,
      radius_km: resolvedRadius,
      limit: resolvedLimit,
      imported_count: importedCount,
      duplicate_count: duplicateCount,
      outside_radius_count: outsideRadiusCount,
      unknown_geo_count: unknownGeoCount,
      preview,
      message: !isEndpointImplemented
        ? "Dry-run simulation only – real OpenRegister endpoint not implemented yet. No data saved."
        : "Fresh lead source sync completed."
    });

  } catch (error) {
    console.error('[syncOpenRegister] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});