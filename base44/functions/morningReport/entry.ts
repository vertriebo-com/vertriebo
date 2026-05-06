import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const testMode = body.testMode === true;
    const testEmail = body.testEmail || null;

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const dayName = now.toLocaleDateString('de-DE', { weekday: 'long' });
    const dateStr = now.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });

    const motivationalQuotes = [
      "Jeder Anruf bringt dich näher zum nächsten Abschluss. Los geht's! 💪",
      "Erfolg ist kein Zufall – er ist das Ergebnis konsequenter Arbeit. 🚀",
      "Ein Nein heute ist vielleicht das Ja von morgen. Bleib dran! 🎯",
      "Die besten Vertriebler geben nicht auf – du bist einer von ihnen. 🏆",
      "Heute ist ein neuer Tag voller Möglichkeiten. Pack sie an! ⚡",
      "Qualität schlägt Quantität – aber heute machen wir beides! 💼",
      "Dein nächster Abschluss wartet – ruf jetzt an! 📞",
    ];
    const todayQuote = motivationalQuotes[now.getDay() % motivationalQuotes.length];

    const [users, tasks, companies, settings, contactLogs] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 100),
      base44.asServiceRole.entities.Task.list('-created_date', 500),
      base44.asServiceRole.entities.Company.list('-created_date', 1000),
      base44.asServiceRole.entities.AppSettings.list(),
      base44.asServiceRole.entities.ContactLog.list('-created_date', 300),
    ]);

    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });
    const logoUrl = settingsMap["email_logo_url"] || null;

    const reports = [];
    const targetUsers = testEmail ? users.filter(u => u.email === testEmail) : users;

    for (const user of targetUsers) {
      if (!user.email) continue;

      const firstName = user.full_name?.split(' ')[0] || user.email.split('@')[0];

      const overdueTasks = tasks.filter(t =>
        !t.erledigt && t.assigned_to === user.email && t.faellig_am &&
        new Date(t.faellig_am) < todayStart
      );

      const todayTasks = tasks.filter(t =>
        !t.erledigt && t.assigned_to === user.email && t.faellig_am &&
        new Date(t.faellig_am) >= todayStart && new Date(t.faellig_am) <= todayEnd
      );

      const rueckrufCompanies = companies.filter(c =>
        c.assigned_to === user.email && c.status === "Rückruf"
      ).slice(0, 10);

      const hotLeads = companies.filter(c =>
        c.assigned_to === user.email && c.is_hot && !["Gewonnen", "Verloren"].includes(c.status)
      ).slice(0, 5);

      // Calls made yesterday
      const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = new Date(yesterday); yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday); yesterdayEnd.setHours(23, 59, 59, 999);
      const yesterdayCalls = contactLogs.filter(l =>
        l.user_email === user.email && l.typ === "Anruf" &&
        new Date(l.created_date) >= yesterdayStart && new Date(l.created_date) <= yesterdayEnd
      ).length;

      const totalItems = overdueTasks.length + todayTasks.length + rueckrufCompanies.length;
      if (!testMode && totalItems === 0) continue;

      const headerLogo = logoUrl
        ? `<img src="${logoUrl}" alt="Huwa Logo" style="max-height:52px;max-width:160px;object-fit:contain;display:block;"/>`
        : `<div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Huwa Gebäudedienste</div>
           <div style="font-size:10px;color:rgba(255,255,255,0.65);margin-top:3px;text-transform:uppercase;letter-spacing:1px;">Gebäudereinigung &amp; Hausmeisterdienste</div>`;

      // ── Stats Kacheln ──────────────────────────────────────────────────────
      const statsBar = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td width="22%" align="center" style="padding:14px 6px;background:#fff5f5;border-radius:12px;border:1px solid #fecaca;">
      <div style="font-size:26px;font-weight:900;color:#dc2626;line-height:1;">${overdueTasks.length}</div>
      <div style="font-size:10px;font-weight:700;color:#dc2626;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Überfällig</div>
    </td>
    <td width="4%"></td>
    <td width="22%" align="center" style="padding:14px 6px;background:#fffbeb;border-radius:12px;border:1px solid #fde68a;">
      <div style="font-size:26px;font-weight:900;color:#d97706;line-height:1;">${todayTasks.length}</div>
      <div style="font-size:10px;font-weight:700;color:#d97706;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Heute fällig</div>
    </td>
    <td width="4%"></td>
    <td width="22%" align="center" style="padding:14px 6px;background:#eff6ff;border-radius:12px;border:1px solid #bfdbfe;">
      <div style="font-size:26px;font-weight:900;color:#1d4ed8;line-height:1;">${rueckrufCompanies.length}</div>
      <div style="font-size:10px;font-weight:700;color:#1d4ed8;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Rückrufe</div>
    </td>
    <td width="4%"></td>
    <td width="22%" align="center" style="padding:14px 6px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;">
      <div style="font-size:26px;font-weight:900;color:#16a34a;line-height:1;">${yesterdayCalls}</div>
      <div style="font-size:10px;font-weight:700;color:#16a34a;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Calls gestern</div>
    </td>
  </tr>
