// DEAKTIVIERT – Beta-Hardening-Testfunktion.
// Alle Tests bestanden am 2026-05-11. Funktion dauerhaft deaktiviert.
// Nicht reaktivieren ohne explizite Freigabe.

Deno.serve(async (_req) => {
  return Response.json(
    { error: 'runSecurityTests_disabled', message: 'Diese Testfunktion ist deaktiviert.' },
    { status: 410 }
  );
});