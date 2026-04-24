import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const testMode = body.testMode === true;
    const testEmail = body.testEmail || null;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const dateStr = now.toLocaleDateString('de-DE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Alle Daten parallel laden
    const [users, contactLogs, tasks] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 100),
      base44.asServiceRole.entities.ContactLog.list('-created_date', 500),
      base44.asServiceRole.entities.Task.list('-faellig_am', 200),
    ]);

    // Heutige Logs (seit Mitternacht)
    const todayLogs = contactLogs.filter(log =>
      new Date(log.created_date) >= todayStart
    );

    const targetUsers = testEmail
      ? users.filter(u => u.email === testEmail)
      : users;

    const results = [];

    for (const user of targetUsers) {
      if (!user.email) continue;

      const firstName = user.full_name?.split(' ')[0] || user.email.split('@')[0];

      // Hat der User heute schon einen Log eingetragen?
      const userTodayLogs = todayLogs.filter(log => log.user_email === user.email);
      const hasLoggedToday = userTodayLogs.length > 0;

      if (hasLoggedToday && !testMode) {
        // Schon aktiv – kein Reminder nötig
        console.log(`${user.email} already logged ${userTodayLogs.length} contact(s) today. Skipping.`);
        continue;
      }

      // Offene Aufgaben des Users zählen
      const openTasks = tasks.filter(t =>
        !t.erledigt && t.assigned_to === user.email
      );

      // Gestriger und diese-Woche-Counter für Kontext
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);

      const weekLogs = contactLogs.filter(log =>
        log.user_email === user.email &&
        new Date(log.created_date) >= weekStart
      );

      // Motivierende Nachrichten rotieren
      const motivations = [
        { emoji: "🔥", text: "Die besten Deals entstehen durch Konsequenz. Ein Anruf kann alles ändern!" },
        { emoji: "💪", text: "Jeder Kontakt bringt dich näher zum nächsten Abschluss. Fang jetzt an!" },
        { emoji: "🎯", text: "Dein nächster Kunde wartet schon auf deinen Anruf. Greif zum Hörer!" },
        { emoji: "🚀", text: "Vertrieb ist ein Zahlenspiel – je mehr du kontaktierst, desto mehr gewinnst du!" },
        { emoji: "⚡", text: "Ein kurzes Gespräch heute kann morgen ein unterschriebenes Angebot sein!" },
      ];
      const motivation = motivations[now.getDay() % motivations.length];

      const emailBody = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#0f4cb3;border-radius:12px 12px 0 0;padding:28px 32px;">
          <div style="font-size:26px;font-weight:800;color:white;">
            ${motivation.emoji} Hey ${firstName}, noch kein Kontakt heute!
          </div>
          <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:8px;">${dateStr}</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:28px 32px;border:1px solid #e2e8f0;border-top:none;">

          <!-- Motivation -->
          <div style="background:#eff6ff;border-left:4px solid #0f4cb3;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px;">
            <div style="font-size:15px;font-weight:600;color:#1e40af;">${motivation.text}</div>
          </div>

          <!-- Stats dieser Woche -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td align="center" style="padding:14px 8px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <div style="font-size:28px;font-weight:800;color:#0f4cb3;">${weekLogs.length}</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px;">Kontakte diese Woche</div>
              </td>
              <td width="12"></td>
              <td align="center" style="padding:14px 8px;background:#fff5f5;border-radius:8px;border:1px solid #fecaca;">
                <div style="font-size:28px;font-weight:800;color:#dc2626;">${openTasks.length}</div>
                <div style="font-size:11px;color:#dc2626;margin-top:2px;">Offene Aufgaben</div>
              </td>
              <td width="12"></td>
              <td align="center" style="padding:14px 8px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
                <div style="font-size:28px;font-weight:800;color:#16a34a;">0</div>
                <div style="font-size:11px;color:#16a34a;margin-top:2px;">Heute erfasst</div>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <p style="font-size:14px;color:#4b5563;margin-bottom:20px;">
            Öffne das CRM, ruf die nächste Firma an und trag das Ergebnis ein – es dauert nur 2 Minuten!
          </p>

          <div style="text-align:center;margin:24px 0;">
            <a href="https://huwa-sales-flow.base44.app/leads"
               style="background:#0f4cb3;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
              Jetzt Leads öffnen →
            </a>
          </div>

          ${openTasks.length > 0 ? `
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-top:16px;">
            <div style="font-size:13px;font-weight:600;color:#92400e;margin-bottom:6px;">⚠️ Du hast ${openTasks.length} offene Aufgabe${openTasks.length > 1 ? 'n' : ''}</div>
            ${openTasks.slice(0, 3).map(t => `
              <div style="font-size:12px;color:#6b7280;padding:4px 0;border-top:1px solid #fde68a;">
                📋 ${t.titel}${t.company_name ? ' · ' + t.company_name : ''}
              </div>
            `).join('')}
          </div>
          ` : ''}

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#1e293b;border-radius:0 0 12px 12px;padding:20px 32px;">
          <div style="font-size:12px;color:#94a3b8;line-height:1.8;">
            Viele Erfolge heute! 💼<br/>
            Dein Huwa Vertrieb-Team · Mittelweg 24 · 56566 Neuwied · 02601/9131820
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: testMode
          ? `[TEST] ${motivation.emoji} ${firstName}, noch kein Kontakt heute!`
          : `${motivation.emoji} ${firstName}, dein Vertriebscoach meldet sich!`,
        body: emailBody,
        from_name: "Huwa Vertrieb Coach",
      });

      console.log(`Reminder sent to ${user.email} (week logs: ${weekLogs.length}, open tasks: ${openTasks.length})`);
      results.push({ user: user.email, sent: true, weekLogs: weekLogs.length, openTasks: openTasks.length });
    }

    return Response.json({
      success: true,
      checked: targetUsers.length,
      reminders_sent: results.length,
      results,
    });

  } catch (error) {
    console.error("salesCoach error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});