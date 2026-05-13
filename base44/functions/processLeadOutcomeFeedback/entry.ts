import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Hilfsfunktion: Feedback für eine einzelne Organisation verarbeiten ──
async function processFeedbackForOrg(base44, organization_id) {
  // Alle Outcomes dieser Organisation laden
  const outcomes = await base44.asServiceRole.entities.LeadOutcome.filter(
    { organization_id },
    '-created_date',
    500
  );

  // Alle zugehörigen Companies laden um matched_search_category zu lesen
  const companyIds = [...new Set(outcomes.map(o => o.company_id).filter(Boolean))];
  if (companyIds.length === 0) {
    return { success: true, updated: false, message: 'Keine Outcomes vorhanden.' };
  }

  const companies = await base44.asServiceRole.entities.Company.filter(
    { organization_id },
    '-created_date',
    500
  );
  const companyMap = {};
  companies.forEach(c => { companyMap[c.id] = c; });

  // Kategorie-Performance berechnen
  const categoryStats = {};
  for (const outcome of outcomes) {
    const company = companyMap[outcome.company_id];
    const category = company?.matched_search_category || company?.source_query || null;
    if (!category) continue;

    if (!categoryStats[category]) {
      categoryStats[category] = { relevant: 0, not_relevant: 0, won: 0, total: 0 };
    }
    categoryStats[category].total++;
    if (outcome.outcome_type === 'won') categoryStats[category].won++;
    else if (outcome.outcome_type === 'relevant') categoryStats[category].relevant++;
    else if (outcome.outcome_type === 'not_relevant') categoryStats[category].not_relevant++;
  }

  // Kategorien mit schlechter Performance identifizieren
  // Regel: min 3 Feedbacks UND >60% nicht relevant → ausschließen
  const badCategories = Object.entries(categoryStats)
    .filter(([_, stats]) => 
      stats.total >= 3 && 
      (stats.not_relevant / stats.total) > 0.6
    )
    .map(([cat]) => cat);

  if (badCategories.length === 0) {
    return { success: true, updated: false, message: 'Keine schlechten Kategorien gefunden.' };
  }

  // Aktuelle excluded_customer_types laden
  const settingsRecords = await base44.asServiceRole.entities.OrganizationSettings.filter(
    { organization_id }
  );
  const settings = {};
  settingsRecords.forEach(s => { settings[s.key] = s; });

  const currentExcluded = (settings['excluded_customer_types']?.value || '')
    .split(', ')
    .filter(x => x.trim());
  
  // Neue Ausschlüsse zusammenführen (keine Duplikate)
  const newExcluded = [...new Set([...currentExcluded, ...badCategories])];
  const newValue = newExcluded.join(', ');

  // Speichern
  if (settings['excluded_customer_types']) {
    await base44.asServiceRole.entities.OrganizationSettings.update(
      settings['excluded_customer_types'].id,
      { value: newValue }
    );
  } else {
    await base44.asServiceRole.entities.OrganizationSettings.create({
      organization_id,
      key: 'excluded_customer_types',
      value: newValue
    });
  }

  // Audit-Eintrag für Transparenz
  try {
    await base44.asServiceRole.entities.PlatformAuditLog.create({
      actor_email: 'system_feedback_loop',
      actor_role: 'system',
      action: 'auto_excluded_categories',
      target_type: 'organization',
      target_id: organization_id,
      organization_id: organization_id,
      reason: `Auto-ausgeschlossen: ${badCategories.join(', ')}`
    });
  } catch (auditErr) {
    console.warn('[processLeadOutcomeFeedback] Audit-Log-Fehler:', auditErr.message);
  }

  console.info(`[processLeadOutcomeFeedback] org=${organization_id} auto_excluded=${badCategories.length} categories=${badCategories.join(', ')}`);

  return { 
    success: true, 
    updated: true,
    auto_excluded: badCategories,
    category_stats: categoryStats
  };
}

// ── Main Handler ──────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { organization_id } = body;

    // ── Daily-Run Modus: alle aktiven Organisationen durchlaufen ──────
    if (!organization_id) {
      const allOrgs = await base44.asServiceRole.entities.Organization.list(
        '-created_date',
        1000
      );
      const activeOrgs = allOrgs.filter(o => 
        o.platform_status !== 'suspended' && 
        o.abuse_status !== 'blocked'
      );
      
      const results = [];
      for (const org of activeOrgs) {
        try {
          const result = await processFeedbackForOrg(base44, org.id);
          results.push({ org_id: org.id, ...result });
        } catch (e) {
          console.error(`[processLeadOutcomeFeedback] org=${org.id} error:`, e.message);
          results.push({ org_id: org.id, error: e.message, success: false });
        }
      }
      
      console.info(`[processLeadOutcomeFeedback] daily_run completed: ${activeOrgs.length} orgs processed`);
      
      return Response.json({ 
        success: true, 
        mode: 'all_orgs', 
        processed: results.length,
        results 
      });
    }

    // ── Einzel-Org Modus (Frontend-Trigger) ──────────────────────────
    const result = await processFeedbackForOrg(base44, organization_id);
    return Response.json(result);

  } catch (error) {
    console.error('[processLeadOutcomeFeedback] Error:', error.message);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});