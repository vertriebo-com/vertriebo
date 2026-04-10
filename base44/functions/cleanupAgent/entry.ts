import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Cleanup Agent: wöchentlich ausgeführt
// - Markiert Leads als "Verloren" wenn seit 30 Tagen kein Kontakt + Status "Neu"
// - Löscht erledigte Tasks älter als 60 Tage
// - Findet Dubletten (gleicher Name, ähnlich)

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);

    const [companies, tasks, contactLogs] = await Promise.all([
      base44.asServiceRole.entities.Company.list('-created_date', 1000),
      base44.asServiceRole.entities.Task.list('-created_date', 1000),
      base44.asServiceRole.entities.ContactLog.list('-created_date', 2000),
    ]);

    // Last contact per company
    const lastContactByCompany = {};
    for (const log of contactLogs) {
      if (!lastContactByCompany[log.company_id] ||
          new Date(log.created_date) > new Date(lastContactByCompany[log.company_id])) {
        lastContactByCompany[log.company_id] = log.created_date;
      }
    }

    let deadLeadsMarked = 0;
    let tasksDeleted = 0;
    const duplicatesFound = [];

    // Mark dead "Neu" leads (no contact in 30 days)
    for (const company of companies) {
      if (company.status !== "Neu") continue;
      const created = new Date(company.created_date);
      const lastContact = lastContactByCompany[company.id];
      const lastActivity = lastContact ? new Date(lastContact) : created;

      if (lastActivity < thirtyDaysAgo) {
        await base44.asServiceRole.entities.Company.update(company.id, {
          status: "Verloren",
          notizen: (company.notizen || "") + `\n[Cleanup Agent ${now.toLocaleDateString('de')}]: Lead archiviert – kein Kontakt seit 30+ Tagen.`
        });
        deadLeadsMarked++;
      }
    }

    // Delete completed tasks older than 60 days
    for (const task of tasks) {
      if (task.erledigt && task.updated_date && new Date(task.updated_date) < sixtyDaysAgo) {
        await base44.asServiceRole.entities.Task.delete(task.id);
        tasksDeleted++;
      }
    }

    // Find duplicates (same name, case-insensitive)
    const nameMap = {};
    for (const company of companies) {
      const key = company.name?.toLowerCase().trim();
      if (!key) continue;
      if (!nameMap[key]) nameMap[key] = [];
      nameMap[key].push(company.id);
    }
    for (const [name, ids] of Object.entries(nameMap)) {
      if (ids.length > 1) duplicatesFound.push({ name, count: ids.length, ids });
    }

    return Response.json({
      success: true,
      ran_at: now.toISOString(),
      dead_leads_archived: deadLeadsMarked,
      tasks_deleted: tasksDeleted,
      duplicates_found: duplicatesFound.length,
      duplicates: duplicatesFound,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});