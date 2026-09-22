import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { getReservationPricing, reservationSchema, type ReservationInput, type ReservationPricing } from "./booking";
import { HOLD_DURATION_MS, INITIAL_RELEASED_TIMES, isVipPresaleActive, OCTOBER_DATES, TIME_SLOTS, type Availability } from "./booking-config";

export type PaymentReservation = ReservationInput & ReservationPricing & {
  reference: string; requestKey: string; fingerprint: string; couponApplied: boolean;
  photos: number; state: "held" | "processing" | "paid" | "expired" | "failed";
  createdAt: number; expiresAt: number; sessionId: string | null; paymentIntentId: string | null;
  adminNote?: string;
  photoStatus?: "pendientes" | "en_edicion" | "listas" | "entregadas";
};

export class BookingError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

type MaybePromise<T> = T | Promise<T>;
export type PaymentStore = {
  get(reference: string): MaybePromise<PaymentReservation | undefined>;
  getBySession(id: string): MaybePromise<PaymentReservation | undefined>;
  list(): MaybePromise<PaymentReservation[]>;
  getAvailability(): MaybePromise<Availability>;
  reserve(input: ReservationInput, key: string): MaybePromise<PaymentReservation>;
  updateAdmin(reference: string, patch: Pick<PaymentReservation, "adminNote" | "photoStatus"> & Partial<Pick<PaymentReservation, "name">>): MaybePromise<PaymentReservation>;
  attachSession(reference: string, id: string, paymentIntentId?: string | null): MaybePromise<void>;
  transition(reference: string, sessionId: string, state: PaymentReservation["state"], eventId?: string, paymentIntentId?: string | null): MaybePromise<void>;
  due(): MaybePromise<PaymentReservation[]>;
  close(): MaybePromise<void>;
};

function fingerprint(input: ReservationInput) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function active(r: PaymentReservation) {
  return ["held", "processing", "paid"].includes(r.state);
}

function buildAvailability(reservations: PaymentReservation[], releasedSlots: { date: string; time: string }[], now = Date.now()): Availability {
  const releasedByDate = new Map<string, Set<string>>();
  for (const date of OCTOBER_DATES) releasedByDate.set(date.iso, new Set(INITIAL_RELEASED_TIMES));
  for (const row of releasedSlots) releasedByDate.get(row.date)?.add(row.time);
  const current = reservations.filter(active);
  const claimed = current.filter((r) => r.couponApplied).length;
  const vipActive = isVipPresaleActive(now);
  return {
    dates: OCTOBER_DATES.map((date) => {
      const released = releasedByDate.get(date.iso)!;
      return { ...date, slots: TIME_SLOTS.map((time) => {
        const occupied = current.some((r) => r.date === date.iso && r.time === time);
        const status = occupied ? "held" : released.has(time) ? "available" : "not_open";
        return { time, status, available: status === "available" };
      }) };
    }),
    coupon: { code: "NAVIDAD26", limit: 10, claimed, available: vipActive && claimed < 10, active: vipActive },
  };
}

