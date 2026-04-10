import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Morning Report: täglich 7:30 Uhr
// Sendet jedem Vertriebler eine E-Mail mit seinen heutigen Aufgaben + überfälligen Leads

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Get all data
    const [users, tasks, companies] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 100),
      base44.asServiceRole.entities.Task.list('-created_date', 500),
      base44.asServiceRole.entities.Company.list('-created_date', 1000),
    ]);

    const reports = [];

    for (const user of users) {
      if (!user.email) continue;

      // User's overdue open tasks
      const overdueTasks = tasks.filter(t =>
        !t.erledigt &&
        t.assigned_to === user.email &&
        t.faellig_am &&
        new Date(t.faellig_am) < now
      );

      // User's tasks due today
      const todayTasks = tasks.filter(t =>
        !t.erledigt &&
        t.assigned_to === user.email &&
        t.faellig_am &&
        new Date(t.faellig_am) >= todayStart &&
        new Date(t.faellig_am) <= todayEnd
      );

      // User's Rückruf companies
      const rueckrufCompanies = companies.filter(c =>
        c.assigned_to === user.email &&
        c.status === "Rückruf"
      );

      if (overdueTasks.length === 0 && todayTasks.length === 0 && rueckrufCompanies.length === 0) {
        continue; // Nothing to report
      }

      const overdueSection = overdueTasks.length > 0 ? `
        <h3 style="color:#dc2626;margin:16px 0 8px">🔴 Überfällige Aufgaben (${overdueTasks.length})</h3>
        <ul>${overdueTasks.map(t => `<li><strong>${t.titel}</strong> – ${t.company_name || ''} (${new Date(t.faellig_am).toLocaleDateString('de')})</li>`).join('')}</ul>
      ` : '';

      const todaySection = todayTasks.length > 0 ? `
        <h3 style="color:#d97706;margin:16px 0 8px">🟡 Heute fällig (${todayTasks.length})</h3>
        <ul>${todayTasks.map(t => `<li><strong>${t.titel}</strong> – ${t.company_name || ''}</li>`).join('')}</ul>
      ` : '';

      const rueckrufSection = rueckrufCompanies.length > 0 ? `
        <h3 style="color:#2563eb;margin:16px 0 8px">📞 Offene Rückrufe (${rueckrufCompanies.length})</h3>
        <ul>${rueckrufCompanies.slice(0, 10).map(c => `<li><strong>${c.name}</strong> – ${c.telefon || 'kein Tel.'} – ${c.ort || ''}</li>`).join('')}</ul>
      ` : '';

      const body = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#1e3a5f;color:white;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">☀️ Guten Morgen, ${user.full_name || user.email.split('@')[0]}!</h1>
            <p style="margin:4px 0 0;opacity:0.8;font-size:14px;">Dein Tagesbericht – ${now.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div style="background:white;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
            ${overdueSection}
            ${todaySection}
            ${rueckrufSection}
            <hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0;">
            <p style="color:#64748b;font-size:13px;">Huwa Gebäudedienste – Vertrieb CRM</p>
          </div>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: `☀️ Dein Tagesbericht – ${overdueTasks.length + todayTasks.length + rueckrufCompanies.length} Aufgaben heute`,
        body,
        from_name: "Huwa Vertrieb",
      });

      reports.push({ user: user.email, sent: true, tasks: overdueTasks.length + todayTasks.length, callbacks: rueckrufCompanies.length });
    }

    return Response.json({ success: true, reports, total_sent: reports.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});