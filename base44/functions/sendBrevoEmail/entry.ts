import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function sendViaBrevo({ to, subject, htmlBody, fromName }) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const fromEmail = "info@huwa-gebaeudedienste.de";

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: fromName || "Huwa Vertrieb", email: fromEmail },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlBody,
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
    const { to, subject, body, fromName } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: "Fehlende Parameter: to, subject, body" }, { status: 400 });
    }

    const result = await sendViaBrevo({ to, subject, htmlBody: body, fromName });
    console.log("E-Mail gesendet via Brevo:", result);
    return Response.json({ success: true, to, messageId: result.messageId });
  } catch (error) {
    console.error("Brevo Fehler:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});