</table>`;

      // ── Motivations-Banner ─────────────────────────────────────────────────
      const motivationBanner = `
<div style="background:linear-gradient(135deg,#1d4ed8,#4f46e5);border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:center;">
  <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.9);line-height:1.6;">${todayQuote}</div>
</div>`;

      // ── Überfällige Aufgaben ───────────────────────────────────────────────
      const overdueSection = overdueTasks.length > 0 ? `
<div style="margin-bottom:22px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr>
    <td style="vertical-align:middle;">
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <div style="background:#dc2626;color:white;border-radius:8px;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;">!</div>
        <span style="font-size:14px;font-weight:800;color:#dc2626;">Überfällige Aufgaben</span>
      </div>
      <div style="font-size:11px;color:#9ca3af;margin-top:3px;margin-left:34px;">Sofort erledigen – diese Aufgaben warten zu lange</div>
    </td>
  </tr></table>
  ${overdueTasks.map(t => `
  <div style="background:#fff5f5;border-left:4px solid #dc2626;border-radius:0 10px 10px 0;padding:12px 14px;margin-bottom:7px;">
    <div style="font-size:13px;font-weight:700;color:#1f2937;">${t.titel}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:3px;">
      ${t.company_name ? `🏢 ${t.company_name} &nbsp;·&nbsp;` : ''}
      <span style="color:#dc2626;font-weight:600;">📅 Fällig seit ${new Date(t.faellig_am).toLocaleDateString('de-DE')}</span>
      ${t.typ ? `&nbsp;·&nbsp;<span style="background:#fee2e2;color:#dc2626;padding:1px 7px;border-radius:20px;font-size:10px;font-weight:700;">${t.typ}</span>` : ''}
    </div>
  </div>`).join('')}
</div>` : '';

      // ── Heute fällig ───────────────────────────────────────────────────────
      const todaySection = todayTasks.length > 0 ? `
<div style="margin-bottom:22px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr>
    <td>
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <div style="background:#d97706;color:white;border-radius:8px;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;font-size:13px;">⏰</div>
        <span style="font-size:14px;font-weight:800;color:#d97706;">Heute zu erledigen</span>
      </div>
      <div style="font-size:11px;color:#9ca3af;margin-top:3px;margin-left:34px;">Diese Aufgaben stehen heute auf deinem Plan</div>
    </td>
  </tr></table>
  ${todayTasks.map(t => {
    const uhrzeit = t.faellig_am ? new Date(t.faellig_am).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
    return `
  <div style="background:#fffbeb;border-left:4px solid #d97706;border-radius:0 10px 10px 0;padding:12px 14px;margin-bottom:7px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><div style="font-size:13px;font-weight:700;color:#1f2937;">${t.titel}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:3px;">${t.company_name ? `🏢 ${t.company_name}` : ''}${t.prioritaet === 'Hoch' ? '&nbsp;<span style="background:#fef2f2;color:#dc2626;padding:1px 7px;border-radius:20px;font-size:10px;font-weight:700;">HOCH</span>' : ''}</div></td>
      ${uhrzeit ? `<td align="right"><div style="background:#fde68a;color:#92400e;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;">${uhrzeit} Uhr</div></td>` : ''}
    </tr></table>
  </div>`;
  }).join('')}
