// ─── Shared building blocks ───────────────────────────────────────────────────

export const SIGNATURE = `
<table cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:2px solid #e5e7eb;padding-top:20px;width:100%;">
  <tr>
    <td style="vertical-align:top;">
      <div style="font-size:14px;font-weight:900;color:#1d4ed8;letter-spacing:-0.3px;">Huwa Gebäudedienste GmbH</div>
      <div style="font-size:12px;color:#6b7280;margin-top:5px;line-height:1.9;">
        Mittelweg 24 · 56566 Neuwied<br/>
        <strong style="color:#374151;">Ansprechpartner:</strong> Ouajih Chtatou<br/>
        📞 <a href="tel:026019131820" style="color:#1d4ed8;text-decoration:none;font-weight:700;">02601 / 9131820</a><br/>
        ✉️ <a href="mailto:info@huwa-gebaeudedienste.de" style="color:#1d4ed8;text-decoration:none;">info@huwa-gebaeudedienste.de</a><br/>
        🌐 <a href="https://www.huwa-gebaeudedienste.de" style="color:#1d4ed8;text-decoration:none;">www.huwa-gebaeudedienste.de</a>
      </div>
    </td>
    <td align="right" style="vertical-align:top;">
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;text-align:center;">
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Kostenloses Angebot</div>
        <div style="font-size:15px;font-weight:900;color:#1d4ed8;">02601 / 9131820</div>
      </div>
    </td>
  </tr>
</table>`;

const TRUST_ROW = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td width="33%" style="text-align:center;padding:0 6px;">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 8px;">
        <div style="font-size:20px;margin-bottom:4px;">✅</div>
        <div style="font-size:11px;font-weight:700;color:#15803d;">TÜV-geprüfte<br/>Qualität</div>
      </div>
    </td>
    <td width="33%" style="text-align:center;padding:0 6px;">
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 8px;">
        <div style="font-size:20px;margin-bottom:4px;">🏆</div>
        <div style="font-size:11px;font-weight:700;color:#1d4ed8;">15+ Jahre<br/>Erfahrung</div>
      </div>
    </td>
    <td width="33%" style="text-align:center;padding:0 6px;">
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:12px 8px;">
        <div style="font-size:20px;margin-bottom:4px;">⚡</div>
        <div style="font-size:11px;font-weight:700;color:#b45309;">Schnell &<br/>zuverlässig</div>
      </div>
    </td>
  </tr>
</table>`;

const CTA_BUTTON = (label = "Jetzt kostenlos anfragen") => `
<div style="text-align:center;margin:28px 0;">
  <a href="tel:026019131820" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:14px 36px;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(29,78,216,0.35);">${label}</a>
  <div style="margin-top:8px;font-size:11px;color:#9ca3af;">Unverbindlich · Kostenlos · Innerhalb von 24h</div>
</div>`;

// ─── Templates ────────────────────────────────────────────────────────────────

export const TEMPLATES = [
  // 1. Dienstleistungen vorstellen
  {
    id: "dienstleistungen",
    label: "📋 Leistungsvorstellung",
    description: "Nach Anfrage: Alle Leistungen professionell vorstellen",
    betreff: (c) => `Professionelle Gebäudereinigung für ${c.name} – Ihr persönliches Angebot`,
    body: (c, extra) => `
<p style="margin:0 0 20px;font-size:15px;font-weight:700;color:#111827;">Sehr geehrte${c.ansprechpartner ? " " + c.ansprechpartner : " Damen und Herren"},</p>

<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.8;">
  vielen Dank für Ihr Interesse! Es freut uns, dass wir Ihnen zeigen dürfen, warum sich über <strong>200 Unternehmen</strong> in der Region auf Huwa Gebäudedienste verlassen.
</p>

