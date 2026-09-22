import Stripe from "stripe";
import type { ReservationInput } from "./booking";
import { BookingError, getPaymentStore, type PaymentReservation, type PaymentStore } from "./payment-store";

export const STRIPE_EVENTS = [
  "checkout.session.completed", "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed", "checkout.session.expired",
] as const;
export const PAYMENT_PROJECT = "navidad-2026";

function isConfiguredSecret(value: string | undefined): value is string {
  return Boolean(value && /^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(value) && !value.includes("replace_me"));
}

function isConfiguredWebhookSecret(value: string | undefined) {
  return Boolean(value && /^whsec_[A-Za-z0-9]+$/.test(value) && !value.includes("replace_me"));
}

export function paymentMode(): "demo" | "stripe" | "unavailable" {
  // A demo payment path must never be reachable in a production build.
  if (process.env.MOCK_PAYMENTS === "true") return process.env.NODE_ENV === "production" ? "unavailable" : "demo";
  return isConfiguredSecret(process.env.STRIPE_SECRET_KEY) &&
    isConfiguredWebhookSecret(process.env.STRIPE_WEBHOOK_SECRET) && process.env.STRIPE_PAYMENTS_ENABLED === "true"
    ? "stripe" : "unavailable";
}

export function siteUrl() {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("Invalid site URL");
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Expected site origin");
  if (process.env.STRIPE_SECRET_KEY?.includes("_live_") && url.protocol !== "https:") throw new Error("Live payments require HTTPS");
  return url.origin;
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!isConfiguredSecret(key)) throw new Error("Stripe is not configured");
  return new Stripe(key, { maxNetworkRetries: 2, timeout: 15_000 });
}

export function createPaymentService(stripe: Stripe, store: PaymentStore, origin: string, now = () => Date.now()) {
  function metadata(r: PaymentReservation): Record<string, string> {
    return {
      project: PAYMENT_PROJECT,
      reservation_reference: r.reference,
      customer_name: r.name,
      customer_phone: r.whatsapp,
      customer_email: r.email,
      session_date: r.date,
      session_time: r.time,
    };
  }

  function paymentIntentId(session: Stripe.Checkout.Session) {
    if (typeof session.payment_intent === "string") return session.payment_intent;
    return session.payment_intent?.id ?? null;
  }

  async function checkout(r: PaymentReservation) {
    if (r.sessionId) return stripe.checkout.sessions.retrieve(r.sessionId);
    // The stable request is safe to replay after a network timeout or a server restart.
    // Stripe keeps idempotency keys for at least 24 hours. Older unknown attempts stay held for review.
    if (now() - r.createdAt >= 23 * 60 * 60 * 1000) throw new Error("Unresolved checkout requires manual reconciliation");
    const session = await stripe.checkout.sessions.create({
      mode: "payment", payment_method_types: ["card"], locale: "es",
      customer_email: r.email, client_reference_id: r.reference,
      metadata: metadata(r),
      payment_intent_data: { metadata: metadata(r) },
      line_items: [{ quantity: 1, price_data: {
        currency: "mxn", unit_amount: r.deposit * 100,
        product_data: { name: "Anticipo · La Estación de los Recuerdos 2026", description: `${r.date} · ${r.time} · ${r.people} personas · ${r.photos} fotografías. Saldo: $${r.balance} MXN.` },
      } }],
      success_url: `${origin}/reserva/confirmacion?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#reserva`,
      custom_text: { submit: { message: "Anticipo no reembolsable. El saldo se paga en efectivo el día de la sesión. Un cambio de fecha sujeto a disponibilidad dentro del mismo mes y temporada." } },
    }, { idempotencyKey: `navidad-2026:${r.reference}` });
    await store.attachSession(r.reference, session.id, paymentIntentId(session));
    return session;
  }

  function applySession(session: Stripe.Checkout.Session, eventId?: string, failed = false) {
    if (session.metadata?.project !== PAYMENT_PROJECT) return;
    const reference = session.metadata.reservation_reference;
    const apply = (r: PaymentReservation | undefined) => {
      if (!r || session.client_reference_id !== reference || session.mode !== "payment" ||
        session.currency !== "mxn" || session.amount_total !== r.deposit * 100 ||
        (r.sessionId && r.sessionId !== session.id)) throw new Error("Stripe payment does not match reservation");
      const intent = paymentIntentId(session);
      if (session.status === "complete" && session.payment_status === "paid") return store.transition(r.reference, session.id, "paid", eventId, intent);
      if (session.status === "expired") return store.transition(r.reference, session.id, "expired", eventId, intent);
      if (failed && session.status === "complete" && session.payment_status === "unpaid") return store.transition(r.reference, session.id, "failed", eventId, intent);
      if (session.status === "complete") return store.transition(r.reference, session.id, "processing", eventId, intent);
    };
    const result = reference ? store.get(reference) : undefined;
    return result && typeof (result as Promise<PaymentReservation | undefined>).then === "function"
      ? (result as Promise<PaymentReservation | undefined>).then(apply)
      : apply(result as PaymentReservation | undefined);
  }

  async function reconcileExpired() {
    // Never release a slot on the local clock alone: Checkout must be unable to collect money first.
    for (const r of await store.due()) {
      let session = await checkout(r);
      if (session.status === "open") {
        try { session = await stripe.checkout.sessions.expire(session.id); }
        catch { session = await stripe.checkout.sessions.retrieve(session.id); }
      }
      await applySession(session);
    }
  }

  async function reserve(input: ReservationInput, requestKey: string) {
    await reconcileExpired();
    const reservation = await store.reserve(input, requestKey);
    const session = await checkout(reservation);
    if (session.status !== "open" || !session.url) {
      await applySession(session);
      throw new BookingError("Este pago ya terminó. Revisa tu confirmación o selecciona un horario nuevo.");
    }
    return { ok: true, paymentUrl: session.url, reference: reservation.reference };
  }

  async function handleEvent(event: Stripe.Event) {
    if (!(STRIPE_EVENTS as readonly string[]).includes(event.type)) return;
    const snapshot = event.data.object as Stripe.Checkout.Session;
    if (snapshot.metadata?.project !== PAYMENT_PROJECT) return;
    // Read current state to tolerate duplicated and out-of-order webhook deliveries.
    const session = await stripe.checkout.sessions.retrieve(snapshot.id);
    await applySession(session, event.id, event.type === "checkout.session.async_payment_failed");
  }
  return { reserve, reconcileExpired, handleEvent, applySession };
}

export async function getPaymentService() {
  return createPaymentService(getStripe(), await getPaymentStore(), siteUrl());
}
