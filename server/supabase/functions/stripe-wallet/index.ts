import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY') || '';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: HEADERS });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);

  let input: {
    action: string;
    amountPkr?: number;
    reporterId?: string;
    sessionId?: string;
    customerEmail?: string;
  };
  try {
    input = await req.json();
  } catch {
    return reply({ error: 'Invalid JSON body' }, 400);
  }

  // 1. Create Stripe Checkout Session
  if (input.action === 'create-session') {
    const amount = Number(input.amountPkr);
    if (!amount || amount < 50) {
      return reply({ error: 'Minimum recharge amount is PKR 50' }, 400);
    }
    const reporterId = input.reporterId || 'anonymous-citizen';

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('line_items[0][price_data][currency]', 'pkr');
    params.append('line_items[0][price_data][unit_amount]', String(Math.round(amount * 100)));
    params.append(
      'line_items[0][price_data][product_data][name]',
      `RoadWatch Citizen Wallet Top-Up (PKR ${amount.toLocaleString()})`
    );
    params.append(
      'line_items[0][price_data][product_data][description]',
      'Instant balance credit for RoadWatch traffic reporting, review fees, and bail assurance.'
    );
    params.append('line_items[0][quantity]', '1');
    params.append(
      'success_url',
      `roadwatch://wallet?status=success&session_id={CHECKOUT_SESSION_ID}&amount=${amount}`
    );
    params.append('cancel_url', 'roadwatch://wallet?status=cancelled');
    params.append('metadata[reporter_id]', reporterId);
    params.append('metadata[amount_pkr]', String(amount));
    if (input.customerEmail) {
      params.append('customer_email', input.customerEmail);
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return reply(
        { error: session.error?.message || 'Stripe session creation failed' },
        stripeRes.status
      );
    }

    return reply({
      sessionId: session.id,
      url: session.url,
      amount: amount,
    });
  }

  // 2. Verify Session & Credit Wallet in Supabase
  if (input.action === 'verify-session') {
    if (!input.sessionId) {
      return reply({ error: 'Session ID is required' }, 400);
    }

    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${input.sessionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET}`,
      },
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return reply(
        { error: session.error?.message || 'Failed to fetch Stripe session' },
        stripeRes.status
      );
    }

    const isPaid = session.payment_status === 'paid';
    const amountPkr = Number(
      session.metadata?.amount_pkr || (session.amount_total ? session.amount_total / 100 : 0)
    );
    const reporterId = session.metadata?.reporter_id;

    if (!isPaid) {
      return reply({
        success: false,
        paid: false,
        status: session.payment_status,
        message: 'Payment has not been completed yet.',
      });
    }

    // Connect to Supabase to credit wallet
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    let newBalance = 0;
    if (supabaseUrl && serviceRoleKey && reporterId && reporterId !== 'anonymous-citizen') {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });

      // Get current balance
      const { data: currentWallet } = await admin
        .from('reward_wallets')
        .select('balance')
        .eq('reporter_id', reporterId)
        .maybeSingle();

      const existingBalance = currentWallet?.balance || 0;
      newBalance = existingBalance + amountPkr;

      await admin.from('reward_wallets').upsert(
        { reporter_id: reporterId, balance: newBalance, epay_linked: true },
        { onConflict: 'reporter_id' }
      );

      // Add notification for the user
      await admin.from('notifications').insert({
        recipient_id: reporterId,
        type: 'top_up',
        message: `💳 Wallet Recharged via Stripe: PKR ${amountPkr.toLocaleString()} credited successfully. (Ref: ${input.sessionId})`,
        channel: 'in_app',
      });
    }

    return reply({
      success: true,
      paid: true,
      amountPkr,
      newBalance,
      paymentIntent: session.payment_intent,
      customerEmail: session.customer_details?.email || session.customer_email,
    });
  }

  return reply({ error: 'Unknown action' }, 400);
});
