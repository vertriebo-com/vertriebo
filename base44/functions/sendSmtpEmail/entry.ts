import { SMTPClient } from "npm:emailjs@4.0.2";

/**
 * Sendet eine E-Mail über IONOS SMTP.
 * @param {object} opts - { to, subject, body, fromName }
 */
export async function sendSmtpEmail({ to, subject, body, fromName = "Huwa Vertrieb" }) {
  const host = Deno.env.get("IONOS_SMTP_HOST") || "smtp.ionos.de";
  const user = Deno.env.get("IONOS_SMTP_USER");
  const pass = Deno.env.get("IONOS_SMTP_PASS");

  const client = new SMTPClient({
    user,
    password: pass,
    host,
    port: 587,
    tls: false,
  });

  await client.sendAsync({
    from: `${fromName} <${user}>`,
    to,
    subject,
    attachment: [{ data: body, alternative: true }],
  });
}

// Standalone handler (für direkte Tests)
Deno.serve(async (req) => {
  try {
    const { to, subject, body, fromName } = await req.json();
    if (!to || !subject || !body) {
      return Response.json({ error: "Missing required fields: to, subject, body" }, { status: 400 });
    }
    await sendSmtpEmail({ to, subject, body, fromName });
    return Response.json({ success: true, to });
  } catch (error) {
    console.error("sendSmtpEmail error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});