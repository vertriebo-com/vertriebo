// LEGACY – SMTP-Versand ist im MVP deaktiviert (Huwa/IONOS-Hardcode).
// Nicht verwenden. E-Mail läuft manuell über SendEmailDialog (Copy + mailto).
// @deprecated

Deno.serve(async (_req) => {
  return Response.json(
    { error: 'sendSmtpEmail_disabled', message: 'SMTP-Versand ist im MVP deaktiviert.' },
    { status: 410 }
  );
});