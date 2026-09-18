import { NextResponse } from "next/server";
import { getPaymentService, getStripe } from "../../../../lib/stripe-payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.includes("replace_me")) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  let stripe;
  try { stripe = getStripe(); }
  catch { return NextResponse.json({ error: "Stripe not configured" }, { status: 503 }); }
  let event;
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return NextResponse.json({ error: "Invalid signature" }, { status: 400 }); }
  if (event.livemode !== process.env.STRIPE_SECRET_KEY!.includes("_live_")) return NextResponse.json({ error: "Incorrect environment" }, { status: 400 });
  try {
    await (await getPaymentService()).handleEvent(event);
    return NextResponse.json({ received: true });
  } catch {
    // Return 5xx so Stripe retries; don't log payloads or credentials.
    console.error("Stripe webhook processing failed", { eventId: event.id, type: event.type });
    return NextResponse.json({ error: "Could not process event" }, { status: 500 });
  }
}
