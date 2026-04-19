import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  console.log("Stripe event received:", event.type);

  try {
    // Erfolgreiche Checkout-Session (einmalige Zahlung oder Abo-Start)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customerEmail = session.customer_details?.email || session.customer_email;
      const planName = session.metadata?.planName || "Starter";

      if (!customerEmail) {
        console.warn("No customer email in session:", session.id);
        return Response.json({ received: true });
      }

      console.log(`Checkout completed for ${customerEmail}, plan: ${planName}`);

      // User in DB finden
      const users = await base44.asServiceRole.entities.User.list();
      const user = users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());

      if (user) {
        // Subscription-Status auf Plan setzen
        await base44.asServiceRole.auth.updateUser(user.id, {
          subscription_plan: planName,
          subscription_status: "active",
          subscription_started_at: new Date().toISOString(),
          stripe_customer_id: session.customer || null,
          stripe_session_id: session.id,
        });
        console.log(`User ${customerEmail} upgraded to ${planName}`);

        // Willkommens-E-Mail senden
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: customerEmail,
          subject: `🎉 Willkommen beim ${planName}-Plan!`,
          from_name: "Huwa Vertrieb",
          body: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#0f4cb3;border-radius:12px 12px 0 0;padding:28px 32px;">
          <div style="font-size:24px;font-weight:800;color:white;">🎉 Zahlung erfolgreich!</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:8px;">Dein ${planName}-Abonnement ist jetzt aktiv</div>
        </td></tr>
        <tr><td style="background:white;padding:28px 32px;border:1px solid #e2e8f0;border-top:none;">
          <p style="font-size:15px;color:#1f2937;">Hallo,</p>
          <p style="font-size:14px;color:#4b5563;">
            vielen Dank für dein Vertrauen! Dein <strong>${planName}-Plan</strong> ist jetzt freigeschaltet.
            Du kannst dich sofort einloggen und mit der Lead-Generierung starten.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${Deno.env.get("BASE44_APP_URL") || "https://app.base44.com"}" 
               style="background:#0f4cb3;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
              Jetzt zum Dashboard →
            </a>
          </div>
          <p style="font-size:13px;color:#6b7280;">
            Bei Fragen stehen wir dir jederzeit zur Verfügung:<br/>
            📧 info@huwa-gebaeudedienste.de · 📞 02601/9131820
          </p>
        </td></tr>
        <tr><td style="background:#1e293b;border-radius:0 0 12px 12px;padding:20px 32px;">
          <div style="font-size:12px;color:#94a3b8;">
            Huwa Vertrieb CRM · Mittelweg 24 · 56566 Neuwied
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
          `,
        });
      } else {
        // User existiert noch nicht → AppSettings als Pending speichern
        console.log(`User ${customerEmail} not found yet, saving pending subscription`);
        await base44.asServiceRole.entities.AppSettings.create({
          key: `pending_subscription_${customerEmail}`,
          value: JSON.stringify({
            email: customerEmail,
            plan: planName,
            session_id: session.id,
            customer_id: session.customer,
            created_at: new Date().toISOString(),
          }),
        });
      }
    }

    // Abo-Verlängerung (monatliche Zahlung)
    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const customerEmail = invoice.customer_email;

      if (customerEmail) {
        console.log(`Invoice paid for ${customerEmail}`);
        const users = await base44.asServiceRole.entities.User.list();
        const user = users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());

        if (user) {
          await base44.asServiceRole.auth.updateUser(user.id, {
            subscription_status: "active",
            subscription_renewed_at: new Date().toISOString(),
          });
          console.log(`Subscription renewed for ${customerEmail}`);
        }
      }
    }

    // Abo gekündigt / Zahlung fehlgeschlagen
    if (event.type === "customer.subscription.deleted" || event.type === "invoice.payment_failed") {
      const obj = event.data.object;
      const customerId = obj.customer;

      // Über Stripe Customer-ID den User finden
      const users = await base44.asServiceRole.entities.User.list();
      const user = users.find(u => u.stripe_customer_id === customerId);

      if (user) {
        await base44.asServiceRole.auth.updateUser(user.id, {
          subscription_status: event.type === "customer.subscription.deleted" ? "cancelled" : "payment_failed",
        });
        console.log(`Subscription ${event.type} for user ${user.email}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});