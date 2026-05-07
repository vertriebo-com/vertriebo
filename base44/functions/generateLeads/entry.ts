import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Inline checkAccess ───────────────────────────────────────────────────────
const ACTION_ROLES = {
  view_leads: ['organization_admin','sales_rep'], create_lead: ['organization_admin','sales_rep'],
  update_assigned_lead: ['organization_admin','sales_rep'], delete_lead: ['organization_admin'],
  generate_leads: ['organization_admin'], create_contact_log: ['organization_admin','sales_rep'],
  view_tasks: ['organization_admin','sales_rep'], complete_task: ['organization_admin','sales_rep'],
  manage_users: ['organization_admin'], manage_settings: ['organization_admin'],
  manage_billing: ['organization_admin'], data_export: ['organization_admin'],
  view_reports: ['organization_admin','sales_rep'], use_ai_scoring: ['organization_admin','sales_rep'],
  send_bulk_email: ['organization_admin','sales_rep'], manage_blacklist: ['organization_admin'],
  platform_admin_access: [],
};
const BILLING_ACCESS = { active:'full', trialing:'full', past_due:'degraded', incomplete:'degraded', unpaid:'blocked', canceled:'blocked', incomplete_expired:'blocked' };
const DEGRADED_BLOCKED = new Set(['create_lead','generate_leads','use_ai_scoring','send_bulk_email']);
const BLOCKED_ADMIN_OK = new Set(['manage_billing','data_export']);
const DEGRADED_SALES_OK = new Set(['view_leads','view_tasks','create_contact_log','update_assigned_lead','complete_task']);

function _allow(r) { return { allowed:true, ...r }; }
function _deny(reason, message, ctx={}) { return { allowed:false, reason, message, user:ctx.user||null, organization:ctx.organization||null, member:ctx.member||null, role:ctx.role||null, plan:ctx.plan||null, subscription:ctx.subscription||null, limits:ctx.limits||null }; }

async function checkAccess(req, { organization_id, action, check_limit=null, current_usage=0 }={}) {
  const b44 = createClientFromRequest(req);
  let user; try { user = await b44.auth.me(); } catch { return _deny('not_authenticated','Nicht eingeloggt.'); }
  if (!user) return _deny('not_authenticated','Nicht eingeloggt.');
  if (user.role === 'admin') return _allow({ reason:'platform_admin', user, organization:null, member:null, role:'platform_admin', plan:null, subscription:null, limits:null });
  if (!organization_id) return _deny('missing_organization_id','Keine organization_id angegeben.');
  let orgs, members;
  try { [orgs, members] = await Promise.all([b44.asServiceRole.entities.Organization.filter({id:organization_id}), b44.asServiceRole.entities.OrganizationMember.filter({organization_id, user_email:user.email})]); }
  catch { return _deny('organization_not_found','Organisation nicht gefunden.'); }
  const organization = orgs[0]||null;
  if (!organization) return _deny('organization_not_found','Organisation nicht gefunden.');
  if (organization.status==='suspended') return _deny('organization_suspended',`Organisation gesperrt: ${organization.suspended_reason||'kein Grund'}.`);
  const member = members[0]||null;
  if (!member) return _deny('not_a_member','Kein Mitglied dieser Organisation.');
  if (member.status!=='active') return _deny('member_inactive',`Mitglied-Status: "${member.status}".`);
  const role = member.role;
  if (action) {
    const ar = ACTION_ROLES[action];
    if (ar===undefined) return _deny('unknown_action',`Unbekannte Aktion: "${action}".`);
    if (!ar.includes(role)) return _deny('insufficient_role',`Rolle "${role}" darf "${action}" nicht.`);
  }
  const [subs, plans] = await Promise.all([b44.asServiceRole.entities.Subscription.filter({organization_id}), organization.plan_id ? b44.asServiceRole.entities.Plan.filter({id:organization.plan_id}) : Promise.resolve([])]);
  const subscription=subs[0]||null, plan=plans[0]||null;
  const billingStatus = subscription?.status || organization.billing_status || 'trialing';
  const billingAccess = BILLING_ACCESS[billingStatus]||'blocked';
  if (action && billingAccess!=='full') {
    const ctx={user,organization,member,role,plan,subscription,limits:null};
    if (billingAccess==='blocked') {
      if (role==='organization_admin' && BLOCKED_ADMIN_OK.has(action)) { /* ok */ }
      else if (role==='sales_rep') return _deny('billing_blocked_sales_rep',`Abo "${billingStatus}": Kein Zugriff für Sales Rep.`,ctx);
      else return _deny('billing_blocked',`Abo "${billingStatus}": Zugriff gesperrt.`,ctx);
    }
    if (billingAccess==='degraded') {
      if (DEGRADED_BLOCKED.has(action)) return _deny('billing_degraded_action_blocked',`Abo "${billingStatus}": "${action}" nicht verfügbar.`,ctx);
      if (role==='sales_rep' && !DEGRADED_SALES_OK.has(action)) return _deny('billing_degraded_sales_rep',`Abo "${billingStatus}": Sales Rep darf "${action}" nicht.`,ctx);
    }
  }
  let limits = null;
  if (plan) {
    limits = { max_users:plan.max_users, max_leads_per_month:plan.max_leads_per_month, max_ai_scorings_per_month:plan.max_ai_scorings_per_month, max_emails_per_month:plan.max_emails_per_month, max_lead_generations_per_month:plan.max_lead_generations_per_month };
    if (check_limit && limits[check_limit]!==undefined) {
      const maxVal=limits[check_limit];
      if (maxVal!==-1 && current_usage>=maxVal) return _deny('plan_limit_exceeded',`Limit "${check_limit}": ${current_usage}/${maxVal}.`,{user,organization,member,role,plan,subscription,limits});
    }
  }
  return _allow({ reason:'ok', user, organization, member, role, plan, subscription, limits });
}
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_LAT = 50.4265;
const DEFAULT_LNG = 7.4620;
const DEFAULT_RADIUS_METERS = 40000;

