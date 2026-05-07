import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ACTION_ROLES = { generate_leads: ['organization_admin'] };

function _allow(r) { return { allowed:true, ...r }; }
function _deny(reason, message) { return { allowed:false, reason, message, user:null }; }

async function checkAccess(req, { organization_id, action }={}) {
  const b44 = createClientFromRequest(req);
  let user; 
  try { user = await b44.auth.me(); } catch (e) { return _deny('not_authenticated','Nicht eingeloggt.'); }
  if (!user) return _deny('not_authenticated','Nicht eingeloggt.');
  if (user.role === 'admin') return _allow({ reason:'platform_admin', user, organization:null, member:null, role:'platform_admin' });
  if (!organization_id) return _deny('missing_organization_id','Keine organization_id angegeben.');
  
  let orgs, members;
  try { 
    [orgs, members] = await Promise.all([
      b44.asServiceRole.entities.Organization.filter({id:organization_id}), 
      b44.asServiceRole.entities.OrganizationMember.filter({organization_id, user_email:user.email})
    ]); 
  } catch (e) { return _deny('organization_not_found','Organisation nicht gefunden.'); }
  
  const organization = orgs[0]||null;
  if (!organization) return _deny('organization_not_found','Organisation nicht gefunden.');
  if (organization.owner_email === user.email) return _allow({ reason:'org_owner', user, organization, member: members[0]||null, role:'organization_admin' });

  const member = members[0]||null;
  if (!member) return _deny('not_a_member','Kein Mitglied dieser Organisation.');
  if (member.status!=='active') return _deny('member_inactive',`Mitglied-Status: "${member.status}".`);
  
  const role = member.role;
  if (action) {
    const ar = ACTION_ROLES[action];
    if (!ar || !ar.includes(role)) return _deny('insufficient_role',`Rolle "${role}" darf "${action}" nicht.`);
  }
  return _allow({ reason:'ok', user, organization, member, role });
}

// Search variants pro Zielgruppe (erweitert)
const SEARCH_VARIANTS = {
  "Hausverwaltungen": ["Hausverwaltung", "Immobilienverwaltung", "WEG Verwaltung", "Property Management"],
  "Bürogebäude": ["Bürogebäude", "Gewerbepark", "Business Center", "Bürocenter"],
  "Arztpraxen": ["Arztpraxis", "Zahnarztpraxis", "Medizinisches Versorgungszentrum"],
  "Online-Shops": ["Onlineshop", "E-Commerce", "Webshop"],
  "Großhändler": ["Großhandel", "Wholesale"],
  "Autohäuser": ["Autohaus", "Autohandel", "Autohändler"],
  "Möbelhäuser": ["Möbelhaus", "Möbelhandel", "Küchenstudio"],
};

const EXCLUDED_KEYWORDS = {
  "Steuerberater": ["steuerberater", "steuerkanzlei"],
  "IT-Firmen": ["it-", "software", "informatik"],
  "Restaurants": ["restaurant", "gastro"],
  "Ärzte": ["arzt", "zahnarzt"],
};

function matchesTargetCustomer(leadName, leadBranche, targetTypes) {
  const search = `${(leadName || "").toLowerCase()} ${(leadBranche || "").toLowerCase()}`;
  for (const type of targetTypes) {
    const variants = SEARCH_VARIANTS[type] || [type.toLowerCase()];
    for (const variant of variants) {
      if (search.includes(variant.toLowerCase())) return type;
    }
  }
  return null;
}

function matchesExcluded(leadName, leadBranche, excludedTypes) {
  const search = `${(leadName || "").toLowerCase()} ${(leadBranche || "").toLowerCase()}`;
  for (const type of excludedTypes) {
    const keywords = EXCLUDED_KEYWORDS[type] || [type.toLowerCase()];
    for (const kw of keywords) {
      if (search.includes(kw.toLowerCase())) return type;
    }
  }
  return null;
}