</div>` : '';

      // ── Heiße Leads ────────────────────────────────────────────────────────
      const hotSection = hotLeads.length > 0 ? `
<div style="margin-bottom:22px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr>
    <td>
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <div style="background:linear-gradient(135deg,#f97316,#dc2626);color:white;border-radius:8px;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;font-size:13px;">🔥</div>
        <span style="font-size:14px;font-weight:800;color:#ea580c;">Heiße Leads – jetzt nachfassen!</span>
      </div>
      <div style="font-size:11px;color:#9ca3af;margin-top:3px;margin-left:34px;">Diese Firmen haben hohes Abschlusspotenzial</div>
    </td>
  </tr></table>
  ${hotLeads.map(c => `
  <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border-left:4px solid #f97316;border-radius:0 10px 10px 0;padding:12px 14px;margin-bottom:7px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><div style="font-size:13px;font-weight:700;color:#1f2937;">🔥 ${c.name}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:2px;">${c.branche || ''}${c.ort ? ' · 📍 ' + c.ort : ''} · Status: ${c.status}</div></td>
      ${c.telefon ? `<td align="right"><a href="tel:${c.telefon}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#dc2626);color:white;text-decoration:none;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;">📞 ${c.telefon}</a></td>` : ''}
    </tr></table>
  </div>`).join('')}
</div>` : '';

      // ── Rückrufe ───────────────────────────────────────────────────────────
      const rueckrufSection = rueckrufCompanies.length > 0 ? `
<div style="margin-bottom:22px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr>
    <td>
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <div style="background:#1d4ed8;color:white;border-radius:8px;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;font-size:13px;">📞</div>
        <span style="font-size:14px;font-weight:800;color:#1d4ed8;">Offene Rückrufe</span>
      </div>
      <div style="font-size:11px;color:#9ca3af;margin-top:3px;margin-left:34px;">${rueckrufCompanies.length} Firma${rueckrufCompanies.length === 1 ? '' : 'en'} warte${rueckrufCompanies.length === 1 ? 't' : 'n'} auf deinen Anruf</div>
    </td>
  </tr></table>
  ${rueckrufCompanies.map((c, i) => `
  <div style="background:${i % 2 === 0 ? '#eff6ff' : '#f8faff'};border-left:4px solid #1d4ed8;border-radius:0 10px 10px 0;padding:11px 14px;margin-bottom:7px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><div style="font-size:13px;font-weight:700;color:#1f2937;">${c.name}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:2px;">${c.ort ? '📍 ' + c.ort : ''}${c.branche ? ' · ' + c.branche : ''}</div></td>
      ${c.telefon ? `<td align="right"><a href="tel:${c.telefon}" style="display:inline-block;background:#1d4ed8;color:white;text-decoration:none;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;">📞 ${c.telefon}</a></td>` : ''}
    </tr></table>
  </div>`).join('')}
</div>` : '';

      // ── Alles erledigt ─────────────────────────────────────────────────────
      const noItemsSection = totalItems === 0 ? `
<div style="text-align:center;padding:40px 24px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:16px;margin-bottom:24px;">
  <div style="font-size:48px;margin-bottom:12px;">🎉</div>
  <div style="font-size:18px;font-weight:900;color:#15803d;margin-bottom:6px;">Alles erledigt – Perfekt!</div>
  <div style="font-size:13px;color:#16a34a;line-height:1.6;">Heute stehen keine offenen Aufgaben an.<br/>Zeit für neue Leads – leg los!</div>
