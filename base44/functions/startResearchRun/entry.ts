/**
 * startResearchRun
 * ================
 * Erstellt sofort einen ResearchRun mit status=queued und gibt zurück.
 * Keine Google-Schleife hier – nur Setup + Plan-Checks.
 *
 * TAXONOMIE-ARCHITEKTUR:
 * - Lädt Taxonomie via getTaxonomy (DB-Quelle, kanonisch).
 * - Bettet das Profil der gewählten Branche in search_plan_json ein.
 * - processResearchRun liest das Profil aus dem Plan → kein eigener DB-Call nötig.
 * - taxonomy_hash + taxonomy_version werden im ResearchRun gespeichert.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

const LEGACY_INDUSTRY_MAP = {
  "Gebäudereinigung":"gebaeudereinigung","Gartenbau / Gartenpflege":"gartenbau","Gartenbau":"gartenbau",
  "Hausmeisterdienst / Facility Service":"facility_service","Facility Service":"facility_service","Hausmeisterdienst":"facility_service",
  "Entrümpelung / Entsorgung":"entruempelung","Entrümpelung":"entruempelung",
  "Buchhaltung / Büroservice":"buchhaltung_steuernahe_dienste","Buchhaltung":"buchhaltung_steuernahe_dienste",
  "Maschinenwartung / Industrieservice":"industrieservice","Industrieservice":"industrieservice",
  "Sicherheitsdienst":"sicherheitsdienst","IT-Service":"it_service","Catering":"catering","Handwerk":"handwerk",
  "Spedition / Logistik":"spedition_logistik","Spedition":"spedition_logistik","Logistik":"spedition_logistik",
  "Gesundheit / Medizin":"gesundheit_medizin","Gesundheit":"gesundheit_medizin","Medizin":"gesundheit_medizin",
  "Immobilien":"immobilien","Lager / Fulfillment":"lager_fulfillment","Fulfillment":"lager_fulfillment",
  "Maler / Renovierung":"maler_renovierung","Maler":"maler_renovierung","Renovierung":"maler_renovierung",
  "Elektro / Gebäudetechnik":"elektro_gebaeudetechnik","Elektro":"elektro_gebaeudetechnik",
  "SHK / Sanitär / Heizung / Klima":"shk","SHK":"shk","Sanitär":"shk","Heizung":"shk",
  "Eventservice":"eventservice","Marketing / Webdesign / Werbung":"marketing_webdesign_werbung",
  "Marketing":"marketing_webdesign_werbung","Webdesign":"marketing_webdesign_werbung",
  "Personal / Zeitarbeit":"personal_zeitarbeit","Zeitarbeit":"personal_zeitarbeit",
  "Fuhrparkservice / Fahrzeugpflege":"fuhrparkservice_fahrzeugpflege","Fuhrparkservice":"fuhrparkservice_fahrzeugpflege",
  "Pflege / Betreuung":"pflege_betreuung","Pflege":"pflege_betreuung",
  "Schulungen / Weiterbildung":"schulungen_weiterbildung","Schulungen":"schulungen_weiterbildung",
};

function getPeriodMonth() {
  const n = new Date();
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth()+1).padStart(2,'0')}`;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function generateSearchGrid(centerLat, centerLng, radiusKm, trialStage) {
  const points = [{ lat: centerLat, lng: centerLng, label: 'center' }];
  if (trialStage === 'free_preview') return points;
  const stepKm = 15;
  const rings = radiusKm <= 20 ? 1 : radiusKm <= 40 ? 1 : 2;
  for (let ring = 1; ring <= rings; ring++) {
    const ringRadiusKm = ring * stepKm;
    const pointsInRing = 6 * ring;
    for (let i = 0; i < pointsInRing; i++) {
      const angle = (2 * Math.PI * i) / pointsInRing;
      const dLat = (ringRadiusKm / 111) * Math.cos(angle);
      const dLng = (ringRadiusKm / (111 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
      const pLat = centerLat + dLat, pLng = centerLng + dLng;
      if (haversineKm(centerLat, centerLng, pLat, pLng) <= radiusKm * 1.05) {
        points.push({ lat: pLat, lng: pLng, label: `grid_${ring}_${i}` });
      }
    }
  }
  return points;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht eingeloggt', success: false }, { status: 401 });

    const body = await req.json();
    const { organization_id, target_count = 25 } = body;
    if (!organization_id) return Response.json({ error: 'organization_id fehlt', success: false }, { status: 400 });

    // ── Access Check ────────────────────────────────────────────────────────
    const isPlatformAdmin = ["admin","platform_owner","platform_admin"].includes(user.role);
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    const org = orgs[0];
    if (!org) return Response.json({ error: 'Organisation nicht gefunden', success: false }, { status: 404 });

    if (!isPlatformAdmin) {
      if (org.platform_status === 'suspended') return Response.json({ error: 'organization_suspended', success: false }, { status: 403 });
      if (org.abuse_status === 'blocked') return Response.json({ error: 'abuse_blocked', success: false }, { status: 403 });
      const billingOk = ['preview','active','trialing'].includes(org.billing_status);
      if (!billingOk) return Response.json({ error: `Billing-Status "${org.billing_status}" nicht erlaubt.`, success: false }, { status: 402 });
    }

    // ── PlatformConfig ───────────────────────────────────────────────────────
    const configs = await base44.asServiceRole.entities.PlatformConfig.list();
    if (configs[0] && !configs[0].google_places_api_enabled) {
      return Response.json({
        success: false, error: 'service_temporarily_unavailable',
        message: configs[0].disabled_reason || 'Die Lead-Recherche ist gerade in Wartung.'
      }, { status: 503 });
    }

    const trialStage = org.trial_stage || 'free_preview';
    const remainingPreviewLeads = Math.max(0, 10 - (org.trial_leads_granted || 0));

    // ── Preview Limit ────────────────────────────────────────────────────────
    if (trialStage === 'free_preview') {
      if (remainingPreviewLeads <= 0) {
        return Response.json({
          success: false, error: 'trial_preview_limit_reached',
          message: 'Kostenlose Vorschau aufgebraucht.', trial_stage: trialStage
        }, { status: 403 });
      }
      // Rate-Limit: max 3 Runs pro 24h im Preview
      const last24h = new Date(Date.now() - 24*60*60*1000);
      const recentRuns = await base44.asServiceRole.entities.ResearchRun.filter({ organization_id }, '-created_date', 10);
      const runsLast24h = recentRuns.filter(r => new Date(r.created_date) >= last24h && r.status !== 'failed').length;
      if (runsLast24h >= 3) {
        return Response.json({
          success: false, error: 'free_preview_daily_limit',
          message: 'Kostenlose Vorschau-Recherchen für heute aufgebraucht.'
        }, { status: 429 });
      }
    }

    // ── Monthly Limit Check ──────────────────────────────────────────────────
    let monthlyContactLimit = -1;
    if (org.plan_id) {
      const plans = await base44.asServiceRole.entities.Plan.filter({ id: org.plan_id });
      if (plans[0]) monthlyContactLimit = plans[0].max_leads_per_month ?? 300;
    }
    if (monthlyContactLimit !== -1) {
      const periodMonth = getPeriodMonth();
      const usageLogs = await base44.asServiceRole.entities.UsageLog.filter({ organization_id, period_month: periodMonth });
      const used = usageLogs[0]?.leads_created || 0;
      if (used >= monthlyContactLimit) {
        return Response.json({
          success: false, error: 'monthly_contact_limit_reached',
          message: `Monatliches Limit von ${monthlyContactLimit} Firmenkontakten erreicht.`,
          monthly_usage: { monthly_limit: monthlyContactLimit, monthly_used: used, remaining: 0 }
        }, { status: 429 });
      }
    }

    // ── Settings Resolver ────────────────────────────────────────────────────
    const settingsRecords = await base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id });
    const settings = {};
    settingsRecords.forEach(s => { settings[s.key] = s.value; });

    const industry = settings.industry_name || settings.own_industry || settings.industry || org.industry || '';
    const city = org.service_area_city || settings.service_area_city || settings.lead_plz_city || settings.lead_plz || '';
    if (!city) return Response.json({ error: 'Kein Suchgebiet definiert.', success: false }, { status: 400 });

    const radiusKm = parseFloat(
      (org.service_area_radius_km > 0 ? org.service_area_radius_km : null) ||
      settings.service_area_radius_km || settings.lead_radius_km || '25'
    ) || 25;

    const targetCustomerTypes = (settings.target_customer_types || settings.zielkunden || '').split(/,|, /).map(x => x.trim()).filter(Boolean);
    const excludedCustomerTypes = (settings.excluded_customer_types || settings.zielkunden_ausschluss || '').split(/,|, /).map(x => x.trim()).filter(Boolean);

    // ── Koordinaten auflösen ─────────────────────────────────────────────────
    let cityCoords = null;
    const savedLat = parseFloat(settings.service_area_lat || settings.lead_lat || '0');
    const savedLng = parseFloat(settings.service_area_lng || settings.lead_lng || '0');
    if (savedLat && savedLng && Math.abs(savedLat) > 0.001) {
      cityCoords = { lat: savedLat, lng: savedLng };
    } else {
      if (!GOOGLE_PLACES_API_KEY) return Response.json({ error: 'GOOGLE_PLACES_API_KEY fehlt', success: false }, { status: 500 });
      const geoRes = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(city + ' Deutschland')}&key=${GOOGLE_PLACES_API_KEY}&language=de`);
      const geoData = await geoRes.json();
      const loc = geoData.results?.[0]?.geometry?.location;
      if (!loc) return Response.json({ error: `Stadt "${city}" nicht gefunden.`, success: false }, { status: 400 });
      cityCoords = { lat: loc.lat, lng: loc.lng };
    }

    // ── Zusatzorte ───────────────────────────────────────────────────────────
    let additionalCityObjects = [];
    if (settings.target_locations_json) {
      try {
        const parsed = JSON.parse(settings.target_locations_json);
        if (Array.isArray(parsed)) additionalCityObjects = parsed.filter(o => o && o.city);
      } catch {}
    }

    // ── Suchplan zusammenbauen ───────────────────────────────────────────────
    const effectiveTarget = trialStage === 'free_preview'
      ? Math.min(remainingPreviewLeads, 10)
      : Math.min(target_count, 25);

    // Grid-Punkte für alle Such-Zentren
    const mainGrid = generateSearchGrid(cityCoords.lat, cityCoords.lng, radiusKm, trialStage).map(p => ({
      ...p, centerLat: cityCoords.lat, centerLng: cityCoords.lng, centerCity: city
    }));

    const additionalPoints = [];
    for (const loc of additionalCityObjects.filter(o => o.lat && o.lng).slice(0, 4)) {
      const grid = generateSearchGrid(loc.lat, loc.lng, radiusKm, trialStage);
      for (const p of grid) {
        additionalPoints.push({ ...p, label: `extra_${loc.city}_${p.label}`, centerLat: loc.lat, centerLng: loc.lng, centerCity: loc.city });
      }
    }

    const allPoints = [...mainGrid, ...additionalPoints];
    const allCenters = [
      { lat: cityCoords.lat, lng: cityCoords.lng, city },
      ...additionalCityObjects.filter(o => o.lat && o.lng).map(o => ({ lat: o.lat, lng: o.lng, city: o.city }))
    ];

    // ── Taxonomie laden (kanonische DB-Quelle via getTaxonomy) ──────────────
    let taxonomyProfile = null;
    let taxonomyHash = null;
    let taxonomyVersion = null;

    const industryId = LEGACY_INDUSTRY_MAP[industry] || industry;
    try {
      const taxRes = await base44.functions.invoke('getTaxonomy', { action: 'get_single', industry_id: industryId });
      if (taxRes?.data?.success && taxRes.data.profile) {
        taxonomyProfile = taxRes.data.profile;
        // Für taxonomy_hash: lade alle Profile kurz
        const allTax = await base44.functions.invoke('getTaxonomy', { action: 'list' });
        taxonomyHash = allTax?.data?.taxonomy_hash || null;
        taxonomyVersion = allTax?.data?.version || null;
        console.info(`[startResearchRun] Taxonomie geladen: ${industryId} hash=${taxonomyHash}`);
      } else {
        console.warn(`[startResearchRun] Keine Taxonomie für Branche "${industry}" (id=${industryId})`);
      }
    } catch (taxErr) {
      console.error('[startResearchRun] Taxonomie-Ladefehler:', taxErr?.message);
      return Response.json({
        success: false,
        error: 'taxonomy_load_error',
        message: `Taxonomie konnte nicht geladen werden: ${taxErr?.message}. Bitte erneut versuchen.`,
      }, { status: 500 });
    }

    // FALLBACK: Wenn kein exaktes Profil → Fallback-Profil laden (verhindert Kundenpfad-Abbruch)
    // Für benutzerdefinierte Branchen ("Andere Branche") wird ein generisches Fallback-Profil genutzt.
    let usedFallbackProfile = false;
    if (!taxonomyProfile) {
      console.warn(`[startResearchRun] Kein exaktes Profil für "${industry}" (id=${industryId}) — versuche Fallback`);
      // Fallback-Strategie: fallback_lokaler_dienstleister als Basis
      const fallbackId = 'fallback_lokaler_dienstleister';
      try {
        const fbRes = await base44.functions.invoke('getTaxonomy', { action: 'get_single', industry_id: fallbackId });
        if (fbRes?.data?.success && fbRes.data.profile) {
          taxonomyProfile = fbRes.data.profile;
          usedFallbackProfile = true;
          console.info(`[startResearchRun] Fallback-Profil geladen: ${fallbackId}`);
        }
      } catch (fbErr) {
        console.error('[startResearchRun] Fallback-Profil Ladefehler:', fbErr?.message);
      }
    }

    // HARD FAIL: Auch Fallback nicht verfügbar
    if (!taxonomyProfile) {
      console.error(`[startResearchRun] taxonomy_profile_missing: industry="${industry}" industryId="${industryId}"`);
      return Response.json({
        success: false,
        error: 'taxonomy_profile_missing',
        message: `Kein Taxonomie-Profil für Branche "${industry}" (id="${industryId}"). Bitte Branche in den Einstellungen prüfen.`,
      }, { status: 400 });
    }

    // Custom-Industry-Tracking: Speichern wenn Nutzer "Andere Branche" oder unbekannte Branche nutzt
    if (usedFallbackProfile || industry === 'Andere Branche / Sonstiges' || !industryId) {
      try {
        const orgSettings = await base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id, key: 'custom_industry_requested' });
        const existing = orgSettings[0];
        const trackData = { industry_label: industry, industry_id_attempted: industryId, fallback_used: usedFallbackProfile, requested_at: new Date().toISOString() };
        if (existing) {
          await base44.asServiceRole.entities.OrganizationSettings.update(existing.id, { value: JSON.stringify(trackData) });
        } else {
          await base44.asServiceRole.entities.OrganizationSettings.create({ organization_id, key: 'custom_industry_requested', value: JSON.stringify(trackData) });
        }
        console.info(`[startResearchRun] Custom-Industry getrackt: ${industry}`);
      } catch {}
    }

    // ── Suchplan zusammenbauen (Taxonomie-Profil eingebettet) ────────────────
    const searchPlanData = {
      industry,
      industryId,
      usedFallbackProfile: usedFallbackProfile || false,
      city,
      radiusKm,
      radiusMeters: Math.min(radiusKm * 1000, 50000),
      targetCustomerTypes,
      excludedCustomerTypes,
      trialStage,
      cityCoords,
      allPoints,
      allCenters,
      effectiveTarget,
      remainingPreviewLeads,
      // Taxonomie-Profil eingebettet → processResearchRun braucht kein eigenes Inline-Objekt
      taxonomyProfile,
      taxonomyHash,
      taxonomyVersion,
    };

    // ── ResearchRun erstellen ────────────────────────────────────────────────
    const now = new Date().toISOString();
    const run = await base44.asServiceRole.entities.ResearchRun.create({
      organization_id,
      status: 'queued',
      requested_target: effectiveTarget,
      leads_saved: 0,
      duplicates_skipped: 0,
      no_match_count: 0,
      outside_radius_count: 0,
      raw_hits: 0,
      progress_percent: 0,
      batch_index: 0,
      current_step: 'Recherche wird gestartet…',
      search_center_city: city,
      search_radius_km: radiusKm,
      target_customer_types: targetCustomerTypes.join(', '),
      excluded_customer_types: excludedCustomerTypes.join(', '),
      search_plan_json: JSON.stringify(searchPlanData),
      seen_place_ids: JSON.stringify([]),
      started_at: now,
      created_by: user.email,
      // Taxonomie-Metadaten direkt im Run
      taxonomy_version: taxonomyVersion || 'unknown',
      taxonomy_hash: taxonomyHash || 'unknown',
      industry_id: industryId,
    });

    console.info(`[startResearchRun] Created run=${run.id} org=${organization_id} target=${effectiveTarget} city=${city}`);

    return Response.json({
      success: true,
      research_run_id: run.id,
      status: 'queued',
      message: 'Recherche gestartet. Erste Kontakte erscheinen automatisch in Ihrer Leadliste.',
      effectiveTarget,
      searchConfig: { city, radiusKm, trialStage, targetCustomerTypes: targetCustomerTypes.slice(0, 3) }
    });

  } catch (error) {
    console.error('[startResearchRun] Error:', error?.message, error?.stack);
    return Response.json({ error: error?.message || 'Unbekannter Fehler', success: false }, { status: 500 });
  }
});