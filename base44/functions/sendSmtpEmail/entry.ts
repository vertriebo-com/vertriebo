import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function sendViaIonos({ to, subject, htmlBody, fromName }) {
  const host = "smtp.ionos.de";
  const port = 587;
  const user = Deno.env.get("IONOS_SMTP_USER");
  const pass = Deno.env.get("IONOS_SMTP_PASS");
  const from = `${fromName || "Huwa Vertrieb"} <${user}>`;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readAll(conn) {
    const buf = new Uint8Array(8192);
    let result = "";
    while (true) {
      const n = await conn.read(buf);
      if (n === null) break;
      result += decoder.decode(buf.subarray(0, n));
      // Done when last complete line has space after code (not dash = multiline)
      const lines = result.split("\r\n").filter(l => l.length >= 4);
      if (lines.length > 0 && lines[lines.length - 1][3] === ' ') break;
    }
    console.log("S:", result.trim().substring(0, 200));
    return result;
  }

  async function cmd(conn, text, hide = false) {
    if (!hide) console.log("C:", text);
    await conn.write(encoder.encode(text + "\r\n"));
    return await readAll(conn);
  }

  // Step 1: Plain TCP on port 587
  console.log(`Connecting plain TCP to ${host}:${port}...`);
  let conn = await Deno.connect({ hostname: host, port });
  console.log("TCP connected!");

  // Read greeting
  await readAll(conn);

  // EHLO
  const ehlo = await cmd(conn, `EHLO huwa-gebaeudedienste.de`);

  // STARTTLS
  await cmd(conn, `STARTTLS`);

  // Upgrade to TLS
  console.log("Upgrading to TLS...");
  conn = await Deno.startTls(conn, { hostname: host });
  console.log("TLS upgraded!");

  // EHLO again after TLS
  await cmd(conn, `EHLO huwa-gebaeudedienste.de`);

  // AUTH LOGIN
  await cmd(conn, `AUTH LOGIN`);
  await cmd(conn, btoa(user), true);
  const authRes = await (async () => {
    console.log("C: [password hidden]");
    await conn.write(encoder.encode(btoa(pass) + "\r\n"));
    return await readAll(conn);
  })();

  if (!authRes.startsWith("235")) {
    conn.close();
    throw new Error("AUTH fehlgeschlagen: " + authRes.trim());
  }
  console.log("AUTH OK!");

  // MAIL FROM
  await cmd(conn, `MAIL FROM:<${user}>`);

  // RCPT TO
  await cmd(conn, `RCPT TO:<${to}>`);

  // DATA
  await cmd(conn, `DATA`);

  // Message body
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(htmlBody))),
    `.`,
  ].join("\r\n");

  console.log("C: [message body]");
  await conn.write(encoder.encode(message + "\r\n"));
  const dataRes = await readAll(conn);

  if (!dataRes.startsWith("250")) {
    conn.close();
    throw new Error("Nachricht abgelehnt: " + dataRes.trim());
  }

  await cmd(conn, `QUIT`);
  conn.close();
  console.log("Email sent successfully!");
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