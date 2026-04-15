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
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const dateStr = now.toLocaleDateString('de-DE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Load all data + settings in parallel
    const [users, tasks, companies, settings] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 100),
      base44.asServiceRole.entities.Task.list('-created_date', 500),
      base44.asServiceRole.entities.Company.list('-created_date', 1000),
      base44.asServiceRole.entities.AppSettings.list(),
    ]);

    // Extract customizable settings
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });

    const accentColor = settingsMap["report_accent_color"] || "#0f4cb3";
    const greetingTemplate = settingsMap["report_greeting"] || "Guten Morgen, {name}! Hier ist dein Tagesbericht für heute.";
    const signatureText = settingsMap["report_signature"] || "Viele Erfolge heute!\n\nDein Huwa Vertrieb-Team\nMittelweg 24 · 56566 Neuwied · 02601/9131820";

    const reports = [];
    const targetUsers = testEmail
      ? users.filter(u => u.email === testEmail)
      : users;

    for (const user of targetUsers) {
      if (!user.email) continue;

      const firstName = user.full_name?.split(' ')[0] || user.email.split('@')[0];
      const greeting = greetingTemplate.replace('{name}', firstName);

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
      if (!testMode && totalItems === 0) continue;

      // Build summary stats bar
      const statsBar = `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
          <tr>
            <td align="center" style="padding:12px 8px;background:#fff5f5;border-radius:8px;border:1px solid #fecaca;">
              <div style="font-size:22px;font-weight:700;color:#dc2626;">${overdueTasks.length}</div>
              <div style="font-size:11px;color:#dc2626;margin-top:2px;">Überfällig</div>
            </td>
            <td width="8"></td>
            <td align="center" style="padding:12px 8px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;">
              <div style="font-size:22px;font-weight:700;color:#d97706;">${todayTasks.length}</div>
              <div style="font-size:11px;color:#d97706;margin-top:2px;">Heute fällig</div>
            </td>
            <td width="8"></td>
            <td align="center" style="padding:12px 8px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
              <div style="font-size:22px;font-weight:700;color:#2563eb;">${rueckrufCompanies.length}</div>
              <div style="font-size:11px;color:#2563eb;margin-top:2px;">Rückrufe offen</div>
            </td>
          </tr>
        </table>
      `;

      const overdueSection = overdueTasks.length > 0 ? `
        <div style="margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <span style="background:#dc2626;color:white;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">!</span>
            <span style="font-size:14px;font-weight:700;color:#dc2626;">Überfällige Aufgaben</span>
          </div>
          ${overdueTasks.map(t => `
            <div style="background:#fff5f5;border-left:3px solid #dc2626;border-radius:0 6px 6px 0;padding:10px 12px;margin-bottom:6px;">
              <div style="font-size:13px;font-weight:600;color:#1f2937;">${t.titel}</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px;">${t.company_name || ''} · fällig ${new Date(t.faellig_am).toLocaleDateString('de-DE')}</div>
            </div>
          `).join('')}
        </div>
      ` : '';

      const todaySection = todayTasks.length > 0 ? `
        <div style="margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <span style="background:#d97706;color:white;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;">◷</span>
            <span style="font-size:14px;font-weight:700;color:#d97706;">Heute fällig</span>
          </div>
          ${todayTasks.map(t => `
            <div style="background:#fffbeb;border-left:3px solid #d97706;border-radius:0 6px 6px 0;padding:10px 12px;margin-bottom:6px;">
              <div style="font-size:13px;font-weight:600;color:#1f2937;">${t.titel}</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px;">${t.company_name || ''}</div>
            </div>
          `).join('')}
        </div>
      ` : '';

      const rueckrufSection = rueckrufCompanies.length > 0 ? `
        <div style="margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <span style="background:#2563eb;color:white;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;">✆</span>
            <span style="font-size:14px;font-weight:700;color:#2563eb;">Offene Rückrufe</span>
          </div>
          ${rueckrufCompanies.slice(0, 10).map(c => `
            <div style="background:#eff6ff;border-left:3px solid #2563eb;border-radius:0 6px 6px 0;padding:10px 12px;margin-bottom:6px;">
              <div style="font-size:13px;font-weight:600;color:#1f2937;">${c.name}</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px;">${c.telefon ? '📞 ' + c.telefon + ' · ' : ''}${c.ort || ''}</div>
            </div>
          `).join('')}
        </div>
      ` : '';

      const noItemsSection = totalItems === 0 ? `
        <div style="text-align:center;padding:32px 20px;background:#f0fdf4;border-radius:8px;margin-bottom:20px;">
          <div style="font-size:32px;margin-bottom:8px;">✅</div>
          <div style="font-size:15px;font-weight:600;color:#16a34a;">Alles erledigt!</div>
          <div style="font-size:13px;color:#4ade80;margin-top:4px;">Heute stehen keine offenen Aufgaben an.</div>
        </div>
      ` : '';

      const signatureHtml = signatureText.split('\n').map(line => line ? `<div>${line}</div>` : '<div style="height:6px;"></div>').join('');

      const emailBody = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:${accentColor};border-radius:12px 12px 0 0;padding:28px 32px;">
          <div style="font-size:24px;font-weight:800;color:white;letter-spacing:-0.5px;">
            ☀️ ${greeting}
          </div>
          <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:8px;">${dateStr}</div>
          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 12px;margin-top:10px;font-size:12px;color:white;">
            Huwa Vertrieb CRM · Tagesbericht
          </div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:28px 32px;border:1px solid #e2e8f0;border-top:none;">
          ${statsBar}
          ${overdueSection}
          ${todaySection}
          ${rueckrufSection}
          ${noItemsSection}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#1e293b;border-radius:0 0 12px 12px;padding:20px 32px;">
          <div style="font-size:12px;color:#94a3b8;line-height:1.8;">
            ${signatureHtml}
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
          ? `[TEST] ☀️ Tagesbericht – ${dateStr}`
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