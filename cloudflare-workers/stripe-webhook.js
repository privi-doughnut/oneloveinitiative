// ============================================================
// ONE LOVE INITIATIVE — Stripe Webhook Cloudflare Worker
// File: cloudflare-workers/stripe-webhook.js
//
// SETUP:
//   1. Go to Cloudflare dashboard → Workers → Create Worker
//   2. Name it: oli-stripe-webhook
//   3. Paste this entire file as the Worker code
//   4. In Settings → Variables → add Secrets:
//        STRIPE_WEBHOOK_SECRET  — from Stripe Dashboard → Webhooks → Signing secret
//        APPS_SCRIPT_URL        — your Apps Script /exec URL
//        INTERNAL_SECRET        — the value logged by setScriptSecrets() in Apps Script
//   5. In Stripe Dashboard → Developers → Webhooks → Add endpoint:
//        URL: https://oli-stripe-webhook.<your-subdomain>.workers.dev
//        Events to listen for: checkout.session.completed
// ============================================================

export default {
  async fetch(request, env) {
    // Only accept POST
    if (request.method !== 'POST') {
      return new Response('Not found', { status: 404 });
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    // Verify the Stripe webhook signature
    const isValid = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      return new Response('Invalid signature', { status: 400 });
    }

    let event;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    // Handle checkout.session.completed (fired when a Payment Link purchase succeeds)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email   = session.customer_details?.email;
      const name    = session.customer_details?.name || '';
      // amount_total is in smallest currency unit (cents); divide by 100 for USD
      const amount  = session.amount_total ? (session.amount_total / 100).toFixed(2) : '';

      const transactionId = session.payment_intent || session.id || '';
      if (email) {
        await sendDonationThanks(email, name, amount, transactionId, env);
      }
    }

    // Always return 200 to Stripe immediately (even if our downstream call fails)
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// ----------------------------------------------------------
// Call Apps Script to send the thank-you email
// ----------------------------------------------------------
async function sendDonationThanks(email, name, amount, transactionId, env) {
  try {
    const res = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'donation_thanks',
        secret: env.INTERNAL_SECRET,
        email,
        name,
        amount,
        transaction_id: transactionId
      })
    });
    if (!res.ok) {
      console.error('Apps Script returned non-200:', res.status, await res.text());
    }
  } catch (err) {
    // Log but don't fail — we already returned 200 to Stripe
    console.error('Failed to call Apps Script:', err);
  }
}

// ----------------------------------------------------------
// Stripe webhook signature verification (HMAC-SHA256)
// Stripe signature header format: t=<timestamp>,v1=<hex_sig>
// Signed payload: "<timestamp>.<raw_body>"
// ----------------------------------------------------------
async function verifyStripeSignature(payload, header, secret) {
  // Parse t= and v1= from the header
  const parts = {};
  header.split(',').forEach(part => {
    const [k, ...rest] = part.split('=');
    parts[k] = rest.join('=');
  });

  const timestamp = parts['t'];
  const expectedSig = parts['v1'];
  if (!timestamp || !expectedSig) return false;

  // Reject webhooks older than 5 minutes (replay protection)
  const webhookAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (webhookAge > 300) {
    console.warn('Stripe webhook too old:', webhookAge, 'seconds');
    return false;
  }

  // Compute HMAC-SHA256 of "<timestamp>.<payload>"
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computedSig = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison to prevent timing attacks
  return safeCompare(computedSig, expectedSig);
}

// Constant-time string comparison
function safeCompare(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
