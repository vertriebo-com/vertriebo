import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Mandantenfähiger E-Mail-Versand via Brevo ────────────────────────────────
//
// ARCHITEKTUR:
//   - fromName und fromEmail kommen IMMER aus OrganizationSettings (nicht Frontend-Parameter)
//   - Fallback: Plattform-Defaults (Brevo-Absender muss verifiziert sein)
//   - emails_sent wird pro Monat im aktuellen UsageLog inkrementiert
//   - organization_id ist Pflichtparameter
//
// SICHERHEIT:
//   - Absender kann nicht vom Frontend manipuliert werden
//   - Nur verifizierte Brevo-Absenderadressen funktionieren
//
// ZUKUNFT:
//   - Eigene SMTP/Gmail/Outlook-Integration per org möglich:
//     OrganizationSettings: smtp_host, smtp_user, smtp_pass, smtp_port
//   - Queue-Unterstützung: organization_id + batch_id als Metadata

// TODO [GO-LIVE]: Diese Domain muss auf eine verifizierte Vertriebo-Absenderdomain umgestellt werden.
// Aktuell: info@huwa-gebaeudedienste.de (bei Brevo verifiziert, nur als temporärer MVP-Fallback).
// Ziel: noreply@vertriebo.de oder mail@vertriebo.de bei Brevo als Sender verifizieren,
//        dann diesen Wert hier ersetzen. Kein Code-Änderung in Funktionen nötig – nur dieser Konstante.
// Mittelfristig: PLATFORM_FROM_EMAIL aus AppSettings laden (key: "platform_from_email") für
//                zentrale Änderbarkeit ohne Code-Deploy.
const PLATFORM_FROM_EMAIL = "info@huwa-gebaeudedienste.de"; // TODO: → noreply@vertriebo.de
const PLATFORM_FROM_NAME  = "Vertriebo";

async function sendViaBrevo({ to, subject, htmlBody, fromName, fromEmail, replyTo }) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlBody,
      replyTo: { email: replyTo || fromEmail, name: fromName },
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Brevo Fehler: ${JSON.stringify(data)}`);
  }
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body, organization_id } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: "Fehlende Parameter: to, subject, body" }, { status: 400 });
    }
    if (!organization_id) {
      return Response.json({ error: "organization_id ist Pflichtparameter" }, { status: 400 });
    }

    // ── Mandantenspezifische Absenderdaten aus OrganizationSettings ──────────
    const orgSettings = await base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id });
    const settingsMap = {};
    orgSettings.forEach(s => { settingsMap[s.key] = s.value; });

    const fromName  = settingsMap["email_from_name"]  || settingsMap["company_name"] || PLATFORM_FROM_NAME;
    // Key: email_sender_email (set during onboarding/settings)
    const fromEmail = settingsMap["email_sender_email"] || settingsMap["email_from_email"] || PLATFORM_FROM_EMAIL;
    const replyTo   = settingsMap["email_reply_to"] || fromEmail;

    // ── E-Mail senden ────────────────────────────────────────────────────────
    const result = await sendViaBrevo({ to, subject, htmlBody: body, fromName, fromEmail, replyTo });
    console.log(`[sendBrevoEmail] Gesendet org=${organization_id} to=${to} from=${fromEmail} messageId=${result.messageId}`);

    // ── UsageLog: emails_sent inkrementieren (aktueller Monat) ───────────────
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const usageLogs = await base44.asServiceRole.entities.UsageLog.filter({ organization_id });
      // Aktuellsten Log dieser Periode finden
      const currentLog = usageLogs
        .filter(l => l.period_start >= monthStart)
        .sort((a, b) => new Date(b.period_start) - new Date(a.period_start))[0];

      if (currentLog) {
        await base44.asServiceRole.entities.UsageLog.update(currentLog.id, {
          emails_sent: (currentLog.emails_sent || 0) + 1,
        });
      }
    } catch (e) {
      // UsageLog-Fehler nie den E-Mail-Versand blockieren
      console.warn("[sendBrevoEmail] UsageLog update failed:", e.message);
    }

    return Response.json({ success: true, to, fromEmail, messageId: result.messageId });
  } catch (error) {
    console.error("[sendBrevoEmail] Fehler:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});