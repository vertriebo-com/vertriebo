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

    // 5a. dry_run=false blockieren bis Endpoint verifiziert
    if (!dry_run) {
      return Response.json({
        error: "dry_run=false is blocked until OpenRegister endpoint is verified",
        reason: "endpoint_not_verified",
        hint: "Use dry_run=true for testing. Set dry_run=false only after endpoint verification."
      }, { status: 409 });
    }

    // 6. Echten OpenRegister API-Call (VERIFIED_DRY_RUN_ONLY)
    const OPENREGISTER_BASE_URL = "https://api.openregister.de";
    
    // apiResults initialisieren
    let apiResults = [];
    let skippedCount = 0;

    console.log(`[syncOpenRegister] VERIFIED_DRY_RUN_ONLY mode for city=${resolvedCity}, radius=${resolvedRadius}km`);
    
    // Timeout für API-Call (15 Sekunden)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(`${OPENREGISTER_BASE_URL}/v1/search/company`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENREGISTER_API_KEY}`
        },
        body: JSON.stringify({
          query: { value: resolvedCity },
          filters: [
            { field: "city", value: resolvedCity },
            { field: "legal_form", values: resolvedLegalForms.map(lf => lf.toLowerCase()) },
            { field: "incorporated_at", min: resolvedSinceDate }
          ],
          pagination: { per_page: resolvedLimit }
        }),
        signal: controller.signal
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return Response.json({ error: "OpenRegister request timeout", reason: "openregister_timeout" }, { status: 504 });
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("[syncOpenRegister] OpenRegister API error", { status: response.status });
      return Response.json({
        error: `OpenRegister API error: ${response.status} ${response.statusText}`,
        status: response.status
      }, { status: response.status });
    }

    const searchData = await response.json();
    console.log(`[syncOpenRegister] OpenRegister response: ${searchData.results?.length || 0} companies found`);

    // Response in unser Format mappen (DEFENSIV)
    apiResults = (searchData.results || []).map(item => {
      // Defensives Mapping - wenn sourceId oder name fehlen, überspringen
      const sourceId = item.company_id || item.id || item.register_number || item.slug;
      const companyName = item.name || item.company_name || item.current_name;
      
      if (!sourceId || !companyName) {
        skippedCount++;
        return null;
      }

      return {
        id: sourceId,
        name: companyName,
        legalForm: item.legal_form || null,
        address: item.address || null,
        city: item.city || null,
        zip: item.zip || null,
        registerNumber: item.register_number || null,
        registerCourt: item.register_court || null,
        registrationDate: item.incorporated_at || null,
        active: item.active !== undefined ? item.active : true,
        registerType: item.register_type || null
      };
    }).filter(item => item !== null); // Null-Einträge entfernen (skipped)

    const limitedResults = apiResults.slice(0, resolvedLimit);
    
    let matchedCount = 0;
    let duplicateCount = 0;
    let unknownGeoCount = 0;
    const preview = [];

    for (const item of limitedResults) {
      const companyName = item.name;
      const itemCity = item.city || resolvedCity;
      
      let matchStatus = "matched";
      let duplicateCompanyId = null;

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

      // 10. Radius-Status (KEINE Radius-Logik - nur unknown_geo)
      if (matchStatus !== "duplicate") {
        unknownGeoCount++;
      }

      matchedCount++;

      // Preview für Response (max 10)
      if (preview.length < 10) {
        preview.push({
          company_name: companyName,
          legal_form: item.legalForm,
          city: itemCity,
          registration_date: item.registrationDate,
          match_status: matchStatus,
          duplicate_company_id: duplicateCompanyId,
          freshness_score: calculateFreshnessScore(item.registrationDate)
        });
      }
    }

    return Response.json({
      success: true,
      dry_run: Boolean(dry_run),
      verified_dry_run_only: true,
      endpoint_verified: false,
      organization_id,
      city: resolvedCity,
      radius_km: resolvedRadius,
      limit: resolvedLimit,
      matched_count: matchedCount,
      duplicate_count: duplicateCount,
      unknown_geo_count: unknownGeoCount,
      skipped_count: skippedCount,
      preview_count: preview.length,
      preview,
      message: dry_run 
        ? "Dry-run preview completed. Endpoint not verified yet - no data saved."
        : "ERROR: dry_run=false is blocked until endpoint is verified. Use dry_run=true for testing."
    });

  } catch (error) {
    console.error('[syncOpenRegister] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/*
VERIFIED_DRY_RUN_ONLY STATUS:
- ✅ API-Key aus Env (nicht hardcoded)
- ✅ Fetch mit 15s Timeout + AbortController
- ✅ Error-Logging entschärft (nur Status, keine sensiblen Daten)
- ✅ dry_run=false blockiert bis Endpoint verifiziert
- ✅ Defensives Response-Mapping (sourceId/name required)
- ✅ Missing entries werden übersprungen + gezählt
- ✅ Kein misleading imported_count → matched_count + preview_count
- ✅ KEINE Speicherung in ExternalCompanySource
- ✅ KEINE Company-Erstellung
- ✅ Radius-Status korrekt als "unknown" benannt
- ✅ Endpoint/Schema NICHT als verifiziert markiert

NEXT STEP: Test mit dry_run=true um Endpoint + Response zu verifizieren
*/