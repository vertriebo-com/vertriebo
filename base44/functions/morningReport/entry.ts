import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Morning Report: täglich 7:30 Uhr
// Sendet jedem Vertriebler eine E-Mail mit seinen heutigen Aufgaben + überfälligen Leads

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const testMode = body.testMode === true;
    const testEmail = body.testEmail || null;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Get all data via service role (works even without user session)
    const [users, tasks, companies] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 100),
      base44.asServiceRole.entities.Task.list('-created_date', 500),
      base44.asServiceRole.entities.Company.list('-created_date', 1000),
    ]);

    const reports = [];
    const targetUsers = testEmail
      ? users.filter(u => u.email === testEmail)
      : users;

    for (const user of targetUsers) {
      if (!user.email) continue;

      // Überfällige offene Aufgaben (vor heute)
      const overdueTasks = tasks.filter(t =>
        !t.erledigt &&
        t.assigned_to === user.email &&
        t.faellig_am &&
        new Date(t.faellig_am) < todayStart
      );

      // Heute fällige Aufgaben
      const todayTasks = tasks.filter(t =>
        !t.erledigt &&
        t.assigned_to === user.email &&
        t.faellig_am &&
        new Date(t.faellig_am) >= todayStart &&
        new Date(t.faellig_am) <= todayEnd
      );

      // Offene Rückrufe
      const rueckrufCompanies = companies.filter(c =>
        c.assigned_to === user.email &&
        c.status === "Rückruf"
      );

      const totalItems = overdueTasks.length + todayTasks.length + rueckrufCompanies.length;

      // Im Testmodus trotzdem senden, sonst nur wenn es etwas zu berichten gibt
      if (!testMode && totalItems === 0) continue;

      const overdueSection = overdueTasks.length > 0 ? `
        <h3 style="color:#dc2626;margin:16px 0 8px">🔴 Überfällige Aufgaben (${overdueTasks.length})</h3>
        <ul style="padding-left:20px;margin:0;">
          ${overdueTasks.map(t => `<li style="margin-bottom:4px;"><strong>${t.titel}</strong> – ${t.company_name || ''} <span style="color:#9ca3af;">(${new Date(t.faellig_am).toLocaleDateString('de-DE')})</span></li>`).join('')}
        </ul>
      ` : '';

      const todaySection = todayTasks.length > 0 ? `
        <h3 style="color:#d97706;margin:16px 0 8px">🟡 Heute fällig (${todayTasks.length})</h3>
        <ul style="padding-left:20px;margin:0;">
          ${todayTasks.map(t => `<li style="margin-bottom:4px;"><strong>${t.titel}</strong> – ${t.company_name || ''}</li>`).join('')}
        </ul>
      ` : '';

      const rueckrufSection = rueckrufCompanies.length > 0 ? `
        <h3 style="color:#2563eb;margin:16px 0 8px">📞 Offene Rückrufe (${rueckrufCompanies.length})</h3>
        <ul style="padding-left:20px;margin:0;">
          ${rueckrufCompanies.slice(0, 10).map(c => `<li style="margin-bottom:4px;"><strong>${c.name}</strong> – ${c.telefon || 'kein Tel.'} – ${c.ort || ''}</li>`).join('')}
        </ul>
      ` : '';

      const noItemsSection = totalItems === 0 ? `
        <p style="color:#16a34a;">✅ Alles erledigt! Heute stehen keine offenen Aufgaben oder Rückrufe an.</p>
      ` : '';

      const emailBody = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;">
          <div style="background:#0f4cb3;color:white;padding:24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:22px;">☀️ Guten Morgen, ${user.full_name || user.email.split('@')[0]}!</h1>
            <p style="margin:6px 0 0;opacity:0.85;font-size:14px;">
              Dein Tagesbericht – ${now.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style="background:white;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
            ${overdueSection}
            ${todaySection}
            ${rueckrufSection}
            ${noItemsSection}
            <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;">
            <p style="color:#64748b;font-size:12px;margin:0;">
              Huwa Gebäudereinigung & Hausmeisterdienste – Vertrieb CRM<br>
              Mittelweg 24 · 56566 Neuwied · 02601/9131820
            </p>
          </div>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: testMode
          ? `[TEST] ☀️ Tagesbericht – ${now.toLocaleDateString('de-DE')}`
          : `☀️ Dein Tagesbericht – ${totalItems > 0 ? totalItems + ' Aufgaben heute' : 'Alles erledigt!'}`,
        body: emailBody,
        from_name: "Huwa Vertrieb",
      });

      reports.push({
        user: user.email,
        sent: true,
        overdue: overdueTasks.length,
        today: todayTasks.length,
        callbacks: rueckrufCompanies.length,
        testMode,
      });
    }

    return Response.json({
      success: true,
      reports,
      total_sent: reports.length,
      total_users: users.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});