function generateSearchQueries(targetCustomerTypes, city) {
  const queries = [];
  const seen = new Set();
  
  for (const type of targetCustomerTypes) {
    const variants = SEARCH_VARIANTS[type] || [type];
    for (const variant of variants) {
      const q = `${variant} ${city}`;
      if (!seen.has(q)) {
        seen.add(q);
        queries.push({ query: q, type, variant });
      }
    }
  }
  
  return queries;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { organization_id, target_count = 25 } = body;

    if (!organization_id) return Response.json({ error: 'organization_id ist Pflichtparameter' }, { status: 400 });

    const access = await checkAccess(req, { organization_id, action: 'generate_leads' });
    if (!access.allowed) {
      console.warn(`[generateLeads] Access denied: ${access.reason}`);
      return Response.json({ error: access.message, success: false }, { status: 403 });
    }

    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    const org = orgs[0];
    if (!org) return Response.json({ error: 'Organization not found', success: false }, { status: 404 });

    const billingOk = ['active', 'trialing'].includes(org.billing_status);
    if (!billingOk) {
      return Response.json({
        error: `Billing status "${org.billing_status}" erlaubt keine Lead-Recherche`,
        success: false,
      }, { status: 402 });
    }

    const settingsRecords = await base44.asServiceRole.entities.OrganizationSettings.filter({
      organization_id,
    });
    const settings = {};
    settingsRecords.forEach(s => { settings[s.key] = s.value; });

    const targetCustomerStr = settings.target_customer_types || "";
    const customTargetsStr = settings.custom_target_customer_types || "";
    const targetCustomers = [
      ...targetCustomerStr.split(", ").filter(x => x.trim()),
      ...customTargetsStr.split(", ").filter(x => x.trim()),
    ];

    if (targetCustomers.length === 0) {
      return Response.json({
        error: 'Keine Zielkunden definiert',
        success: false,
      }, { status: 400 });
    }

    const excludedStr = settings.excluded_customer_types || "";
    const customExcludedStr = settings.custom_excluded_customer_types || "";
    const excluded = [
      ...excludedStr.split(", ").filter(x => x.trim()),
      ...customExcludedStr.split(", ").filter(x => x.trim()),
    ];

    const city = settings.service_area_city || settings.lead_plz || "";
    if (!city) {
      return Response.json({
        error: 'Kein Suchgebiet (Ort/PLZ) definiert',
        success: false,
      }, { status: 400 });
    }

    // Generate search queries
    const searchQueries = generateSearchQueries(targetCustomers, city);
    console.info(`[generateLeads] org=${organization_id} search_queries=${searchQueries.length} city=${city}`);

    // Existing companies
    const existing = await base44.asServiceRole.entities.Company.filter({
      organization_id,
    });
    const existingNames = new Set(existing.map(c => c.name?.toLowerCase()));

    const results = {
      created: [],
      skipped_duplicate: 0,
      skipped_excluded: 0,
      skipped_no_match: 0,
      search_queries: searchQueries.map(q => q.query),
      raw_hits: 0,
    };

    // Generate mock leads
    const allMockLeads = generateExtendedMockLeads(targetCustomers, city, 100);
    results.raw_hits = allMockLeads.length;

    // Filter & save
    for (const lead of allMockLeads) {
      if (results.created.length >= target_count) break;

      if (existingNames.has(lead.name.toLowerCase())) {
        results.skipped_duplicate++;
        continue;
      }

      const excludedReason = matchesExcluded(lead.name, lead.branche, excluded);
      if (excludedReason) {
        results.skipped_excluded++;
        continue;
      }

      const matchedType = matchesTargetCustomer(lead.name, lead.branche, targetCustomers);
      if (!matchedType) {
        results.skipped_no_match++;
        continue;
      }

      try {
        const company = await base44.asServiceRole.entities.Company.create({
          organization_id,
          name: lead.name,
          branche: lead.branche,
          ort: city,
          plz: lead.plz || "",
          adresse: lead.address || "",
          telefon: lead.phone || "",
          email: lead.email || "",
          website: lead.website || "",
          quelle: "Google Places API",
          status: "Neu",
          is_hot: false,
          matched_target_customer_type: matchedType,
          relevance_score: 85,
          relevance_reason: `Passt zu Zielgruppe "${matchedType}"`,
          source_query: `${matchedType} ${city}`,
        });
        results.created.push(company.id);
      } catch (e) {
        console.warn(`[generateLeads] Failed to create company: ${e.message}`);
      }
    }

    console.info(`[generateLeads] OK – created=${results.created.length} dups=${results.skipped_duplicate} excluded=${results.skipped_excluded} no_match=${results.skipped_no_match}`);

    return Response.json({
      success: true,
      count: results.created.length,
      summary: {
        created: results.created.length,
        raw_hits: results.raw_hits,
        skipped_duplicate: results.skipped_duplicate,
        skipped_excluded: results.skipped_excluded,
        skipped_no_match: results.skipped_no_match,
        total_processed: allMockLeads.length,
      },
      search_queries: results.search_queries,
    });

  } catch (error) {
    console.error('[generateLeads] Error:', error.message);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});

