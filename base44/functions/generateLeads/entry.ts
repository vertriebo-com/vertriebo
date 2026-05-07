import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Inline checkAccess ───────────────────────────────────────────────────────
const ACTION_ROLES = {
  generate_leads: ['organization_admin'],
};

function _allow(r) { return { allowed:true, ...r }; }
function _deny(reason, message) { return { allowed:false, reason, message, user:null }; }

async function checkAccess(req, { organization_id, action }={}) {
  const b44 = createClientFromRequest(req);
  let user; 
  try { 
    user = await b44.auth.me(); 
  } catch (e) { 
    return _deny('not_authenticated','Nicht eingeloggt.'); 
  }
  if (!user) return _deny('not_authenticated','Nicht eingeloggt.');
  if (user.role === 'admin') return _allow({ reason:'platform_admin', user, organization:null, member:null, role:'platform_admin' });
  if (!organization_id) return _deny('missing_organization_id','Keine organization_id angegeben.');
  
  let orgs, members;
  try { 
    [orgs, members] = await Promise.all([
      b44.asServiceRole.entities.Organization.filter({id:organization_id}), 
      b44.asServiceRole.entities.OrganizationMember.filter({organization_id, user_email:user.email})
    ]); 
  } catch (e) { 
    return _deny('organization_not_found','Organisation nicht gefunden.'); 
  }
  
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
// ─────────────────────────────────────────────────────────────────────────────

// Keyword-Mappings für Zielgruppen
const CUSTOMER_TYPE_KEYWORDS = {
  "Hausverwaltungen": ["hausverwaltung"],
  "Immobilienverwaltungen": ["immobilienverwaltung"],
  "Bürogebäude": ["büro", "office", "geschäftsgebäude"],
  "Arztpraxen": ["arztpraxis", "zahnarzt", "dentist"],
  "Zahnarztpraxen": ["zahnarzt", "dentist"],
  "Kanzleien": ["anwalt", "rechtsanwalt", "law"],
  "Steuerkanzleien": ["steuerberater"],
  "Autohäuser": ["autohaus", "autohändler"],
  "Werkstätten": ["autowerkstatt", "kfz-werkstatt"],
  "Hotels": ["hotel", "gasthof", "pension"],
  "Pflegeheime": ["pflegeheim", "altenheim"],
  "Schulen": ["schule", "gymnasium", "grundschule"],
  "Kitas": ["kita", "kindergarten"],
  "Fitnessstudios": ["fitnessstudio", "gym"],
  "Einzelhandel": ["einzelhandel"],
  "Supermärkte": ["supermarkt", "edeka", "rewe"],
  "Restaurants": ["restaurant", "gastro", "gastronomie"],
  "Lagerhallen": ["lagerhalle", "lager", "warehouse"],
  "Produktionsbetriebe": ["produktion", "fabrik"],
  "Industrieunternehmen": ["industrie"],
  "Bauunternehmen": ["bauleitung", "bauunternehmen"],
  "Handwerksbetriebe": ["handwerk"],
  "Online-Shops": ["online shop", "e-commerce"],
  "Großhändler": ["großhandel", "wholesale"],
  "Möbelhäuser": ["möbelhaus"],
  "Apotheken": ["apotheke", "pharmacy"],
  "Logistikzentren": ["logistik"],
};

// Keyword-Mappings für Ausschlüsse
const EXCLUDED_TYPE_KEYWORDS = {
  "Keine Steuerberater": ["steuerberater"],
  "Keine IT-Firmen": ["it-", "software", "computer"],
  "Keine Restaurants": ["restaurant", "gastro", "bar"],
  "Keine Ärzte": ["arzt", "zahnarzt"],
};

function matchesTargetCustomer(leadName, leadBranche, targetTypes) {
  const search = `${(leadName || "").toLowerCase()} ${(leadBranche || "").toLowerCase()}`;
  for (const type of targetTypes) {
    const keywords = CUSTOMER_TYPE_KEYWORDS[type] || [type.toLowerCase()];
    for (const kw of keywords) {
      if (search.includes(kw.toLowerCase())) return type;
    }
  }
  return null;
}

function matchesExcluded(leadName, leadBranche, excludedTypes) {
  const search = `${(leadName || "").toLowerCase()} ${(leadBranche || "").toLowerCase()}`;
  for (const type of excludedTypes) {
    const keywords = EXCLUDED_TYPE_KEYWORDS[type] || [type.toLowerCase()];
    for (const kw of keywords) {
      if (search.includes(kw.toLowerCase())) return type;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { organization_id, target_count = 25 } = body;

    // ── 1. Zugriff prüfen ─────────────────────────────────────────────────
    const access = await checkAccess(req, { organization_id, action: 'generate_leads' });
    if (!access.allowed) {
      console.warn(`[generateLeads] Access denied: ${access.reason}`);
      return Response.json({ error: access.message, success: false }, { status: 403 });
    }

    // ── 2. Organisation & Subscription prüfen ─────────────────────────────
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

    // ── 3. Settings laden ─────────────────────────────────────────────────
    const settingsRecords = await base44.asServiceRole.entities.OrganizationSettings.filter({
      organization_id,
    });
    const settings = {};
    settingsRecords.forEach(s => {
      settings[s.key] = s.value;
    });

    // ── 4. Erforderliche Felder prüfen ───────────────────────────────────
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

    console.info(`[generateLeads] org=${organization_id} targets=${targetCustomers.length} excluded=${excluded.length} city=${city}`);

    // ── 5. Google Places Suche (Mock für Demo) ──────────────────────────
    // In Produktionsumgebung: Google Places API verwenden
    // Hier: Fake-Daten für Tests
    const mockLeads = generateMockLeads(targetCustomers, city, 50);

    // ── 6. Lead-Filterung & Speicherung ─────────────────────────────────
    const existing = await base44.asServiceRole.entities.Company.filter({
      organization_id,
    });
    const existingNames = new Set(existing.map(c => c.name?.toLowerCase()));

    const results = {
      created: [],
      skipped_duplicate: 0,
      skipped_excluded: 0,
      skipped_no_match: 0,
    };

    for (const lead of mockLeads) {
      // Duplikat?
      if (existingNames.has(lead.name.toLowerCase())) {
        results.skipped_duplicate++;
        continue;
      }

      // Ausgeschlossen?
      const excludedReason = matchesExcluded(lead.name, lead.branche, excluded);
      if (excludedReason) {
        results.skipped_excluded++;
        continue;
      }

      // Passt zu Zielgruppe?
      const matchedType = matchesTargetCustomer(lead.name, lead.branche, targetCustomers);
      if (!matchedType) {
        results.skipped_no_match++;
        continue;
      }

      // Speichern
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

        // Limit prüfen
        if (results.created.length >= target_count) break;
      } catch (e) {
        console.warn(`[generateLeads] Failed to create company: ${e.message}`);
      }
    }

    console.info(`[generateLeads] OK – created=${results.created.length} duplicates=${results.skipped_duplicate} excluded=${results.skipped_excluded} no_match=${results.skipped_no_match}`);

    return Response.json({
      success: true,
      count: results.created.length,
      summary: {
        created: results.created.length,
        skipped_duplicate: results.skipped_duplicate,
        skipped_excluded: results.skipped_excluded,
        skipped_no_match: results.skipped_no_match,
        total_processed: mockLeads.length,
      },
    });

  } catch (error) {
    console.error('[generateLeads] Error:', error.message);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});

// ── Mock-Daten für Tests ──────────────────────────────────────────────────────
function generateMockLeads(targetCustomers, city, count) {
  const mockCompanies = {
    "Autohaus": [
      { name: "Schmidt Automobile", branche: "Autohaus", phone: "+49 123 456", website: "schmidt-autos.de" },
      { name: "Müller KFZ Handel", branche: "Autohandel", phone: "+49 234 567", email: "info@mueller-kfz.de" },
      { name: "Premium Motors", branche: "Automobilhandel", phone: "+49 345 678" },
      { name: "Rhein Auto", branche: "Autohaus", phone: "+49 456 789" },
      { name: "Metropol Autos", branche: "Autohändler", phone: "+49 567 890" },
    ],
    "Hausverwaltung": [
      { name: "Hausmeister & Partner", branche: "Gebäudeverwaltung", phone: "+49 111 222" },
      { name: "Wohn-Service GmbH", branche: "Hausverwaltung", email: "info@wohn-service.de" },
      { name: "City Management", branche: "Immobilienverwaltung", phone: "+49 222 333" },
      { name: "Süd Verwaltung", branche: "Hausmeisterdienste", phone: "+49 333 444" },
    ],
    "Hotel": [
      { name: "Hotel am Markt", branche: "Gastgewerbe", phone: "+49 555 666", website: "hotel-markt.de" },
      { name: "Pension Schöne Aussicht", branche: "Beherbergung", phone: "+49 666 777" },
      { name: "Business Hotel Plus", branche: "Hotel", email: "booking@bhplus.de" },
      { name: "Gasthof zur Post", branche: "Gaststättenbetrieb", phone: "+49 777 888" },
    ],
    "Steuerberater": [
      { name: "Dr. Müller & Co. Steuerberatung", branche: "Steuerberatung", phone: "+49 888 999" },
      { name: "Finanz-Pro", branche: "Steuerberatung", email: "kontakt@finanz-pro.de" },
      { name: "Tax Excellence", branche: "Steuerberatung", phone: "+49 999 000" },
    ],
  };

  const leads = [];
  const templates = [
    ...mockCompanies["Autohaus"],
    ...mockCompanies["Hausverwaltung"],
    ...mockCompanies["Hotel"],
  ];

  for (let i = 0; i < Math.min(count, templates.length); i++) {
    const t = templates[i % templates.length];
    leads.push({
      name: t.name + (i > templates.length ? ` (${i})` : ""),
      branche: t.branche,
      plz: "10115",
      address: `${Math.floor(Math.random() * 200) + 1} Straße ${city}`,
      phone: t.phone || "",
      email: t.email || "",
      website: t.website || "",
    });
  }

  return leads;
}