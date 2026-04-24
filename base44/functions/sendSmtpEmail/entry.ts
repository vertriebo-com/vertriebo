import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function sendViaIonos({ to, subject, htmlBody, fromName }) {
  const host = Deno.env.get("IONOS_SMTP_HOST") || "smtp.ionos.de";
  const user = Deno.env.get("IONOS_SMTP_USER");
  const pass = Deno.env.get("IONOS_SMTP_PASS");
  const from = `${fromName || "Huwa Vertrieb"} <${user}>`;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(conn) {
    const buf = new Uint8Array(8192);
    let result = "";
    while (true) {
      const n = await conn.read(buf);
      if (n === null) break;
      result += decoder.decode(buf.subarray(0, n));
      // Multi-line responses end when a line starts with "NNN " (space not dash)
      const lines = result.split("\r\n");
      const lastFull = lines.filter(l => l.length >= 4 && l[3] === ' ');
      if (lastFull.length > 0) break;
      if (result.includes("\r\n") && !result.split("\r\n").some(l => l.length >= 4 && l[3] === '-')) break;
    }
    console.log("S:", result.trim());
    return result;
  }

  async function sendCmd(conn, cmd) {
    const display = cmd.includes("AUTH") || cmd === btoa(pass) ? "[hidden]" : cmd;
    console.log("C:", display);
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await readResponse(conn);
  }

  // Try SSL on port 465 directly
  console.log(`Connecting to ${host}:465 (SSL)...`);
  const conn = await Deno.connectTls({ hostname: host, port: 465 });
  console.log("TLS connected!");

  // Read greeting
  await readResponse(conn);

  // EHLO
  await sendCmd(conn, `EHLO huwa-gebaeudedienste.de`);

  // AUTH LOGIN
  await sendCmd(conn, `AUTH LOGIN`);
  await sendCmd(conn, btoa(user));
  const authRes = await (async () => {
    console.log("C: [password]");
    await conn.write(encoder.encode(btoa(pass) + "\r\n"));
    return await readResponse(conn);
  })();

  if (!authRes.startsWith("235")) {
    conn.close();
    throw new Error("AUTH fehlgeschlagen: " + authRes.trim());
  }

  // MAIL FROM
  await sendCmd(conn, `MAIL FROM:<${user}>`);

  // RCPT TO
  await sendCmd(conn, `RCPT TO:<${to}>`);

  // DATA
  await sendCmd(conn, `DATA`);

  // Build message
  const boundary = "b_" + Date.now();
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    htmlBody,
    ``,
    `.`,
  ].join("\r\n");

  console.log("C: [message body + .]");
  await conn.write(encoder.encode(message + "\r\n"));
  const dataRes = await readResponse(conn);

  if (!dataRes.startsWith("250")) {
    conn.close();
    throw new Error("Nachricht abgelehnt: " + dataRes.trim());
  }

  await sendCmd(conn, `QUIT`);
  conn.close();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { to, subject, body, fromName } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: "Fehlende Parameter: to, subject, body" }, { status: 400 });
    }

    await sendViaIonos({ to, subject, htmlBody: body, fromName });
    return Response.json({ success: true, to, from: Deno.env.get("IONOS_SMTP_USER") });
  } catch (error) {
    console.error("SMTP Fehler:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});