</div>` : '';

      // ── Full Email HTML ────────────────────────────────────────────────────
      const emailBody = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Tagesbericht ${dateStr}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:28px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%);padding:22px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;">${headerLogo}</td>
      <td align="right" style="vertical-align:middle;">
        <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:7px 13px;text-align:right;">
          <div style="font-size:10px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.8px;">Tagesbericht</div>
          <div style="font-size:13px;font-weight:800;color:white;">${dayName}</div>
        </div>
      </td>
    </tr></table>
  </td></tr>

  <!-- RAINBOW STRIPE -->
  <tr><td style="height:3px;background:linear-gradient(90deg,#60a5fa,#a78bfa,#34d399);padding:0;"></td></tr>

  <!-- GREETING -->
  <tr><td style="background:#f8fafc;padding:20px 32px;border-bottom:1px solid #e5e7eb;">
    <div style="font-size:19px;font-weight:900;color:#1e3a8a;">Guten Morgen, ${firstName}! ☀️</div>
    <div style="font-size:12px;color:#6b7280;margin-top:5px;">${dateStr} · Dein persönlicher Tagesplan</div>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:28px 32px;">
    ${statsBar}
    ${totalItems > 0 ? motivationBanner : ''}
    ${overdueSection}
    ${todaySection}
    ${hotSection}
    ${rueckrufSection}
    ${noItemsSection}
  </td></tr>

  <!-- DIVIDER -->
  <tr><td style="padding:0 32px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#1e293b;border-radius:0 0 16px 16px;padding:22px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:top;">
        <div style="font-size:13px;font-weight:800;color:#ffffff;margin-bottom:7px;">Huwa Gebäudedienste GmbH</div>
        <div style="font-size:11px;color:#94a3b8;line-height:1.9;">
          Mittelweg 24 · 56566 Neuwied<br/>
          📞 <a href="tel:026019131820" style="color:#60a5fa;text-decoration:none;font-weight:600;">02601 / 9131820</a><br/>
          ✉️ <a href="mailto:info@huwa-gebaeudedienste.de" style="color:#60a5fa;text-decoration:none;">info@huwa-gebaeudedienste.de</a>
        </div>
      </td>
      <td align="right" style="vertical-align:top;">
        <div style="font-size:10px;color:#475569;text-align:right;line-height:1.8;">
          Automatisch generiert von<br/>
          <span style="color:#60a5fa;font-weight:700;">Huwa CRM</span>
        </div>
      </td>
    </tr></table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

      const overdueFlag = overdueTasks.length > 0 ? '🔴 ' : '';
      const subject = testMode
        ? `[TEST] ☀️ Tagesbericht ${firstName} – ${dateStr}`
        : `${overdueFlag}☀️ Guten Morgen ${firstName}! ${totalItems > 0 ? totalItems + ' Aufgabe' + (totalItems === 1 ? '' : 'n') + ' heute' : 'Alles erledigt 🎉'} – ${dayName}`;

      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": Deno.env.get("BREVO_API_KEY"),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "Huwa Vertrieb CRM", email: "info@huwa-gebaeudedienste.de" },
          to: [{ email: user.email }],
          subject,
          htmlContent: emailBody,
        }),
      });

      if (!brevoRes.ok) {
        const err = await brevoRes.json();
        console.error(`Brevo error for ${user.email}:`, JSON.stringify(err));
        throw new Error(`Brevo: ${JSON.stringify(err)}`);
      }

      reports.push({
        user: user.email,
        sent: true,
        overdue: overdueTasks.length,
        today: todayTasks.length,
        callbacks: rueckrufCompanies.length,
        hotLeads: hotLeads.length,
        yesterdayCalls,
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
    console.error("morningReport error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});