import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * E-Mail-Versand über Base44 Core Integration.
 * Standalone-Handler + wiederverwendbar.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { to, subject, body, fromName } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: "Missing required fields: to, subject, body" }, { status: 400 });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject,
      body,
      from_name: fromName || "Huwa Vertrieb",
    });

    return Response.json({ success: true, to });
  } catch (error) {
    console.error("sendEmail error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});