export function createPaymentStore(path: string, now = () => Date.now()) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_reservations (
      reference TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL, time TEXT NOT NULL, state TEXT NOT NULL,
      session_id TEXT UNIQUE, expires_at INTEGER NOT NULL, data TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS occupied_payment_slot
      ON payment_reservations(date, time) WHERE state IN ('held', 'processing', 'paid');
    CREATE TABLE IF NOT EXISTS payment_released_slots (
      date TEXT NOT NULL, time TEXT NOT NULL, PRIMARY KEY (date, time)
    );
    CREATE TABLE IF NOT EXISTS processed_stripe_events (
      id TEXT PRIMARY KEY, processed_at INTEGER NOT NULL
    );
  `);
  const decode = (row: unknown): PaymentReservation | undefined => row ? JSON.parse((row as { data: string }).data) : undefined;
  const get = (reference: string) => decode(db.prepare("SELECT data FROM payment_reservations WHERE reference = ?").get(reference));
  const getBySession = (id: string) => decode(db.prepare("SELECT data FROM payment_reservations WHERE session_id = ?").get(id));
  const all = () => db.prepare("SELECT data FROM payment_reservations").all().map((row) => decode(row)!);
  const list = () => all().sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  const released = (date: string): Set<string> => new Set([
    ...INITIAL_RELEASED_TIMES,
    ...(db.prepare("SELECT time FROM payment_released_slots WHERE date = ?").all(date) as { time: string }[]).map((row) => row.time),
  ]);
  const getAvailability = () => {
    const releasedSlots = OCTOBER_DATES.flatMap((date) => [...released(date.iso)]
      .filter((time) => !INITIAL_RELEASED_TIMES.includes(time as typeof INITIAL_RELEASED_TIMES[number]))
      .map((time) => ({ date: date.iso, time })));
    return buildAvailability(all(), releasedSlots, now());
  };
  function save(r: PaymentReservation) {
    db.prepare("UPDATE payment_reservations SET state = ?, session_id = ?, expires_at = ?, data = ? WHERE reference = ?")
      .run(r.state, r.sessionId, r.expiresAt, JSON.stringify(r), r.reference);
  }
  function updateAdmin(reference: string, patch: Pick<PaymentReservation, "adminNote" | "photoStatus"> & Partial<Pick<PaymentReservation, "name">>) {
    const current = get(reference);
    if (!current) throw new BookingError("No encontramos esa reserva.", 404);
    const updated = { ...current, ...patch };
    save(updated);
    return updated;
  }
  const reserve = db.transaction((raw: ReservationInput, requestKey: string) => {
    const input = reservationSchema.parse(raw);
    input.coupon = input.coupon.toUpperCase();
    const existing = decode(db.prepare("SELECT data FROM payment_reservations WHERE request_key = ?").get(requestKey));
    const currentFingerprint = fingerprint(input);
    if (existing) {
      if (existing.fingerprint !== currentFingerprint) throw new BookingError("Los datos cambiaron. Vuelve a intentar la reserva.");
      if (existing.state !== "held" || existing.expiresAt <= now()) throw new BookingError("Ese intento ya terminó. Selecciona tu horario de nuevo.");
      return existing;
    }
    const availability = getAvailability();
    const slot = availability.dates.find((d) => d.iso === input.date)?.slots.find((s) => s.time === input.time);
    if (!slot?.available) throw new BookingError("Ese horario no está disponible. Selecciona otro.");
    if (input.coupon && input.coupon !== "NAVIDAD26") throw new BookingError("El cupón no es válido.");
    if (input.coupon && !isVipPresaleActive(now())) throw new BookingError("La tarifa preferente terminó. Continúa con el precio de preventa.");
    if (input.coupon && !availability.coupon.available) throw new BookingError("Los cupones VIP se agotaron. Revisa el precio antes de continuar.");
    const couponApplied = input.coupon === "NAVIDAD26";
    const reservation: PaymentReservation = {
      ...input, ...getReservationPricing(input.people, couponApplied), couponApplied,
      photos: couponApplied ? 7 : 5, requestKey, fingerprint: currentFingerprint,
      reference: `RPA-${randomUUID()}`, state: "held", sessionId: null, paymentIntentId: null,
      createdAt: now(), expiresAt: now() + HOLD_DURATION_MS,
    };
    db.prepare("INSERT INTO payment_reservations (reference, request_key, date, time, state, expires_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(reservation.reference, requestKey, input.date, input.time, reservation.state, reservation.expiresAt, JSON.stringify(reservation));
    return reservation;
  });
  const attachSession = db.transaction((reference: string, sessionId: string, paymentIntentId?: string | null) => {
    const r = get(reference);
    if (!r || (r.sessionId && r.sessionId !== sessionId)) throw new Error("Checkout session mismatch");
    const currentPaymentIntentId = r.paymentIntentId ?? null;
    if (currentPaymentIntentId && paymentIntentId && currentPaymentIntentId !== paymentIntentId) throw new Error("Payment intent mismatch");
    save({ ...r, sessionId, paymentIntentId: paymentIntentId ?? currentPaymentIntentId });
  });
  const transition = db.transaction((reference: string, sessionId: string, state: PaymentReservation["state"], eventId?: string, paymentIntentId?: string | null) => {
    if (eventId && db.prepare("SELECT id FROM processed_stripe_events WHERE id = ?").get(eventId)) return;
    const r = get(reference);
    if (!r || (r.sessionId && r.sessionId !== sessionId)) throw new Error("Unknown reservation or session");
    const currentPaymentIntentId = r.paymentIntentId ?? null;
    if (currentPaymentIntentId && paymentIntentId && currentPaymentIntentId !== paymentIntentId) throw new Error("Payment intent mismatch");
    const updated = { ...r, sessionId, paymentIntentId: paymentIntentId ?? currentPaymentIntentId };
    if (r.state === "paid") {
      if (updated.paymentIntentId !== currentPaymentIntentId) save(updated);
      if (eventId) db.prepare("INSERT OR IGNORE INTO processed_stripe_events (id, processed_at) VALUES (?, ?)").run(eventId, now());
      return;
    }
    if (["expired", "failed"].includes(r.state)) {
      if (state === "paid") throw new Error("Payment received for a released reservation; manual review required");
      if (updated.paymentIntentId !== currentPaymentIntentId) save(updated);
      if (eventId) db.prepare("INSERT OR IGNORE INTO processed_stripe_events (id, processed_at) VALUES (?, ?)").run(eventId, now());
      return;
    }
    save({ ...updated, state });
    if (state === "paid") {
      const open = released(r.date);
      const next = TIME_SLOTS.find((time) => !open.has(time));
      if (next) db.prepare("INSERT OR IGNORE INTO payment_released_slots (date, time) VALUES (?, ?)").run(r.date, next);
    }
    if (eventId) db.prepare("INSERT OR IGNORE INTO processed_stripe_events (id, processed_at) VALUES (?, ?)").run(eventId, now());
  });
  return {
    get, getBySession, list, getAvailability, updateAdmin,
    reserve: (input: ReservationInput, key: string) => reserve.immediate(input, key),
    attachSession: (reference: string, id: string, paymentIntentId?: string | null) => attachSession.immediate(reference, id, paymentIntentId),
    transition: (reference: string, id: string, state: PaymentReservation["state"], eventId?: string, paymentIntentId?: string | null) => transition.immediate(reference, id, state, eventId, paymentIntentId),
    due: () => all().filter((r) => r.state === "held" && r.expiresAt <= now()),
    close: () => { db.close(); },
  };
}

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta?: { changes?: number } }>;
};
type D1DatabaseLike = { prepare(sql: string): D1Statement; batch(statements: D1Statement[]): Promise<unknown[]> };

function d1Row(row: unknown): PaymentReservation | undefined {
  if (!row) return undefined;
  return JSON.parse(String((row as { data: string }).data));
}

export function createD1PaymentStore(db: D1DatabaseLike, now = () => Date.now()): PaymentStore {
  async function all() {
    const result = await db.prepare("SELECT data FROM payment_reservations").all<{ data: string }>();
    return result.results.map(d1Row).filter((r): r is PaymentReservation => Boolean(r));
  }
  async function released() {
    const result = await db.prepare("SELECT date, time FROM payment_released_slots").all<{ date: string; time: string }>();
    return result.results;
  }
  async function getAvailability() { return buildAvailability(await all(), await released(), now()); }
  async function get(reference: string) {
    return d1Row(await db.prepare("SELECT data FROM payment_reservations WHERE reference = ?").bind(reference).first());
  }
  async function getBySession(id: string) {
    return d1Row(await db.prepare("SELECT data FROM payment_reservations WHERE session_id = ?").bind(id).first());
  }
  async function list() {
    return (await all()).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  }
  async function reserve(raw: ReservationInput, requestKey: string) {
    const input = reservationSchema.parse(raw);
    input.coupon = input.coupon.toUpperCase();
    const currentFingerprint = fingerprint(input);
    const existing = d1Row(await db.prepare("SELECT data FROM payment_reservations WHERE request_key = ?").bind(requestKey).first());
    if (existing) {
      if (existing.fingerprint !== currentFingerprint) throw new BookingError("Los datos cambiaron. Vuelve a intentar la reserva.");
      if (existing.state !== "held" || existing.expiresAt <= now()) throw new BookingError("Ese intento ya terminó. Selecciona tu horario de nuevo.");
      return existing;
    }
    const availability = await getAvailability();
    const slot = availability.dates.find((d) => d.iso === input.date)?.slots.find((s) => s.time === input.time);
    if (!slot?.available) throw new BookingError("Ese horario no está disponible. Selecciona otro.");
    if (input.coupon && input.coupon !== "NAVIDAD26") throw new BookingError("El cupón no es válido.");
    if (input.coupon && !isVipPresaleActive(now())) throw new BookingError("La tarifa preferente terminó. Continúa con el precio de preventa.");
    if (input.coupon && !availability.coupon.available) throw new BookingError("Los cupones VIP se agotaron. Revisa el precio antes de continuar.");
    const couponApplied = input.coupon === "NAVIDAD26";
    const reservation: PaymentReservation = {
      ...input, ...getReservationPricing(input.people, couponApplied), couponApplied,
      photos: couponApplied ? 7 : 5, requestKey, fingerprint: currentFingerprint,
      reference: `RPA-${randomUUID()}`, state: "held", sessionId: null, paymentIntentId: null,
      createdAt: now(), expiresAt: now() + HOLD_DURATION_MS,
    };
    try {
      await db.prepare("INSERT INTO payment_reservations (reference, request_key, date, time, state, expires_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(reservation.reference, requestKey, input.date, input.time, reservation.state, reservation.expiresAt, JSON.stringify(reservation)).run();
    } catch {
      const retry = d1Row(await db.prepare("SELECT data FROM payment_reservations WHERE request_key = ?").bind(requestKey).first());
      if (retry) {
        if (retry.fingerprint !== currentFingerprint) throw new BookingError("Los datos cambiaron. Vuelve a intentar la reserva.");
        return retry;
      }
      throw new BookingError("Ese horario acaba de ser apartado. Elige otro para continuar.");
    }
    return reservation;
  }
  async function attachSession(reference: string, sessionId: string, paymentIntentId?: string | null) {
    const r = await get(reference);
    if (!r || (r.sessionId && r.sessionId !== sessionId)) throw new Error("Checkout session mismatch");
    const currentPaymentIntentId = r.paymentIntentId ?? null;
    if (currentPaymentIntentId && paymentIntentId && currentPaymentIntentId !== paymentIntentId) throw new Error("Payment intent mismatch");
    await db.prepare("UPDATE payment_reservations SET session_id = ?, data = ? WHERE reference = ?")
      .bind(sessionId, JSON.stringify({ ...r, sessionId, paymentIntentId: paymentIntentId ?? currentPaymentIntentId }), reference).run();
  }
  async function updateAdmin(reference: string, patch: Pick<PaymentReservation, "adminNote" | "photoStatus"> & Partial<Pick<PaymentReservation, "name">>) {
    const current = await get(reference);
    if (!current) throw new BookingError("No encontramos esa reserva.", 404);
    const updated = { ...current, ...patch };
    await db.prepare("UPDATE payment_reservations SET state = ?, session_id = ?, expires_at = ?, data = ? WHERE reference = ?")
      .bind(updated.state, updated.sessionId, updated.expiresAt, JSON.stringify(updated), updated.reference).run();
    return updated;
  }
  async function transition(reference: string, sessionId: string, state: PaymentReservation["state"], eventId?: string, paymentIntentId?: string | null) {
    if (eventId) {
      const seen = await db.prepare("SELECT id FROM processed_stripe_events WHERE id = ?").bind(eventId).first();
      if (seen) return;
    }
    const r = await get(reference);
    if (!r || (r.sessionId && r.sessionId !== sessionId)) throw new Error("Unknown reservation or session");
    const currentPaymentIntentId = r.paymentIntentId ?? null;
    if (currentPaymentIntentId && paymentIntentId && currentPaymentIntentId !== paymentIntentId) throw new Error("Payment intent mismatch");
    const updated = { ...r, sessionId, paymentIntentId: paymentIntentId ?? currentPaymentIntentId };
    if (r.state === "paid") {
      if (updated.paymentIntentId !== currentPaymentIntentId) {
        await db.prepare("UPDATE payment_reservations SET session_id = ?, data = ? WHERE reference = ?")
          .bind(sessionId, JSON.stringify(updated), reference).run();
      }
      if (eventId) await db.prepare("INSERT OR IGNORE INTO processed_stripe_events (id, processed_at) VALUES (?, ?)").bind(eventId, now()).run();
      return;
    }
    if (["expired", "failed"].includes(r.state)) {
      if (state === "paid") throw new Error("Payment received for a released reservation; manual review required");
      if (updated.paymentIntentId !== currentPaymentIntentId) {
        await db.prepare("UPDATE payment_reservations SET session_id = ?, data = ? WHERE reference = ?")
          .bind(sessionId, JSON.stringify(updated), reference).run();
      }
      if (eventId) await db.prepare("INSERT OR IGNORE INTO processed_stripe_events (id, processed_at) VALUES (?, ?)").bind(eventId, now()).run();
      return;
    }
    const transitioned = { ...updated, state };
    const statements = [db.prepare("UPDATE payment_reservations SET state = ?, session_id = ?, data = ? WHERE reference = ?").bind(state, sessionId, JSON.stringify(transitioned), reference)];
    if (state === "paid") {
      const current = await getAvailability();
      const open = new Set(current.dates.find((d) => d.iso === r.date)?.slots.filter((s) => s.status === "available").map((s) => s.time) ?? []);
      const next = TIME_SLOTS.find((time) => !open.has(time));
      if (next) statements.push(db.prepare("INSERT OR IGNORE INTO payment_released_slots (date, time) VALUES (?, ?)").bind(r.date, next));
    }
    if (eventId) statements.push(db.prepare("INSERT OR IGNORE INTO processed_stripe_events (id, processed_at) VALUES (?, ?)").bind(eventId, now()));
    await db.batch(statements);
  }
  return {
    get, getBySession, list, getAvailability, reserve, updateAdmin, attachSession, transition,
    due: async () => (await all()).filter((r) => r.state === "held" && r.expiresAt <= now()),
    close: async () => {},
  };
}

let cached: ReturnType<typeof createPaymentStore> | undefined;
let d1Cached: Promise<PaymentStore | undefined> | undefined;
async function getD1Database(): Promise<D1DatabaseLike | undefined> {
  if (!(process.env.CF_PAGES || typeof globalThis !== "undefined" && "WebSocketPair" in globalThis)) return undefined;
  try {
    const { env } = await import("cloudflare:workers");
    return (env as { DB?: D1DatabaseLike }).DB;
  } catch { return undefined; }
}

export async function getPaymentStore(): Promise<PaymentStore> {
  d1Cached ??= getD1Database().then((db) => db ? createD1PaymentStore(db) : undefined);
  const d1 = await d1Cached;
  if (d1) return d1;
  if (process.env.CF_PAGES || typeof globalThis !== "undefined" && "WebSocketPair" in globalThis) {
    throw new Error("The payment store requires the Sites D1 binding `DB`.");
  }
  return cached ??= createPaymentStore(process.env.DATABASE_PATH || "./data/navidad-2026.db");
}
