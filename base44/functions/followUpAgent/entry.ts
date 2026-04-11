import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Follow-Up Agent: täglich ausgeführt
// 1. Rückruf-Leads ohne offene Task → Task erstellen
// 2. Kontakt-Leads ohne Kontakt seit 7 Tagen → Nachfassen-Task
// 3. Angebot-Leads ohne Kontakt seit 7 Tagen → Erinnerung
// 4. Inaktive Leads (alle Status, 30 Tage kein Kontakt) → "Nachfassen" Task

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [companies, tasks, contactLogs] = await Promise.all([
      base44.asServiceRole.entities.Company.list('-created_date', 1000),
      base44.asServiceRole.entities.Task.list('-created_date', 500),
      base44.asServiceRole.entities.ContactLog.list('-created_date', 2000),
    ]);

    const activeCompanies = companies.filter(c =>
      !["Gewonnen", "Verloren"].includes(c.status) && !c.is_blacklisted
    );

    // Last contact per company
    const lastContactByCompany = {};
    for (const log of contactLogs) {
      if (!lastContactByCompany[log.company_id] ||
          new Date(log.created_date) > new Date(lastContactByCompany[log.company_id])) {
        lastContactByCompany[log.company_id] = log.created_date;
      }
    }

    const openTasksByCompany = {};
    for (const task of tasks.filter(t => !t.erledigt)) {
      if (!openTasksByCompany[task.company_id]) openTasksByCompany[task.company_id] = [];
      openTasksByCompany[task.company_id].push(task);
    }

    let tasksCreated = 0;

    // 1. Rückruf-Status ohne offene Rückruf-Task
    const rückrufCompanies = activeCompanies.filter(c => c.status === "Rückruf");
    for (const company of rückrufCompanies) {
      const hasRückrufTask = (openTasksByCompany[company.id] || []).some(t => t.typ === "Rückruf");
      if (!hasRückrufTask) {
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

    // 2. Kontakt-Status ohne Kontakt seit 7 Tagen → Nachfassen
    for (const company of activeCompanies.filter(c => c.status === "Kontakt")) {
      const lastContact = lastContactByCompany[company.id];
      if (!lastContact || new Date(lastContact) < sevenDaysAgo) {
        const hasOpenTask = (openTasksByCompany[company.id] || []).length > 0;
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
          tasksCreated++;
        }
      }
    }

    // 3. Angebot-Status ohne Kontakt seit 7 Tagen → Erinnerung Follow-Up
    for (const company of activeCompanies.filter(c => c.status === "Angebot")) {
      const lastContact = lastContactByCompany[company.id];
      if (!lastContact || new Date(lastContact) < sevenDaysAgo) {
        const hasNachfassTask = (openTasksByCompany[company.id] || []).some(t => t.typ === "Nachfassen");
        if (!hasNachfassTask) {
          await base44.asServiceRole.entities.Task.create({
            company_id: company.id,
            company_name: company.name,
            titel: `Angebot nachfassen: ${company.name} – seit 7 Tagen kein Feedback`,
            typ: "Nachfassen",
            prioritaet: "Hoch",
            faellig_am: new Date().toISOString(),
            erledigt: false,
            assigned_to: company.assigned_to,
          });
          tasksCreated++;
        }
      }
    }

    // 4. Alle aktiven Leads – seit 30 Tagen kein Kontakt → reaktivieren
    for (const company of activeCompanies.filter(c => !["Rückruf", "Angebot", "Termin"].includes(c.status))) {
      const lastContact = lastContactByCompany[company.id];
      const lastActivity = lastContact ? new Date(lastContact) : new Date(company.created_date);
      if (lastActivity < thirtyDaysAgo) {
        const hasOpenTask = (openTasksByCompany[company.id] || []).length > 0;
        if (!hasOpenTask) {
          await base44.asServiceRole.entities.Task.create({
            company_id: company.id,
            company_name: company.name,
            titel: `Reaktivieren: ${company.name} – seit 30 Tagen inaktiv`,
            typ: "Nachfassen",
            prioritaet: "Mittel",
            faellig_am: new Date().toISOString(),
            erledigt: false,
            assigned_to: company.assigned_to,
          });
          tasksCreated++;
        }
      }
    }

    return Response.json({
      success: true,
      ran_at: now.toISOString(),
      tasks_created: tasksCreated,
      active_companies: activeCompanies.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});