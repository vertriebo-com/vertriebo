import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Follow-Up Agent: täglich ausgeführt
// - Markiert Leads als "überfällig" wenn kein Kontakt seit X Tagen
// - Erstellt Auto-Tasks für überfällige Rückrufe
// - Schreibt Report in ActivityLog

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Get all active companies (not won/lost)
    const companies = await base44.asServiceRole.entities.Company.list('-created_date', 1000);
    const activeCompanies = companies.filter(c =>
      !["Gewonnen", "Verloren"].includes(c.status) && !c.is_blacklisted
    );

    // Get all open tasks (overdue callbacks)
    const tasks = await base44.asServiceRole.entities.Task.list('-created_date', 500);
    const overdueCallbacks = tasks.filter(t =>
      !t.erledigt &&
      t.typ === "Rückruf" &&
      t.faellig_am &&
      new Date(t.faellig_am) < now
    );

    // For "Rückruf" status companies without a task, create one
    const companiesWithRueckruf = activeCompanies.filter(c => c.status === "Rückruf");
    const existingTaskCompanyIds = new Set(tasks.filter(t => !t.erledigt && t.typ === "Rückruf").map(t => t.company_id));

    let tasksCreated = 0;
    for (const company of companiesWithRueckruf) {
      if (!existingTaskCompanyIds.has(company.id)) {
        await base44.asServiceRole.entities.Task.create({
          company_id: company.id,
          company_name: company.name,
          titel: `Rückruf: ${company.name}`,
          typ: "Rückruf",
          prioritaet: "Hoch",
          faellig_am: new Date().toISOString(),
          erledigt: false,
          assigned_to: company.assigned_to,
        });
        tasksCreated++;
      }
    }

    // Mark companies as stale if no contact in 7+ days (only "Kontakt" status)
    const contactLogs = await base44.asServiceRole.entities.ContactLog.list('-created_date', 2000);
    const lastContactByCompany = {};
    for (const log of contactLogs) {
      if (!lastContactByCompany[log.company_id] ||
          new Date(log.created_date) > new Date(lastContactByCompany[log.company_id])) {
        lastContactByCompany[log.company_id] = log.created_date;
      }
    }

    // Companies in "Kontakt" status with no contact in 7 days → bump priority
    let priorityUpdated = 0;
    for (const company of activeCompanies.filter(c => c.status === "Kontakt")) {
      const lastContact = lastContactByCompany[company.id];
      if (!lastContact || new Date(lastContact) < sevenDaysAgo) {
        // Create a follow-up task if none exists
        const hasOpenTask = tasks.some(t => !t.erledigt && t.company_id === company.id);
        if (!hasOpenTask) {
          await base44.asServiceRole.entities.Task.create({
            company_id: company.id,
            company_name: company.name,
            titel: `Nachfassen: ${company.name} – kein Kontakt seit 7 Tagen`,
            typ: "Nachfassen",
            prioritaet: "Hoch",
            faellig_am: new Date().toISOString(),
            erledigt: false,
            assigned_to: company.assigned_to,
          });
          priorityUpdated++;
        }
      }
    }

    return Response.json({
      success: true,
      ran_at: now.toISOString(),
      overdue_callbacks: overdueCallbacks.length,
      tasks_created: tasksCreated,
      followup_tasks_created: priorityUpdated,
      active_companies: activeCompanies.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});