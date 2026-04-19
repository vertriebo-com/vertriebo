import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const { priceId, planName, successUrl, cancelUrl } = await req.json();

    if (!priceId) {
      return Response.json({ error: 'priceId is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${req.headers.get('origin')}/onboarding?session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(planName || '')}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/landing`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        plan_name: planName || '',
      },
    });

    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});