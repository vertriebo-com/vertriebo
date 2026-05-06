import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * MIGRATION FUNCTION – Phase 1
 * Legt org_huwa_legacy an und weist alle bestehenden Datensätze zu.
 * NUR von platform_admin aufrufbar.
 * Idempotent: kann mehrfach laufen, überschreibt nichts doppelt.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const LEGACY_ORG_NAME = 'Huwa Gebäudedienste';
    const LEGACY_OWNER_EMAIL = user.email;
    const report = { steps: [], errors: [] };

    // ── SCHRITT 1: org_huwa_legacy anlegen oder finden ──────────────────────
    let org;
    const existingOrgs = await base44.asServiceRole.entities.Organization.filter({ owner_email: LEGACY_OWNER_EMAIL });
    const legacyOrg = existingOrgs.find(o => o.name === LEGACY_ORG_NAME);

    if (legacyOrg) {
      org = legacyOrg;
      report.steps.push(`✅ org_huwa_legacy bereits vorhanden: ${org.id}`);
    } else {
      org = await base44.asServiceRole.entities.Organization.create({
        name: LEGACY_ORG_NAME,
        slug: 'org-huwa-legacy',
        owner_email: LEGACY_OWNER_EMAIL,
        status: 'active',
        billing_status: 'active',
        billing_email: LEGACY_OWNER_EMAIL,
      });
      report.steps.push(`✅ org_huwa_legacy neu angelegt: ${org.id}`);
    }

    const ORG_ID = org.id;

    // ── SCHRITT 2: Aktuellen User als organization_admin eintragen ───────────
    const existingMember = await base44.asServiceRole.entities.OrganizationMember.filter({
      organization_id: ORG_ID,
      user_email: LEGACY_OWNER_EMAIL,
    });

    if (existingMember.length === 0) {
      await base44.asServiceRole.entities.OrganizationMember.create({
        organization_id: ORG_ID,
        user_email: LEGACY_OWNER_EMAIL,
        role: 'organization_admin',
        status: 'active',
        last_active_at: new Date().toISOString(),
      });
      report.steps.push(`✅ Admin-Mitglied angelegt für: ${LEGACY_OWNER_EMAIL}`);
    } else {
      report.steps.push(`✅ Admin-Mitglied bereits vorhanden: ${LEGACY_OWNER_EMAIL}`);
    }

    // ── SCHRITT 3: Backup-Zähler vor Migration ───────────────────────────────
    const [
      allCompanies, allTasks, allContactLogs,
      allBlacklist, allActivityLogs, allWeeklyBatches, allDocuments, allAppSettings
    ] = await Promise.all([
      base44.asServiceRole.entities.Company.list('-created_date', 5000),
      base44.asServiceRole.entities.Task.list('-created_date', 5000),
      base44.asServiceRole.entities.ContactLog.list('-created_date', 5000),
      base44.asServiceRole.entities.Blacklist.list('-created_date', 5000),
      base44.asServiceRole.entities.ActivityLog.list('-created_date', 5000),
      base44.asServiceRole.entities.WeeklyBatch.list('-created_date', 5000),
      base44.asServiceRole.entities.Document.list('-created_date', 5000),
      base44.asServiceRole.entities.AppSettings.list(),
    ]);

    report.steps.push(`📊 Gefunden vor Migration: Company=${allCompanies.length}, Task=${allTasks.length}, ContactLog=${allContactLogs.length}, Blacklist=${allBlacklist.length}, ActivityLog=${allActivityLogs.length}, WeeklyBatch=${allWeeklyBatches.length}, Document=${allDocuments.length}, AppSettings=${allAppSettings.length}`);

    // ── SCHRITT 4: Migration – nur Einträge ohne organization_id ─────────────
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const migrate = async (entityName, items) => {
      const toMigrate = items.filter(i => !i.organization_id);
      let migrated = 0;
      // Process in batches of 5 with delay to avoid rate limits
      for (let i = 0; i < toMigrate.length; i++) {
        await base44.asServiceRole.entities[entityName].update(toMigrate[i].id, { organization_id: ORG_ID });
        migrated++;
        if (i > 0 && i % 5 === 0) await sleep(500);
      }
      return { total: items.length, migrated, already_set: items.length - toMigrate.length };
    };

    const [compRes, taskRes, logRes, blRes, actRes, batchRes, docRes] = await Promise.all([
      migrate('Company', allCompanies),
      migrate('Task', allTasks),
      migrate('ContactLog', allContactLogs),
      migrate('Blacklist', allBlacklist),
      migrate('ActivityLog', allActivityLogs),
      migrate('WeeklyBatch', allWeeklyBatches),
      migrate('Document', allDocuments),
    ]);

    report.steps.push(`✅ Company: ${compRes.migrated} migriert, ${compRes.already_set} bereits gesetzt`);
    report.steps.push(`✅ Task: ${taskRes.migrated} migriert, ${taskRes.already_set} bereits gesetzt`);
    report.steps.push(`✅ ContactLog: ${logRes.migrated} migriert, ${logRes.already_set} bereits gesetzt`);
    report.steps.push(`✅ Blacklist: ${blRes.migrated} migriert, ${blRes.already_set} bereits gesetzt`);
    report.steps.push(`✅ ActivityLog: ${actRes.migrated} migriert, ${actRes.already_set} bereits gesetzt`);
    report.steps.push(`✅ WeeklyBatch: ${batchRes.migrated} migriert, ${batchRes.already_set} bereits gesetzt`);
    report.steps.push(`✅ Document: ${docRes.migrated} migriert, ${docRes.already_set} bereits gesetzt`);

    // ── SCHRITT 5: AppSettings → OrganizationSettings migrieren ─────────────
    let orgSettingsMigrated = 0;
    for (const setting of allAppSettings) {
      const exists = await base44.asServiceRole.entities.OrganizationSettings.filter({
        organization_id: ORG_ID,
        key: setting.key,
      });
      if (exists.length === 0) {
        await base44.asServiceRole.entities.OrganizationSettings.create({
          organization_id: ORG_ID,
          key: setting.key,
          value: setting.value,
        });
        orgSettingsMigrated++;
      }
    }
    report.steps.push(`✅ OrganizationSettings: ${orgSettingsMigrated} aus AppSettings migriert`);

    // ── SCHRITT 6: Plan-Grunddaten anlegen (Starter, Professional, Agency) ───
    const planDefs = [
      { name: 'Starter', price_monthly: 4900, max_users: 2, max_leads_per_month: 200, max_ai_scorings_per_month: 50, max_emails_per_month: 200, max_lead_generations_per_month: 3, has_advanced_reports: false, has_custom_email_templates: false, is_active: true, sort_order: 1 },
      { name: 'Professional', price_monthly: 9900, max_users: 5, max_leads_per_month: 1000, max_ai_scorings_per_month: 300, max_emails_per_month: 1000, max_lead_generations_per_month: 15, has_advanced_reports: true, has_custom_email_templates: true, is_active: true, sort_order: 2 },
      { name: 'Agency', price_monthly: 24900, max_users: -1, max_leads_per_month: -1, max_ai_scorings_per_month: -1, max_emails_per_month: -1, max_lead_generations_per_month: -1, has_advanced_reports: true, has_custom_email_templates: true, is_active: true, sort_order: 3 },
    ];

    const existingPlans = await base44.asServiceRole.entities.Plan.list();
    let plansCreated = 0;
    for (const plan of planDefs) {
      const exists = existingPlans.find(p => p.name === plan.name);
      if (!exists) {
        await base44.asServiceRole.entities.Plan.create(plan);
        plansCreated++;
      }
    }
    report.steps.push(`✅ Pläne: ${plansCreated} angelegt (Starter, Professional, Agency)`);

    // ── SCHRITT 7: Verifikation – keine Datensätze ohne organization_id ──────
    const [
      checkCompanies, checkTasks, checkLogs,
      checkBl, checkAct, checkBatch, checkDoc
    ] = await Promise.all([
      base44.asServiceRole.entities.Company.list('-created_date', 5000),
      base44.asServiceRole.entities.Task.list('-created_date', 5000),
      base44.asServiceRole.entities.ContactLog.list('-created_date', 5000),
      base44.asServiceRole.entities.Blacklist.list('-created_date', 5000),
      base44.asServiceRole.entities.ActivityLog.list('-created_date', 5000),
      base44.asServiceRole.entities.WeeklyBatch.list('-created_date', 5000),
      base44.asServiceRole.entities.Document.list('-created_date', 5000),
    ]);

    const orphans = {
      Company: checkCompanies.filter(i => !i.organization_id).length,
      Task: checkTasks.filter(i => !i.organization_id).length,
      ContactLog: checkLogs.filter(i => !i.organization_id).length,
      Blacklist: checkBl.filter(i => !i.organization_id).length,
      ActivityLog: checkAct.filter(i => !i.organization_id).length,
      WeeklyBatch: checkBatch.filter(i => !i.organization_id).length,
      Document: checkDoc.filter(i => !i.organization_id).length,
    };

    const totalOrphans = Object.values(orphans).reduce((a, b) => a + b, 0);
    report.steps.push(totalOrphans === 0
      ? `✅ VERIFIKATION: Alle Datensätze haben organization_id – keine Orphans!`
      : `⚠️ VERIFIKATION: ${totalOrphans} Datensätze ohne organization_id: ${JSON.stringify(orphans)}`
    );

    return Response.json({
      success: true,
      organization_id: ORG_ID,
      organization_name: org.name,
      orphans,
      total_orphans: totalOrphans,
      migration_clean: totalOrphans === 0,
      report,
    });

  } catch (error) {
    console.error('Migration error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});