<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:14px;padding:22px 26px;margin:0 0 22px;">
  <div style="font-size:13px;font-weight:800;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px;">Unsere Leistungen für Sie:</div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #bfdbfe;">
        <span style="font-size:16px;margin-right:10px;">🧹</span>
        <span style="font-size:13px;font-weight:700;color:#1e3a8a;">Unterhalts- & Büroreinigung</span>
        <div style="font-size:12px;color:#4b5563;margin-left:26px;margin-top:2px;">Täglich, wöchentlich oder flexibel nach Bedarf</div>
      </td>
    </tr>
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #bfdbfe;">
        <span style="font-size:16px;margin-right:10px;">🏭</span>
        <span style="font-size:13px;font-weight:700;color:#1e3a8a;">Hallen- & Industriereinigung</span>
        <div style="font-size:12px;color:#4b5563;margin-left:26px;margin-top:2px;">Maschinelle Reinigung – auch auf Großflächen</div>
      </td>
    </tr>
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #bfdbfe;">
        <span style="font-size:16px;margin-right:10px;">✨</span>
        <span style="font-size:13px;font-weight:700;color:#1e3a8a;">Grund- & Sonderreinigung</span>
        <div style="font-size:12px;color:#4b5563;margin-left:26px;margin-top:2px;">Tiefenreinigung nach Umzug, Renovierung, Events</div>
      </td>
    </tr>
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #bfdbfe;">
        <span style="font-size:16px;margin-right:10px;">🪟</span>
        <span style="font-size:13px;font-weight:700;color:#1e3a8a;">Glas- & Fassadenreinigung</span>
        <div style="font-size:12px;color:#4b5563;margin-left:26px;margin-top:2px;">Streifenfreier Glanz – innen & außen</div>
      </td>
    </tr>
    <tr>
      <td style="padding:9px 0;">
        <span style="font-size:16px;margin-right:10px;">🔧</span>
        <span style="font-size:13px;font-weight:700;color:#1e3a8a;">Hausmeister- & Außenanlagenpflege</span>
        <div style="font-size:12px;color:#4b5563;margin-left:26px;margin-top:2px;">Winterdienst, Grünpflege, Kleinreparaturen</div>
      </td>
    </tr>
  </table>
</div>

${TRUST_ROW}