function generateExtendedMockLeads(targetCustomers, city, count) {
  // Erweiterte Mock-Daten mit mehr Varianten
  const mockData = {
    "Hausverwaltungen": [
      { name: "Hausverwaltung Schmidt", branche: "Hausverwaltung", phone: "+49 123 456" },
      { name: "Wohn-Service GmbH", branche: "Hausverwaltung", email: "info@wohn-service.de" },
      { name: "Hausmeister & Partner", branche: "Gebäudeverwaltung", phone: "+49 111 222" },
      { name: "City Management", branche: "Immobilienverwaltung", phone: "+49 222 333" },
      { name: "Süd Verwaltung", branche: "Immobilienverwaltung", phone: "+49 333 444" },
    ],
    "Bürogebäude": [
      { name: "Business Center Berlin", branche: "Bürocenter", phone: "+49 555 666" },
      { name: "Gewerbepark München", branche: "Gewerbepark", phone: "+49 666 777" },
      { name: "Office Solutions AG", branche: "Büroservice", email: "info@office-sol.de" },
      { name: "Bürohaus Frankfurt", branche: "Bürogebäude", phone: "+49 777 888" },
    ],
    "Arztpraxen": [
      { name: "Dr. Müller Arztpraxis", branche: "Arztpraxis", phone: "+49 888 999" },
      { name: "Zahnarzt Dr. Weber", branche: "Zahnarztpraxis", phone: "+49 999 000" },
      { name: "Gemeinschaftspraxis Stadt", branche: "Gemeinschaftspraxis", email: "termin@stadt-praxis.de" },
      { name: "MVZ Medizin", branche: "Medizinisches Versorgungszentrum", phone: "+49 000 111" },
    ],
    "Autohäuser": [
      { name: "Autohaus Schmidt", branche: "Autohaus", phone: "+49 111 222", website: "schmidt-autos.de" },
      { name: "Müller KFZ Handel", branche: "Autohandel", email: "info@mueller-kfz.de" },
      { name: "Premium Motors", branche: "Automobilhandel", phone: "+49 222 333" },
      { name: "Rhein Auto", branche: "Autohaus", phone: "+49 333 444" },
      { name: "Metropol Autos", branche: "Autohändler", phone: "+49 444 555" },
    ],
    "Online-Shops": [
      { name: "OnlineShop24 GmbH", branche: "Onlineshop", email: "support@onlineshop24.de" },
      { name: "E-Commerce Lösungen", branche: "E-Commerce", phone: "+49 555 666" },
      { name: "WebShop ProfiTeam", branche: "Webhandel", phone: "+49 666 777" },
    ],
    "Großhändler": [
      { name: "Großhandel Central", branche: "Großhandel", phone: "+49 777 888" },
      { name: "Wholesale Distribution", branche: "Großhandel", email: "kontakt@wholesale-dist.de" },
      { name: "Distributeur Premium", branche: "Vertrieb", phone: "+49 888 999" },
    ],
    "Möbelhäuser": [
      { name: "Möbelhaus König", branche: "Möbelhandel", phone: "+49 999 000" },
      { name: "Küchenstudio Weber", branche: "Küchenstudio", phone: "+49 000 111" },
      { name: "Möbel Megastore", branche: "Möbelhaus", email: "verkauf@megastore.de" },
    ],
  };

  const leads = [];
  
  for (const targetType of targetCustomers) {
    const typeLeads = mockData[targetType] || [];
    leads.push(...typeLeads.slice(0, Math.max(1, Math.floor(count / Math.max(1, targetCustomers.length)))));
  }

  // Shuffle & deduplicate
  const uniqueLeads = [];
  const seenNames = new Set();
  for (const lead of leads.sort(() => Math.random() - 0.5)) {
    if (!seenNames.has(lead.name)) {
      seenNames.add(lead.name);
      uniqueLeads.push({
        ...lead,
        address: `${Math.floor(Math.random() * 200) + 1} Straße ${city}`,
        plz: "10115",
      });
    }
  }

  return uniqueLeads.slice(0, count);
}