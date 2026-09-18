import { afterEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { reservationSchema } from "../src/lib/booking";
import { HOLD_DURATION_MS, VIP_PRE_SALE_END_MS } from "../src/lib/booking-config";
import { createPaymentStore, type PaymentReservation } from "../src/lib/payment-store";
import { createPaymentService, paymentMode, PAYMENT_PROJECT } from "../src/lib/stripe-payments";
import { POST as webhook } from "../src/app/api/webhooks/stripe/route";

const stores: ReturnType<typeof createPaymentStore>[] = [];
function store(path = ":memory:", now = () => Date.now()) {
  const value = createPaymentStore(path, now); stores.push(value); return value;
}
afterEach(() => { for (const s of stores.splice(0)) { try { s.close(); } catch {} } vi.unstubAllEnvs(); });
const input = (time = "16:00", date = "2026-10-21", coupon = "") => reservationSchema.parse({ date, time, coupon, name: "Familia Test", email: "test@example.com", whatsapp: "9210000000", people: 5 });
function session(r: PaymentReservation, overrides: Partial<Stripe.Checkout.Session> = {}) {
  return { id: `cs_test_${r.reference}`, object: "checkout.session", metadata: { project: PAYMENT_PROJECT, reservation_reference: r.reference }, client_reference_id: r.reference, mode: "payment", amount_total: r.deposit * 100, currency: "mxn", status: "open", payment_status: "unpaid", url: "https://checkout.stripe.com/test", ...overrides } as Stripe.Checkout.Session;
}
function client() {
  const sessions = { create: vi.fn(), retrieve: vi.fn(), expire: vi.fn() };
  return { stripe: { checkout: { sessions } } as unknown as Stripe, sessions };
}

describe("persistent reservations", () => {
  it("prevents concurrent connections from taking the same appointment", () => {
    const folder = mkdtempSync(join(tmpdir(), "navidad-payments-"));
    const first = store(join(folder, "test.db")); const second = store(join(folder, "test.db"));
    try {
      first.reserve(input(), randomUUID());
      expect(() => second.reserve(input(), randomUUID())).toThrow("no está disponible");
      first.close();
      expect(second.getAvailability().dates[0].slots.find(s => s.time === "16:00")?.status).toBe("held");
    } finally { second.close(); rmSync(folder, { recursive: true }); }
  });
  it("reuses one request and rejects changed data with the same key", () => {
    const s = store(); const key = randomUUID(); const r = s.reserve(input(), key);
    expect(s.reserve(input(), key).reference).toBe(r.reference);
    expect(() => s.reserve(input("17:30"), key)).toThrow("datos cambiaron");
  });
  it("opens a morning only once when payment is confirmed, even with different event IDs", () => {
    const s = store(); const r = s.reserve(input(), randomUUID());
    expect(s.getAvailability().dates[0].slots[0].status).toBe("not_open");
    s.transition(r.reference, "cs_test_1", "paid", "evt_1");
    s.transition(r.reference, "cs_test_1", "paid", "evt_1");
    s.transition(r.reference, "cs_test_1", "paid", "evt_2");
    expect(s.getAvailability().dates[0].slots.filter(x => x.status === "not_open")).toHaveLength(4);
    expect(s.getAvailability().dates[1].slots[0].status).toBe("not_open");
  });
  it("keeps appointments held past the local deadline until Stripe is reconciled", () => {
    let now = 0; const s = store(":memory:", () => now); s.reserve(input(), randomUUID());
    now = HOLD_DURATION_MS + 1;
    expect(s.due()).toHaveLength(1);
    expect(() => s.reserve(input(), randomUUID())).toThrow();
  });
  it("counts pending VIP claims, releases failed ones, and never silently raises the price", () => {
    const s = store(); const dates = ["2026-10-21", "2026-10-22"];
    const reservations = dates.flatMap(date => ["16:00", "17:30", "19:00", "20:30", "22:00"].map(time => s.reserve(input(time, date, "navidad26"), randomUUID())));
    expect(s.getAvailability().coupon.available).toBe(false);
    expect(() => s.reserve(input("16:00", "2026-10-23", "NAVIDAD26"), randomUUID())).toThrow("agotaron");
    s.transition(reservations[0].reference, "cs_test_1", "expired", "evt_expired");
    expect(s.reserve(input("16:00", "2026-10-23", "NAVIDAD26"), randomUUID()).deposit).toBe(800);
    expect(s.getAvailability().coupon.claimed).toBe(10);
  });
  it("rejects the VIP code after the scheduled deadline", () => {
    const s = store(":memory:", () => VIP_PRE_SALE_END_MS + 1);
    expect(s.getAvailability().coupon).toMatchObject({ active: false, available: false });
    expect(() => s.reserve(input("16:00", "2026-10-23", "NAVIDAD26"), randomUUID())).toThrow("La preventa VIP terminó");
  });
  it("lists reservations and persists admin photo status and notes", () => {
    const s = store();
    const reservation = s.reserve(input(), randomUUID());
    expect(s.list().map((item) => item.reference)).toEqual([reservation.reference]);
    expect(s.updateAdmin(reservation.reference, { photoStatus: "en_edicion", adminNote: "Enviar selección por WhatsApp" })).toMatchObject({ photoStatus: "en_edicion", adminNote: "Enviar selección por WhatsApp" });
    expect(s.get(reservation.reference)).toMatchObject({ photoStatus: "en_edicion", adminNote: "Enviar selección por WhatsApp" });
  });
});

describe("Stripe payment lifecycle", () => {
  it("creates a checkout with server-calculated pricing and the same idempotency key on retry", async () => {
    const s = store(); const { stripe, sessions } = client();
    const service = createPaymentService(stripe, s, "https://rubielphoto.com");
    sessions.create.mockImplementation(async (params) => {
      const r = s.get(params.client_reference_id)!;
      return session(r);
    });
    const key = randomUUID();
    const result = await service.reserve({ ...input(), people: 7 }, key);
    const r = s.get(result.reference)!;
    sessions.retrieve.mockResolvedValue(session(r));
    await service.reserve({ ...input(), people: 7 }, key);
    expect(sessions.create).toHaveBeenCalledTimes(1);
    expect(sessions.create.mock.calls[0][0]).toMatchObject({ line_items: [{ price_data: { unit_amount: 110000, currency: "mxn" } }], payment_method_types: ["card"], success_url: "https://rubielphoto.com/reserva/confirmacion?session_id={CHECKOUT_SESSION_ID}" });
    expect(sessions.create.mock.calls[0][1].idempotencyKey).toBe(`navidad-2026:${r.reference}`);
  });
  it("recovers a timed-out checkout using the original Stripe idempotency key", async () => {
    const s = store(); const { stripe, sessions } = client(); const service = createPaymentService(stripe, s, "https://rubielphoto.com");
    sessions.create.mockRejectedValueOnce(new Error("timeout")).mockImplementationOnce(async params => session(s.get(params.client_reference_id)!));
    const key = randomUUID();
    await expect(service.reserve(input(), key)).rejects.toThrow("timeout");
    await service.reserve(input(), key);
    expect(sessions.create.mock.calls[0]).toEqual(sessions.create.mock.calls[1]);
  });
  it("expires checkout before returning the appointment and coupon to inventory", async () => {
    let now = 0; const s = store(":memory:", () => now); const r = s.reserve(input("16:00", "2026-10-21", "NAVIDAD26"), randomUUID());
    const { stripe, sessions } = client(); s.attachSession(r.reference, session(r).id);
    sessions.retrieve.mockResolvedValue(session(r)); sessions.expire.mockResolvedValue(session(r, { status: "expired" }));
    now = HOLD_DURATION_MS;
    await createPaymentService(stripe, s, "https://rubielphoto.com", () => now).reconcileExpired();
    expect(sessions.expire).toHaveBeenCalledWith(session(r).id);
    expect(s.getAvailability().dates[0].slots.find(x => x.time === "16:00")?.available).toBe(true);
    expect(s.getAvailability().coupon.claimed).toBe(0);
  });
  it("confirms a payment that completes while the session is being expired", async () => {
    let now = 0; const s = store(":memory:", () => now); const r = s.reserve(input(), randomUUID());
    const { stripe, sessions } = client(); s.attachSession(r.reference, session(r).id);
    sessions.retrieve.mockResolvedValueOnce(session(r)).mockResolvedValueOnce(session(r, { status: "complete", payment_status: "paid" }));
    sessions.expire.mockRejectedValue(new Error("already completed")); now = HOLD_DURATION_MS;
    await createPaymentService(stripe, s, "https://rubielphoto.com", () => now).reconcileExpired();
    expect(s.get(r.reference)?.state).toBe("paid");
  });
  it("never releases inventory when Stripe cannot be contacted", async () => {
    let now = 0; const s = store(":memory:", () => now); const r = s.reserve(input(), randomUUID());
    const { stripe, sessions } = client(); s.attachSession(r.reference, session(r).id);
    sessions.retrieve.mockRejectedValue(new Error("offline")); now = HOLD_DURATION_MS;
    await expect(createPaymentService(stripe, s, "https://rubielphoto.com", () => now).reconcileExpired()).rejects.toThrow();
    expect(s.get(r.reference)?.state).toBe("held");
  });
  it("rejects wrong amounts, currency, reference and session binding", () => {
    const s = store(); const r = s.reserve(input(), randomUUID()); const { stripe } = client();
    const service = createPaymentService(stripe, s, "https://rubielphoto.com");
    for (const override of [{ amount_total: 1 }, { currency: "usd" }, { client_reference_id: "different" }]) {
      expect(() => service.applySession(session(r, { status: "complete", payment_status: "paid", ...override }))).toThrow();
    }
    s.attachSession(r.reference, "cs_test_expected");
    expect(() => service.applySession(session(r, { status: "complete", payment_status: "paid" }))).toThrow();
    expect(s.get(r.reference)?.state).toBe("held");
  });
  it("reads current Stripe state when old events arrive and ignores other projects", async () => {
    const s = store(); const r = s.reserve(input(), randomUUID()); const { stripe, sessions } = client();
    sessions.retrieve.mockResolvedValue(session(r, { status: "complete", payment_status: "paid" }));
    const service = createPaymentService(stripe, s, "https://rubielphoto.com");
    await service.handleEvent({ id: "evt_late", type: "checkout.session.expired", data: { object: session(r, { status: "expired" }) } } as Stripe.Event);
    expect(s.get(r.reference)?.state).toBe("paid");
    await service.handleEvent({ id: "evt_other", type: "checkout.session.completed", data: { object: session(r, { metadata: { project: "other" } }) } } as Stripe.Event);
    expect(sessions.retrieve).toHaveBeenCalledTimes(1);
  });
  it("holds processing payments until their final success or failure", () => {
    const s = store(); const r = s.reserve(input(), randomUUID()); const { stripe } = client();
    const service = createPaymentService(stripe, s, "https://rubielphoto.com");
    service.applySession(session(r, { status: "complete", payment_status: "unpaid" }));
    expect(s.get(r.reference)?.state).toBe("processing");
    service.applySession(session(r, { status: "complete", payment_status: "unpaid" }), "evt_failed", true);
    expect(s.get(r.reference)?.state).toBe("failed");
  });
});

describe("webhook configuration and signature", () => {
  it("does not enable charges merely because credentials exist", () => {
    vi.stubEnv("MOCK_PAYMENTS", "false"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fake"); vi.stubEnv("STRIPE_PAYMENTS_ENABLED", "false");
    expect(paymentMode()).toBe("unavailable");
  });
  it("rejects missing, forged, stale or mutated webhook signatures", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_testsecret");
    const stripe = new Stripe("sk_test_fake"); const payload = JSON.stringify({ id: "evt_test", object: "event", type: "checkout.session.completed", livemode: false });
    const valid = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_testsecret" });
    const stale = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_testsecret", timestamp: Math.floor(Date.now() / 1000) - 3600 });
    for (const [body, signature] of [[payload, ""], [payload, "forged"], [payload + " ", valid], [payload, stale]]) {
      const response = await webhook(new Request("https://rubielphoto.com/api/webhooks/stripe", { method: "POST", body, headers: signature ? { "stripe-signature": signature } : {} }));
      expect(response.status).toBe(400);
    }
  });
  it("rejects a signed event from the wrong live/test environment", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_testsecret");
    const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed", livemode: true });
    const signature = new Stripe("sk_test_fake").webhooks.generateTestHeaderString({ payload, secret: "whsec_testsecret" });
    expect((await webhook(new Request("https://rubielphoto.com/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": signature } }))).status).toBe(400);
  });
});