${extra.notiz ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin:0 0 20px;font-size:13px;color:#374151;"><strong>📌 Persönliche Notiz:</strong> ${extra.notiz}</div>` : ""}

<p style="margin:0 0 6px;font-size:14px;color:#374151;">Gerne erstellen wir Ihnen ein <strong>maßgeschneidertes, kostenloses Angebot</strong> – ohne lange Wartezeit und völlig unverbindlich.</p>

${CTA_BUTTON("📞 Jetzt kostenlos anfragen")}

<p style="margin:0;font-size:13px;color:#6b7280;">Oder antworten Sie einfach auf diese E-Mail – wir melden uns innerhalb von 24 Stunden bei Ihnen.</p>

${SIGNATURE}`,
  },

  // 2. Erstkontakt Follow-up
  {
    id: "erstkontakt",
    label: "👋 Erstkontakt nach Anruf",
    description: "Telefonisch nicht erreicht – schriftliche Vorstellung",
    betreff: (c) => `Kurze Vorstellung – Huwa Gebäudedienste für ${c.name}`,
    body: (c, extra) => `
<p style="margin:0 0 20px;font-size:15px;font-weight:700;color:#111827;">Sehr geehrte${c.ansprechpartner ? " " + c.ansprechpartner : " Damen und Herren"},</p>

<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.8;">
  ich habe heute versucht, Sie telefonisch zu erreichen – leider ohne Erfolg. Daher möchte ich mich kurz schriftlich vorstellen.
</p>

<div style="background:#f8fafc;border-left:4px solid #1d4ed8;border-radius:0 12px 12px 0;padding:18px 22px;margin:0 0 22px;">
  <div style="font-size:14px;font-weight:800;color:#1d4ed8;margin-bottom:10px;">Wer sind wir?</div>
  <p style="margin:0;font-size:13px;color:#374151;line-height:1.8;">
    <strong>Huwa Gebäudedienste</strong> aus Neuwied ist Ihr regionaler Partner für professionelle Gebäudereinigung und Hausmeisterdienste. Wir betreuen seit über 15 Jahren erfolgreich Büros, Praxen, Handelsflächen und Industriebetriebe – zuverlässig, sauber und zu fairen Preisen.
  </p>
</div>

<div style="background:#f0fdf4;border-radius:12px;padding:18px 22px;margin:0 0 22px;">
  <div style="font-size:13px;font-weight:800;color:#15803d;margin-bottom:10px;">Warum Kunden uns wählen:</div>
  <table cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;">✅ &nbsp;<strong>Feste Reinigungsteams</strong> – kein ständiger Wechsel</td></tr>
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;">✅ &nbsp;<strong>Transparente Abrechnung</strong> – keine versteckten Kosten</td></tr>
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;">✅ &nbsp;<strong>Flexible Zeiten</strong> – auch früh, spät oder am Wochenende</td></tr>
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;">✅ &nbsp;<strong>Kurzfristige Einsätze</strong> – Reaktionszeit unter 24h</td></tr>
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;">✅ &nbsp;<strong>Vollversichert</strong> – Betriebshaftpflicht inklusive</td></tr>
  </table>
</div>

${extra.notiz ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin:0 0 20px;font-size:13px;color:#374151;"><strong>📌 Persönliche Notiz:</strong> ${extra.notiz}</div>` : ""}

<p style="margin:0 0 6px;font-size:14px;color:#374151;">Darf ich Sie in den nächsten Tagen kurz anrufen, um Ihren Bedarf zu besprechen? Ein kostenloses Angebot erstellen wir gerne innerhalb von 24h.</p>

${CTA_BUTTON("📞 Rückruf vereinbaren")}

${SIGNATURE}`,
  },

  // 3. Terminbestätigung
  {
    id: "termin",
    label: "📅 Terminbestätigung",
    description: "Vereinbarten Vorort-Termin professionell bestätigen",
    hasDatum: true, hasUhrzeit: true,
    betreff: (c) => `Ihr Termin mit Huwa Gebäudedienste – Bestätigung`,
    body: (c, extra) => `
<p style="margin:0 0 20px;font-size:15px;font-weight:700;color:#111827;">Sehr geehrte${c.ansprechpartner ? " " + c.ansprechpartner : " Damen und Herren"},</p>

<p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.8;">
  vielen Dank für Ihre Zeit – wir freuen uns auf unser Gespräch! Hier noch einmal alle Details zu Ihrem Termin auf einen Blick:
</p>

<div style="background:linear-gradient(135deg,#1d4ed8,#1e40af);border-radius:16px;padding:28px;margin:0 0 24px;text-align:center;">
  <div style="font-size:13px;font-weight:700;color:#93c5fd;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;">Ihr Termin mit uns</div>
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td style="padding:8px 20px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">
        <div style="font-size:28px;margin-bottom:4px;">📅</div>
        <div style="font-size:11px;color:#93c5fd;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Datum</div>
        <div style="font-size:18px;font-weight:900;color:#ffffff;margin-top:4px;">${extra.datum || "Noch nicht festgelegt"}</div>
      </td>
      <td style="padding:8px 20px;text-align:center;">
        <div style="font-size:28px;margin-bottom:4px;">🕐</div>
        <div style="font-size:11px;color:#93c5fd;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Uhrzeit</div>
        <div style="font-size:18px;font-weight:900;color:#ffffff;margin-top:4px;">${extra.uhrzeit ? extra.uhrzeit + " Uhr" : "Noch nicht festgelegt"}</div>
      </td>
    </tr>
  </table>
  ${c.adresse ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.2);font-size:13px;color:#bfdbfe;">📍 ${c.adresse}, ${c.plz} ${c.ort}</div>` : ""}
</div>

<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:18px 22px;margin:0 0 22px;">
  <div style="font-size:13px;font-weight:800;color:#15803d;margin-bottom:10px;">Was erwartet Sie bei unserem Termin?</div>
  <table cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;">🔍 &nbsp;Kostenlose Besichtigung Ihrer Räumlichkeiten</td></tr>
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;">📊 &nbsp;Individuelle Bedarfsanalyse & Beratung</td></tr>
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;">💰 &nbsp;Transparentes, schriftliches Angebot vor Ort</td></tr>
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;">⏱️ &nbsp;Kein Zeitdruck – wir nehmen uns Zeit für Sie</td></tr>
  </table>
</div>

${extra.notiz ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin:0 0 20px;font-size:13px;color:#374151;"><strong>📌 Hinweis:</strong> ${extra.notiz}</div>` : ""}

<p style="margin:0 0 8px;font-size:14px;color:#374151;">Sollten Sie den Termin verschieben müssen, erreichen Sie uns jederzeit:</p>
<p style="margin:0;font-size:15px;font-weight:700;color:#1d4ed8;">📞 02601 / 9131820</p>

${SIGNATURE}`,
  },

  // 4. Angebots-Nachfassung
  {
    id: "angebot",
    label: "📊 Angebot nachfassen",
    description: "Freundlich und überzeugend nach Angebot nachfassen",
    hasDatum: true,
    betreff: (c) => `Ihr Angebot von Huwa Gebäudedienste – Haben Sie Fragen?`,
    body: (c, extra) => `
<p style="margin:0 0 20px;font-size:15px;font-weight:700;color:#111827;">Sehr geehrte${c.ansprechpartner ? " " + c.ansprechpartner : " Damen und Herren"},</p>

<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.8;">
  ich hoffe, Sie hatten die Gelegenheit, unser Angebot${extra.datum ? ` vom <strong>${extra.datum}</strong>` : ""} in Ruhe zu prüfen. Ich melde mich kurz, um zu fragen, ob noch Fragen offen sind oder ob wir etwas anpassen können.
</p>

<div style="background:#eff6ff;border-radius:14px;padding:22px 26px;margin:0 0 22px;">
  <div style="font-size:13px;font-weight:800;color:#1e3a8a;margin-bottom:14px;">Unser Angebot auf einen Blick:</div>
  <table cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="padding:7px 0;border-bottom:1px solid #bfdbfe;font-size:13px;color:#374151;">💡 &nbsp;Individuelle Reinigungslösung nach Ihrem Bedarf</td></tr>
    <tr><td style="padding:7px 0;border-bottom:1px solid #bfdbfe;font-size:13px;color:#374151;">💶 &nbsp;Faire, transparente Preise – keine versteckten Kosten</td></tr>
    <tr><td style="padding:7px 0;border-bottom:1px solid #bfdbfe;font-size:13px;color:#374151;">📋 &nbsp;Schriftlicher Vertrag mit klaren Leistungsbeschreibungen</td></tr>
    <tr><td style="padding:7px 0;font-size:13px;color:#374151;">🤝 &nbsp;Fester Ansprechpartner – persönlicher Service garantiert</td></tr>
  </table>
</div>

<div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin:0 0 22px;text-align:center;">
  <p style="margin:0;font-size:13px;color:#b45309;font-weight:700;">⏰ Unser Angebot gilt noch für <strong>14 Tage</strong> – sichern Sie sich jetzt Ihren Wunschstarttermin!</p>
</div>

${extra.notiz ? `<div style="background:#f8fafc;border-left:4px solid #1d4ed8;border-radius:0 10px 10px 0;padding:14px 18px;margin:0 0 20px;font-size:13px;color:#374151;">${extra.notiz}</div>` : ""}

<p style="margin:0 0 8px;font-size:14px;color:#374151;">Haben Sie noch Fragen oder möchten das Angebot anpassen? Ich helfe Ihnen gerne – völlig unverbindlich.</p>

${CTA_BUTTON("📞 Jetzt Rückfragen klären")}

${SIGNATURE}`,
  },

  // 5. Rückruf-Bestätigung
  {
    id: "rueckruf",
    label: "📞 Rückruf bestätigen",
    description: "Vereinbarten Rückruf verbindlich schriftlich bestätigen",
    hasDatum: true, hasUhrzeit: true,
    betreff: (c) => `Ihr Rückruf-Termin mit Huwa Gebäudedienste – Bestätigung`,
    body: (c, extra) => `
<p style="margin:0 0 20px;font-size:15px;font-weight:700;color:#111827;">Sehr geehrte${c.ansprechpartner ? " " + c.ansprechpartner : " Damen und Herren"},</p>

<p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.8;">
  vielen Dank für das nette Gespräch! Wie vereinbart, rufen wir Sie zu folgendem Zeitpunkt zurück:
</p>

<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-radius:16px;padding:28px;margin:0 0 24px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">📞</div>
  <div style="font-size:12px;color:#16a34a;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Ihr Rückruf-Termin</div>
  <div style="font-size:26px;font-weight:900;color:#15803d;">${extra.datum || "—"}</div>
  <div style="font-size:20px;font-weight:700;color:#16a34a;margin-top:4px;">${extra.uhrzeit ? "um " + extra.uhrzeit + " Uhr" : ""}</div>
  <div style="margin-top:14px;padding-top:14px;border-top:1px solid #86efac;font-size:12px;color:#15803d;font-weight:600;">Wir rufen Sie pünktlich an – versprochen! ✅</div>
</div>

${extra.notiz ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin:0 0 20px;font-size:13px;color:#374151;"><strong>📌 Worum es geht:</strong> ${extra.notiz}</div>` : ""}

<p style="margin:0 0 8px;font-size:14px;color:#374151;">Falls Sie vorher Fragen haben oder den Termin anpassen möchten, erreichen Sie uns jederzeit:</p>
<div style="background:#f8fafc;border-radius:10px;padding:14px 18px;margin:0 0 20px;text-align:center;">
  <span style="font-size:16px;font-weight:900;color:#1d4ed8;">📞 02601 / 9131820</span>
</div>

<p style="margin:0;font-size:13px;color:#6b7280;">Wir freuen uns auf das Gespräch und darauf, für ${c.name} die passende Reinigungslösung zu finden.</p>

${SIGNATURE}`,
  },

  // 6. NEU: Konkurrenz-Wechsel
  {
    id: "wechsel",
    label: "🔄 Anbieterwechsel vorschlagen",
    description: "Wenn Firma bereits einen Dienstleister hat – Wechsel empfehlen",
    betreff: (c) => `Bessere Reinigung für ${c.name} – Kostenfreier Vergleich`,
    body: (c, extra) => `
<p style="margin:0 0 20px;font-size:15px;font-weight:700;color:#111827;">Sehr geehrte${c.ansprechpartner ? " " + c.ansprechpartner : " Damen und Herren"},</p>

<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.8;">
  wir wissen, dass Sie bereits einen Reinigungsdienstleister haben – und genau deshalb schreibe ich Ihnen. Viele unserer heutigen Kunden haben uns nach einem Vergleich gewählt. Das Ergebnis: <strong>bessere Qualität, oft zu niedrigeren Kosten.</strong>
</p>

<div style="background:linear-gradient(135deg,#faf5ff,#ede9fe);border-radius:14px;padding:22px 26px;margin:0 0 22px;">
  <div style="font-size:13px;font-weight:800;color:#6d28d9;margin-bottom:14px;">Häufige Gründe für einen Wechsel zu Huwa:</div>
  <table cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="padding:8px 0;border-bottom:1px solid #ddd6fe;font-size:13px;color:#374151;">😤 &nbsp;<strong>Unzufriedenheit</strong> mit Qualität oder Zuverlässigkeit?</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #ddd6fe;font-size:13px;color:#374151;">💸 &nbsp;<strong>Preiserhöhungen</strong> ohne erkennbare Mehrleistung?</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #ddd6fe;font-size:13px;color:#374151;">🔄 &nbsp;<strong>Ständig wechselndes Personal</strong> ohne Einarbeitung?</td></tr>
    <tr><td style="padding:8px 0;font-size:13px;color:#374151;">📵 &nbsp;<strong>Schlechte Erreichbarkeit</strong> bei Problemen?</td></tr>
  </table>
</div>

<div style="background:#f0fdf4;border-radius:12px;padding:16px 20px;margin:0 0 22px;">
  <div style="font-size:13px;font-weight:800;color:#15803d;margin-bottom:10px;">So läuft ein Wechsel zu Huwa ab:</div>
  <table cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;"><span style="background:#dcfce7;color:#15803d;font-weight:800;padding:2px 8px;border-radius:20px;margin-right:8px;">1</span> Kostenlose Besichtigung & Angebot</td></tr>
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;"><span style="background:#dcfce7;color:#15803d;font-weight:800;padding:2px 8px;border-radius:20px;margin-right:8px;">2</span> Wunschstarttermin festlegen</td></tr>
    <tr><td style="padding:5px 0;font-size:13px;color:#374151;"><span style="background:#dcfce7;color:#15803d;font-weight:800;padding:2px 8px;border-radius:20px;margin-right:8px;">3</span> Nahtloser Übergang – wir koordinieren alles</td></tr>
  </table>
</div>

${extra.notiz ? `<div style="background:#f8fafc;border-left:4px solid #6d28d9;border-radius:0 10px 10px 0;padding:14px 18px;margin:0 0 20px;font-size:13px;color:#374151;">${extra.notiz}</div>` : ""}

${CTA_BUTTON("🔄 Kostenlosen Vergleich anfordern")}

<p style="margin:0;font-size:13px;color:#6b7280;">Kein Risiko: Unverbindlicher Vergleich, keine Vertragspflicht, volle Transparenz.</p>

${SIGNATURE}`,
  },

  // 7. NEU: Winterdienst
  {
    id: "winterdienst",
    label: "❄️ Winterdienst anbieten",
    description: "Saisonales Angebot für Schneeräumung & Streudienst",
    betreff: (c) => `Winterdienst für ${c.name} – Sicher durch den Winter`,
    body: (c, extra) => `
<p style="margin:0 0 20px;font-size:15px;font-weight:700;color:#111827;">Sehr geehrte${c.ansprechpartner ? " " + c.ansprechpartner : " Damen und Herren"},</p>

<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.8;">
  der Winter kommt – und mit ihm die <strong>gesetzliche Räum- und Streupflicht</strong> für Ihr Unternehmen. Als Immobilieneigentümer oder -nutzer haften Sie bei Unfällen auf Ihrem Grundstück. Wir nehmen Ihnen diese Verantwortung ab!
</p>

<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:14px;padding:22px 26px;margin:0 0 22px;">
  <div style="font-size:13px;font-weight:800;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px;">❄️ Unser Winterdienst umfasst:</div>
  <table cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="padding:8px 0;border-bottom:1px solid #bfdbfe;font-size:13px;color:#374151;">⏰ &nbsp;<strong>Früheinsatz ab 5:00 Uhr</strong> – bevor Ihre Mitarbeiter ankommen</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #bfdbfe;font-size:13px;color:#374151;">🧂 &nbsp;<strong>Streuen</strong> aller Gehwege & Zufahrten mit umweltfreundlichem Streumittel</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #bfdbfe;font-size:13px;color:#374151;">🚜 &nbsp;<strong>Schneeschieben & -räumen</strong> von Parkflächen und Eingängen</td></tr>
    <tr><td style="padding:8px 0;font-size:13px;color:#374151;">📱 &nbsp;<strong>Einsatznachweis per Protokoll</strong> – rechtssichere Dokumentation</td></tr>
  </table>
</div>

<div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin:0 0 22px;text-align:center;">
  <div style="font-size:13px;font-weight:800;color:#b45309;">⚠️ Wichtig: Räumpflicht gilt täglich ab 7:00 Uhr</div>
  <div style="font-size:12px;color:#92400e;margin-top:6px;">Bei Nichterfüllung drohen Bußgelder und Schadensersatzforderungen</div>
</div>

${extra.notiz ? `<div style="background:#f8fafc;border-left:4px solid #1d4ed8;border-radius:0 10px 10px 0;padding:14px 18px;margin:0 0 20px;font-size:13px;color:#374151;">${extra.notiz}</div>` : ""}

<p style="margin:0 0 8px;font-size:14px;color:#374151;">Sichern Sie sich jetzt Ihren Platz – unsere Kapazitäten für diese Saison sind begrenzt!</p>

${CTA_BUTTON("❄️ Jetzt Winterdienst anfragen")}

${SIGNATURE}`,
  },

  // 8. NEU: Referenz & Bewertung
  {
    id: "referenz",
    label: "⭐ Bewertung anfragen",
    description: "Zufriedene Kunden um eine Google-Bewertung bitten",
    betreff: (c) => `Kurze Bitte – Ihre Meinung über unsere Zusammenarbeit`,
    body: (c, extra) => `
<p style="margin:0 0 20px;font-size:15px;font-weight:700;color:#111827;">Sehr geehrte${c.ansprechpartner ? " " + c.ansprechpartner : " Damen und Herren"},</p>

<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.8;">
  wir hoffen, Sie sind rundum zufrieden mit unserer Arbeit! Als kleines, familiengeführtes Unternehmen aus Neuwied bedeuten uns Bewertungen von Kunden wie Ihnen sehr viel – sie helfen uns zu wachsen und anderen Betrieben bei der Entscheidung.
</p>

<div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fde68a;border-radius:14px;padding:24px;margin:0 0 22px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">⭐⭐⭐⭐⭐</div>
  <div style="font-size:14px;font-weight:800;color:#b45309;margin-bottom:8px;">Wie zufrieden sind Sie mit Huwa Gebäudedienste?</div>
  <p style="margin:0;font-size:13px;color:#92400e;">2 Minuten, die uns enorm helfen!</p>
</div>

${extra.notiz ? `<div style="background:#f8fafc;border-left:4px solid #f59e0b;border-radius:0 10px 10px 0;padding:14px 18px;margin:0 0 20px;font-size:13px;color:#374151;">${extra.notiz}</div>` : ""}

<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.8;">
  Falls Sie mit unserer Leistung nicht zu 100% zufrieden sind, sprechen Sie uns bitte direkt an – wir lösen jedes Problem sofort und unbürokratisch.
</p>

<div style="text-align:center;margin:24px 0;">
  <a href="https://g.page/r/huwa-gebaeudedienste/review" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:13px 32px;border-radius:50px;box-shadow:0 4px 14px rgba(245,158,11,0.35);">⭐ Jetzt Google-Bewertung abgeben</a>
  <div style="margin-top:8px;font-size:11px;color:#9ca3af;">Dauert nur 2 Minuten – wir danken Ihnen herzlich!</div>
</div>

${SIGNATURE}`,
  },
];