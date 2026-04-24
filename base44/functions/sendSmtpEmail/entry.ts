import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function sendViaIonosSMTP({ to, subject, htmlBody, fromName }) {
  const host = Deno.env.get("IONOS_SMTP_HOST") || "smtp.ionos.de";
  const user = Deno.env.get("IONOS_SMTP_USER");
  const pass = Deno.env.get("IONOS_SMTP_PASS");

  // Build raw MIME message
  const boundary = "boundary_" + Date.now();
  const from = `${fromName || "Huwa Vertrieb"} <${user}>`;

  const rawMessage = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`,
  ].join("\r\n");

  // Connect via TCP with STARTTLS on port 587
  const conn = await Deno.connect({ hostname: host, port: 587 });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readLine(conn) {
    const buf = new Uint8Array(4096);
    let result = "";
    while (true) {
      const n = await conn.read(buf);
      if (n === null) break;
      result += decoder.decode(buf.subarray(0, n));
      if (result.includes("\r\n")) break;
    }
    return result;
  }

  async function send(conn, cmd) {
    console.log("C:", cmd.trim());
    await conn.write(encoder.encode(cmd + "\r\n"));
    const res = await readLine(conn);
    console.log("S:", res.trim());
    return res;
  }

  // SMTP handshake
  let res = await readLine(conn); // 220 greeting
  console.log("S:", res.trim());

  res = await send(conn, `EHLO huwa-gebaeudedienste.de`);

  // STARTTLS
  res = await send(conn, `STARTTLS`);
  if (!res.startsWith("220")) {
    conn.close();
    throw new Error("STARTTLS rejected: " + res);
  }

  // Upgrade to TLS
  const tlsConn = await Deno.startTls(conn, { hostname: host });

  async function readLineTls(c) {
    const buf = new Uint8Array(4096);
    let result = "";
    while (true) {
      const n = await c.read(buf);
      if (n === null) break;
      result += decoder.decode(buf.subarray(0, n));
      if (result.includes("\r\n")) break;
    }
    return result;
  }

  async function sendTls(c, cmd) {
    console.log("C:", cmd.trim());
    await c.write(encoder.encode(cmd + "\r\n"));
    const r = await readLineTls(c);
    console.log("S:", r.trim());
    return r;
  }

  // Re-EHLO after TLS
  res = await sendTls(tlsConn, `EHLO huwa-gebaeudedienste.de`);

  // AUTH LOGIN
  res = await sendTls(tlsConn, `AUTH LOGIN`);
  res = await sendTls(tlsConn, btoa(user));
  res = await sendTls(tlsConn, btoa(pass));
  if (!res.startsWith("235")) {
    tlsConn.close();
    throw new Error("AUTH failed: " + res);
  }

  // MAIL FROM / RCPT TO / DATA
  await sendTls(tlsConn, `MAIL FROM:<${user}>`);
  await sendTls(tlsConn, `RCPT TO:<${to}>`);
  await sendTls(tlsConn, `DATA`);

  // Send message body
  console.log("C: [message body]");
  await tlsConn.write(encoder.encode(rawMessage + "\r\n.\r\n"));
  res = await readLineTls(tlsConn);
  console.log("S:", res.trim());

  if (!res.startsWith("250")) {
    tlsConn.close();
    throw new Error("Message rejected: " + res);
  }

  await sendTls(tlsConn, `QUIT`);
  tlsConn.close();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { to, subject, body, fromName } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: "Missing: to, subject, body" }, { status: 400 });
    }

    await sendViaIonosSMTP({ to, subject, htmlBody: body, fromName });
    return Response.json({ success: true, to });
  } catch (error) {
    console.error("SMTP error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});