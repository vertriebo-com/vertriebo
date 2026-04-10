import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Priority Agent: täglich ausgeführt
// - Berechnet Priority Score für jeden Lead
// - Markiert "heiße" Leads (is_hot = true)
// - Setzt priority_score für Sortierung

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const companies = await base44.asServiceRole.entities.Company.list('-created_date', 1000);
    const contactLogs = await base44.asServiceRole.entities.ContactLog.list('-created_date', 2000);
    const tasks = await base44.asServiceRole.entities.Task.list('-created_date', 500);

    const now = new Date();

    // Group logs and tasks by company
    const logsByCompany = {};
    for (const log of contactLogs) {
      if (!logsByCompany[log.company_id]) logsByCompany[log.company_id] = [];
      logsByCompany[log.company_id].push(log);
    }

    const tasksByCompany = {};
    for (const task of tasks) {
      if (!tasksByCompany[task.company_id]) tasksByCompany[task.company_id] = [];
      tasksByCompany[task.company_id].push(task);
    }

    let updated = 0;

    for (const company of companies) {
      if (["Gewonnen", "Verloren"].includes(company.status)) continue;

      const logs = logsByCompany[company.id] || [];
      const compTasks = tasksByCompany[company.id] || [];
      let score = 0;

      // Status score
      const statusScore = { "Neu": 1, "Kontakt": 2, "Rückruf": 8, "Termin": 10, "Angebot": 9 };
      score += statusScore[company.status] || 0;

      // Recent contact bonus
      const lastLog = logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      if (lastLog) {
        const daysSinceContact = (now - new Date(lastLog.created_date)) / (1000 * 60 * 60 * 24);
        if (daysSinceContact < 1) score += 5;
        else if (daysSinceContact < 3) score += 3;
        else if (daysSinceContact > 14) score -= 3;
      }

      // Positive outcome bonus
      const positiveOutcomes = logs.filter(l =>
        ["Rückruf vereinbart", "Termin vereinbart", "Angebot gesendet"].includes(l.ergebnis)
      ).length;
      score += positiveOutcomes * 3;

      // Overdue task penalty/bonus (Rückruf overdue = still hot)
      const overdueTask = compTasks.find(t =>
        !t.erledigt && t.faellig_am && new Date(t.faellig_am) < now
      );
      if (overdueTask) score += 4;

      // Contact attempts (engagement)
      score += Math.min(logs.length, 5);

      // Distance bonus (closer = easier)
      if (company.entfernung_km && company.entfernung_km < 10) score += 2;

      const isHot = score >= 12;

      // Only update if changed
      if (company.priority_score !== score || company.is_hot !== isHot) {
        await base44.asServiceRole.entities.Company.update(company.id, {
          priority_score: score,
          is_hot: isHot,
        });
        updated++;
      }
    }

    return Response.json({
      success: true,
      ran_at: now.toISOString(),
      companies_evaluated: companies.length,
      companies_updated: updated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});