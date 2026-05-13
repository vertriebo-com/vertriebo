import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Hilfsfunktion: Feedback für eine einzelne Organisation verarbeiten ──
async function processFeedbackForOrg(base44, organization_id) {
  // Alle Outcomes dieser Organisation laden
  const outcomes = await base44.asServiceRole.entities.LeadOutcome.filter(
    { organization_id },
    '-created_date',
    500
  );

  if (outcomes.length === 0) {
    return { success: true, updated: false, message: 'Keine Outcomes vorhanden.' };
  }

  // Alle zugehörigen Companies laden
  const companies = await base44.asServiceRole.entities.Company.filter(
    { organization_id },
    '-created_date',
    500
  );
  const companyMap = {};
  companies.forEach(c => { companyMap[c.id] = c; });

  // ── Kategorie-Stats, Keywords, Signals ──────────────────────────
  const categoryStats = {};
  const keywordWins = {};
  const signalWins = {};

  for (const outcome of outcomes) {
    const company = companyMap[outcome.company_id];
    if (!company) continue;

    const category = company.matched_search_category || company.source_query || null;
    const keyword = company.source_query || null;
    const signals = (company.relevance_reason || '').split(' | ');

    // Kategorie-Stats
    if (category) {
      if (!categoryStats[category]) {
        categoryStats[category] = { won: 0, relevant: 0, not_relevant: 0, total: 0 };
      }
      categoryStats[category].total++;
      if (outcome.outcome_type === 'won') categoryStats[category].won++;
      else if (outcome.outcome_type === 'relevant') categoryStats[category].relevant++;
      else if (outcome.outcome_type === 'not_relevant') categoryStats[category].not_relevant++;
    }

    // Keywords die zu Abschlüssen geführt haben
    if (keyword && outcome.outcome_type === 'won') {
      keywordWins[keyword] = (keywordWins[keyword] || 0) + 1;
    }

    // Scoring-Signale die zu Abschlüssen geführt haben
    if (outcome.outcome_type === 'won') {
      for (const signal of signals) {
        const s = signal.replace('Signal: ', '').replace(/"/g, '').trim();
        if (s && s.length > 2) {
          signalWins[s] = (signalWins[s] || 0) + 1;
        }
      }
    }
  }

  // ── Kategorie-Score berechnen ──────────────────────────────────
  // Score 0-100: won=+3, relevant=+1, not_relevant=-2
  const categoryScores = Object.entries(categoryStats).map(([cat, stats]) => ({
    category: cat,
    ...stats,
    score: Math.max(0, Math.min(100,
      50 + (stats.won * 3) + (stats.relevant * 1) - (stats.not_relevant * 2)
    ))
  })).sort((a, b) => b.score - a.score);

  // ── Ausschlüsse (min 3 Feedbacks UND >60% not_relevant) ───────
  const badCategories = categoryScores
    .filter(c => c.total >= 3 && (c.not_relevant / c.total) > 0.6)
    .map(c => c.category);

  // ── Top-Keywords nach Abschlüssen ──────────────────────────────
  const boostedKeywords = Object.entries(keywordWins)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, won_count]) => ({ keyword, won_count, source: 'outcome_won' }));

  // ── Winning Signals nach Abschlüssen ────────────────────────────
  const winningSignals = Object.entries(signalWins)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([signal, won_count]) => ({ signal, won_count }));

  // ── OrgLearnedSignals speichern ─────────────────────────────────
  const learnedData = {
    organization_id,
    priority_categories: JSON.stringify(categoryScores),
    boosted_keywords: JSON.stringify(boostedKeywords),
    excluded_categories: JSON.stringify(badCategories),
    winning_signals: JSON.stringify(winningSignals),
    last_computed_at: new Date().toISOString(),
    total_outcomes_analyzed: outcomes.length,
    version: 1
  };

  const existing = await base44.asServiceRole.entities.OrgLearnedSignals.filter(
    { organization_id }
  );
  if (existing[0]) {
    await base44.asServiceRole.entities.OrgLearnedSignals.update(
      existing[0].id,
      learnedData
    );
  } else {
    await base44.asServiceRole.entities.OrgLearnedSignals.create(learnedData);
  }

  // ── excluded_customer_types in OrganizationSettings aktualisieren ──
  const settingsRecords = await base44.asServiceRole.entities.OrganizationSettings.filter(
    { organization_id }
  );
  const settings = {};
  settingsRecords.forEach(s => { settings[s.key] = s; });

  const currentExcluded = (settings['excluded_customer_types']?.value || '')
    .split(', ')
    .filter(x => x.trim());
  const newExcluded = [...new Set([...currentExcluded, ...badCategories])];

  if (settings['excluded_customer_types']) {
    await base44.asServiceRole.entities.OrganizationSettings.update(
      settings['excluded_customer_types'].id,
      { value: newExcluded.join(', ') }
    );
  } else if (newExcluded.length > 0) {
    await base44.asServiceRole.entities.OrganizationSettings.create({
      organization_id,
      key: 'excluded_customer_types',
      value: newExcluded.join(', ')
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

  console.info(`[processLeadOutcomeFeedback] org=${organization_id} categories=${categoryScores.length} won=${Object.values(categoryStats).reduce((s,c)=>s+c.won,0)} excluded=${badCategories.length}`);

  return {
    success: true,
    updated: true,
    categories_analyzed: categoryScores.length,
    bad_categories: badCategories,
    boosted_keywords: boostedKeywords.length,
    winning_signals: winningSignals.length,
    total_outcomes: outcomes.length
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