const BUSINESS_TYPES = [
  "real_estate_agency","doctor","dentist","lawyer","accounting","general_contractor",
  "storage","car_dealer","insurance_agency","bank","office","moving_company",
  "electrician","plumber","software","computer_store","electronics_store",
];
const KEYWORD_SEARCHES = [
  "Druckerei","Metallbau","Metallverarbeitung","Spedition","Logistik",
  "Immobilienverwaltung","Architekturbüro","Steuerberatung","Lagerhaus",
  "IT Unternehmen","Softwareunternehmen","IT Dienstleister","Systemhaus","Webdesign Agentur",
];
const TYPE_MAP = {
  real_estate_agency:"Immobilienverwaltung", doctor:"Arztpraxis", dentist:"Zahnarztpraxis",
  lawyer:"Kanzlei / Architekt", accounting:"Steuerberatung / Büro", general_contractor:"Baufirma",
  storage:"Lager / Logistik", car_dealer:"Autohaus / Kfz-Betrieb", insurance_agency:"Versicherung / Büro",
  bank:"Bank / Finanzdienstleister", office:"Bürogebäude", moving_company:"Spedition / Logistik",
  electrician:"Handwerksbetrieb", plumber:"Handwerksbetrieb",
  software:"IT / Software", computer_store:"IT / Software", electronics_store:"IT / Elektronik",
};
const EXCLUDED_TYPES = new Set(["lodging","hotel","motel","hostel","resort","guest_house","bed_and_breakfast"]);
const EXCLUDED_NAMES = ["hotel","motel","hostel","pension ","gasthof","gasthaus"];

function calcDistance(lat1,lng1,lat2,lng2) {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))*10)/10;
}
async function fetchPlaces(apiKey,type,keyword,lat,lng,radiusMeters) {
  let url=`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&key=${apiKey}`;
  if (keyword) url+=`&keyword=${encodeURIComponent(keyword)}`; else url+=`&type=${type}`;
  return (await fetch(url)).json();
}
async function getPlaceDetails(apiKey,placeId) {
  const url=`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,geometry,types,user_ratings_total,rating&key=${apiKey}`;
  return ((await (await fetch(url)).json()).result)||null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { organization_id, count, assign_to } = body;

    // ── 1. Aktuellen Usage für Limit-Check vorab laden ──────────────────────
    if (!organization_id) return Response.json({ error: 'organization_id ist Pflichtparameter' }, { status: 400 });
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59).toISOString();
    let currentUsageLogs = [];
    try { currentUsageLogs = await base44.asServiceRole.entities.UsageLog.filter({ organization_id, period_start: periodStart }); } catch(_) {}
    const usageLog = currentUsageLogs[0] || null;
    const currentGenerations = usageLog?.lead_generations_used || 0;
    const currentLeadsCreated = usageLog?.leads_created || 0;

    // ── 2. checkAccess: Recherche-Läufe prüfen ──────────────────────────────
    const access = await checkAccess(req, { organization_id, action:'generate_leads', check_limit:'max_lead_generations_per_month', current_usage:currentGenerations });
    if (!access.allowed) {
      console.warn(`[generateLeads] Access denied (generations): ${access.reason}`);
      return Response.json({ error: access.message, reason: access.reason }, { status: 403 });
    }

    // ── 2b. Recherche-Credits prüfen (max_leads_per_month) ───────────────────
    //   1 Recherche-Credit = 1 recherchierter Firmenkontakt
    //   max_leads_per_month begrenzt die Gesamtanzahl der Kontakte pro Monat
    const plan = access.plan;
    const targetCount = count || 25;
    if (plan && plan.max_leads_per_month !== -1) {
      const remaining = plan.max_leads_per_month - currentLeadsCreated;
      if (remaining <= 0) {
        console.warn(`[generateLeads] Keine Recherche-Credits mehr: ${currentLeadsCreated}/${plan.max_leads_per_month}`);
        return Response.json({
          error: `Keine Recherche-Credits mehr verfügbar. Limit: ${plan.max_leads_per_month}/Monat, verbraucht: ${currentLeadsCreated}.`,
          reason: 'research_credits_exhausted',
          used: currentLeadsCreated,
          limit: plan.max_leads_per_month,
        }, { status: 403 });
      }
      // Anzahl der zu generierenden Leads auf verbleibende Credits begrenzen
      if (remaining < targetCount) {
        console.info(`[generateLeads] Credits-Cap: Nur noch ${remaining} Recherche-Credits verfügbar, ${targetCount} angefordert.`);
      }
    }

    const user = access.user;
    const assignTo = assign_to || user.email;
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) return Response.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 500 });

    // ── 3. Einstellungen und bestehende Daten der Organisation laden ─────────
    const [settingsList, existingCompanies, blacklist] = await Promise.all([
      base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id }),
      base44.asServiceRole.entities.Company.filter({ organization_id }),
      base44.asServiceRole.entities.Blacklist.filter({ organization_id }),
    ]);
    const settingsMap = {};
    settingsList.forEach(s => { settingsMap[s.key]=s.value; });

    // ── PLZ → Koordinaten (kein AppSettings-Fallback mehr!) ─────────────────
    // Neue Kunden speichern lead_plz + lead_radius_km im Onboarding.
    // Falls noch keine lat/lng gespeichert: über Nominatim-Geocoding auflösen.
    let centerLat = parseFloat(settingsMap["lead_lat"]) || null;
    let centerLng = parseFloat(settingsMap["lead_lng"]) || null;
    const plzFromSettings = settingsMap["lead_plz"];
    if ((!centerLat || !centerLng) && plzFromSettings) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(plzFromSettings)}&country=de&format=json&limit=1`, {
          headers: { 'User-Agent': 'Vertriebo/1.0' }
        });
        const geoData = await geoRes.json();
        if (geoData?.[0]) {
          centerLat = parseFloat(geoData[0].lat);
          centerLng = parseFloat(geoData[0].lon);
          // Für zukünftige Läufe cachen
          await Promise.all([
            base44.asServiceRole.entities.OrganizationSettings.create({ organization_id, key: 'lead_lat', value: String(centerLat) }),
            base44.asServiceRole.entities.OrganizationSettings.create({ organization_id, key: 'lead_lng', value: String(centerLng) }),
          ]).catch(() => {}); // Fehler beim Cachen ignorieren
          console.info(`[generateLeads] Geocoded PLZ ${plzFromSettings} → ${centerLat},${centerLng}`);
        }
      } catch(e) { console.warn('[generateLeads] Geocoding failed:', e.message); }
    }
    // Letzter Fallback: Defaultkoordinaten (Neuwied)
    if (!centerLat || !centerLng) { centerLat = DEFAULT_LAT; centerLng = DEFAULT_LNG; }

    const radiusKm = parseFloat(settingsMap["lead_radius_km"]) || parseFloat(settingsMap["lead_radius"]) || 40;
    const radiusMeters = Math.round(radiusKm*1000);
    const existingNames = new Set(existingCompanies.map(c => c.name?.toLowerCase().trim()));
    const blacklistNames = new Set(blacklist.map(b => b.firmenname?.toLowerCase().trim()));

    // ── 4. Google Places API ────────────────────────────────────────────────
    // Tatsächlichen targetCount auf Credits begrenzen (falls Credit-Cap greift)
    const effectiveTarget = (plan && plan.max_leads_per_month !== -1)
      ? Math.min(targetCount, plan.max_leads_per_month - currentLeadsCreated)
      : targetCount;

    let googlePlacesRequests = 0;
    let placeDetailsRequests = 0;
    const candidates = [];
    const shuffledTypes = BUSINESS_TYPES.sort(()=>Math.random()-0.5);
    const shuffledKeywords = KEYWORD_SEARCHES.sort(()=>Math.random()-0.5);
    for (const type of shuffledTypes.slice(0,5)) {
      if (candidates.length >= effectiveTarget*2) break;
      const data = await fetchPlaces(apiKey,type,null,centerLat,centerLng,radiusMeters);
      googlePlacesRequests++;
      if (data.results) candidates.push(...data.results);
      await new Promise(r=>setTimeout(r,200));
    }
    for (const keyword of shuffledKeywords.slice(0,4)) {
      if (candidates.length >= effectiveTarget*3) break;
      const data = await fetchPlaces(apiKey,null,keyword,centerLat,centerLng,radiusMeters);
      googlePlacesRequests++;
      if (data.results) candidates.push(...data.results);
      await new Promise(r=>setTimeout(r,200));
    }
    const seen=new Set();
    const unique=candidates.filter(p=>{ if(seen.has(p.place_id)) return false; seen.add(p.place_id); return true; });

    // ── 5. WeeklyBatch erstellen ────────────────────────────────────────────
    const days=Math.floor((now-new Date(now.getFullYear(),0,1))/(24*60*60*1000));
    const weekNumber=Math.ceil((days+new Date(now.getFullYear(),0,1).getDay()+1)/7);
    const batch = await base44.asServiceRole.entities.WeeklyBatch.create({ organization_id, kalenderwoche:weekNumber, jahr:now.getFullYear(), anzahl_firmen:0, assigned_to:assignTo, status:"Offen" });

    let created=0, skipped=0;
    for (const place of unique) {
      if (created >= effectiveTarget) break;
      const nameL = place.name?.toLowerCase().trim();
      if (!nameL || existingNames.has(nameL) || blacklistNames.has(nameL)) { skipped++; continue; }
      if ((place.types||[]).some(t=>EXCLUDED_TYPES.has(t)) || EXCLUDED_NAMES.some(kw=>nameL.includes(kw))) { skipped++; continue; }
      let details=null;
      try { details=await getPlaceDetails(apiKey,place.place_id); placeDetailsRequests++; await new Promise(r=>setTimeout(r,150)); } catch(_) {}
      const lat=place.geometry?.location?.lat, lng=place.geometry?.location?.lng;
      const distKm=lat&&lng ? calcDistance(centerLat,centerLng,lat,lng) : null;
      const addr=(details?.formatted_address||place.vicinity||"");
      const addrParts=addr.split(",");
      const plzOrt=addrParts[1]?.trim()||"";
      const plzMatch=plzOrt.match(/(\d{5})\s+(.*)/);
      let branche=place.types?.map(t=>TYPE_MAP[t]).find(Boolean)||"Gewerbe";
      const nameLower=(place.name||"").toLowerCase();
      if (["software","systeme","digital","tech","web","data","cyber","cloud","it-"].some(kw=>nameLower.includes(kw))||nameLower.startsWith("it ")) branche="IT / Software";
      const ratingsCount=details?.user_ratings_total??place.user_ratings_total??null;
      await base44.asServiceRole.entities.Company.create({
        organization_id, name:place.name, branche, adresse:addrParts[0]?.trim()||"",
        plz:plzMatch?plzMatch[1]:"", ort:plzMatch?plzMatch[2]:(addrParts[1]?.trim()||""),
        telefon:details?.formatted_phone_number||"", website:details?.website||"",
        latitude:lat||null, longitude:lng||null, entfernung_km:distKm,
        status:"Neu", quelle:"Google Places API", assigned_to:assignTo, weekly_batch_id:batch.id,
        notizen:ratingsCount!==null&&ratingsCount<10 ? `⚡ Neuer Standort (nur ${ratingsCount} Bewertungen) – jetzt anrufen!` : "",
      });
      existingNames.add(nameL);
      created++;
    }
    await base44.asServiceRole.entities.WeeklyBatch.update(batch.id, { anzahl_firmen:created });

    // ── 6. UsageLog: alle relevanten Werte tracken ───────────────────────────
    //   lead_generations_used  = Recherche-Läufe
    //   leads_created          = Recherche-Credits (1 pro Kontakt)
    //   google_places_requests = Nearbysearch-API-Calls
    //   place_details_requests = Place Details-API-Calls
    //   estimated_external_cost_cent = konfigurierbar über Plan.cost_per_google_places_request_cent
    //   Fallback: 2 Cent pro Request falls Plan nicht gesetzt (≈ 0.02€, leicht über Google-Preis als Puffer)
    const costPerRequest = plan?.cost_per_google_places_request_cent ?? 2;
    const googleCostCent = Math.round((googlePlacesRequests + placeDetailsRequests) * costPerRequest);
    try {
      if (usageLog) {
        await base44.asServiceRole.entities.UsageLog.update(usageLog.id, {
          lead_generations_used: (usageLog.lead_generations_used||0)+1,
          leads_created: (usageLog.leads_created||0)+created,
          google_places_requests: (usageLog.google_places_requests||0)+googlePlacesRequests,
          place_details_requests: (usageLog.place_details_requests||0)+placeDetailsRequests,
          estimated_external_cost_cent: (usageLog.estimated_external_cost_cent||0)+googleCostCent,
        });
      } else {
        await base44.asServiceRole.entities.UsageLog.create({
          organization_id, period_start:periodStart, period_end:periodEnd,
          lead_generations_used:1, leads_created:created,
          google_places_requests:googlePlacesRequests,
          place_details_requests:placeDetailsRequests,
          estimated_external_cost_cent:googleCostCent,
        });
      }
    } catch (e) { console.warn('[generateLeads] UsageLog failed:', e.message); }

    console.info(`[generateLeads] org=${organization_id} user=${user.email} created=${created} skipped=${skipped} api_calls=${googlePlacesRequests+placeDetailsRequests} cost_cent=${googleCostCent}`);
    return Response.json({
      success:true, batch_id:batch.id, created, skipped,
      week:weekNumber, radius_km:radiusKm, source:"Google Places API",
      api_calls: { nearby_search: googlePlacesRequests, place_details: placeDetailsRequests },
      research_credits_used: created,
      estimated_cost_cent: googleCostCent,
    });

  } catch (error) {
    console.error('[generateLeads] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});