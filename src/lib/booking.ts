import { z } from "zod";
import { EXTRA_PERSON_PRICE, HOLD_DURATION_MS, INCLUDED_PEOPLE, INITIAL_RELEASED_TIMES, isVipPresaleActive, MAX_PEOPLE, OCTOBER_DATES, REGULAR_SESSION_PRICE, TIME_SLOTS, VIP_SESSION_PRICE, type Availability } from "./booking-config";

export { OCTOBER_DATES, TIME_SLOTS } from "./booking-config";

export const reservationSchema = z.object({
  date: z.string().regex(/^2026-10-(21|22|23|24|28|29|30|31)$/),
  time: z.string().refine((value) => TIME_SLOTS.includes(value as (typeof TIME_SLOTS)[number])),
  name: z.string().trim().min(2).max(90),
  whatsapp: z.string().trim().regex(/^\d{10}$/),
  email: z.string().trim().email().max(150),
  people: z.coerce.number().int().min(1).max(MAX_PEOPLE).default(INCLUDED_PEOPLE),
  coupon: z.string().trim().max(24).optional().default(""),
});

export type ReservationInput = z.infer<typeof reservationSchema>;
export type ReservationPricing = {
  base: number;
  extraPeople: number;
  extraFee: number;
  total: number;
  deposit: number;
  balance: number;
};

export function getReservationPricing(people: number, couponApplied: boolean): ReservationPricing {
  const extraPeople = Math.max(0, people - INCLUDED_PEOPLE);
  const extraFee = extraPeople * EXTRA_PERSON_PRICE;
  const base = couponApplied ? VIP_SESSION_PRICE : REGULAR_SESSION_PRICE;
  const total = base + extraFee;
  const deposit = total / 2;
  return { base, extraPeople, extraFee, total, deposit, balance: total - deposit };
}
type SlotLock = ReservationInput & { expiresAt: number; reference: string };
type BookingStorage = {
  locks: Map<string, SlotLock>;
  released: Map<string, Set<string>>;
  vipClaims: number;
};

// Development-only, single-process store. Production requires transactional persistence.
export function createBookingStore(
  now = () => Date.now(),
  storage: BookingStorage = { locks: new Map(), released: new Map(), vipClaims: 0 },
) {
  function releasedTimes(date: string) {
    let released = storage.released.get(date);
    if (!released) {
      released = new Set<string>(INITIAL_RELEASED_TIMES);
      // Preserve any appointments made before staged availability was introduced.
      for (const lock of storage.locks.values()) {
        if (lock.date === date) released.add(lock.time);
      }
      storage.released.set(date, released);
    }
    return released;
  }

  function getAvailability(): Availability {
    for (const [key, lock] of storage.locks) {
      if (lock.expiresAt <= now()) storage.locks.delete(key);
    }
    return {
      dates: OCTOBER_DATES.map((date) => {
        const released = releasedTimes(date.iso);
        return {
          ...date,
          slots: TIME_SLOTS.map((time) => {
            const status = storage.locks.has(`${date.iso}_${time}`) ? "held" : released.has(time) ? "available" : "not_open";
            return { time, status, available: status === "available" };
          }),
        };
      }),
      coupon: { code: "NAVIDAD26", limit: 10, claimed: storage.vipClaims, available: isVipPresaleActive(now()) && storage.vipClaims < 10, active: isVipPresaleActive(now()) },
    };
  }

  function createReservation(input: ReservationInput) {
    const parsed = reservationSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, status: 400, error: "Revisa los datos de tu reserva." };
    input = parsed.data;
    const availability = getAvailability();
    const slot = availability.dates.find((date) => date.iso === input.date)?.slots.find((item) => item.time === input.time);
    if (!slot || slot.status === "not_open") {
      return { ok: false as const, status: 409, error: "Este horario aún no está habilitado. Elige uno de los horarios disponibles." };
    }
    if (!slot.available) {
      return { ok: false as const, status: 409, error: "Ese horario acaba de ser apartado. Elige otro para continuar." };
    }

    if (input.coupon && input.coupon.toUpperCase() !== "NAVIDAD26") {
      return { ok: false as const, status: 409, error: "El cupón no es válido." };
    }
    if (input.coupon && !isVipPresaleActive(now())) {
      return { ok: false as const, status: 409, error: "La preventa VIP terminó. El código y las fotos extra ya no están disponibles." };
    }
    const couponApplied = input.coupon.toUpperCase() === "NAVIDAD26" && availability.coupon.available;
    const pricing = getReservationPricing(input.people, couponApplied);
    const reference = `RPA-${input.date.replaceAll("-", "")}-${input.time.replace(":", "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    storage.locks.set(`${input.date}_${input.time}`, { ...input, reference, expiresAt: now() + HOLD_DURATION_MS });
    if (couponApplied) storage.vipClaims = Math.min(10, storage.vipClaims + 1);

    // In this preview, a successful 20-minute hold opens one more time on that day.
    // When real payments are added, move this to the idempotent paid-confirmation transaction.
    const released = releasedTimes(input.date);
    const nextTime = TIME_SLOTS.find((time) => !released.has(time));
    if (nextTime) released.add(nextTime);

    return {
      ok: true as const, status: 200, reference, couponApplied, ...pricing,
      people: input.people, photos: couponApplied ? 7 : 5,
      paymentUrl: `/reserva/confirmacion?reference=${reference}&name=${encodeURIComponent(input.name)}&deposit=${pricing.deposit}&total=${pricing.total}&people=${input.people}`,
    };
  }

  function claimVipCoupon() { storage.vipClaims = Math.min(10, storage.vipClaims + 1); }
  return { getAvailability, createReservation, claimVipCoupon };
}

const globalForBooking = globalThis as typeof globalThis & {
  __rubielSlotLocks?: Map<string, SlotLock>;
  __rubielVipClaims?: number;
  __rubielBookingStorage?: BookingStorage;
};
const storage = globalForBooking.__rubielBookingStorage ??= {
  locks: globalForBooking.__rubielSlotLocks ?? new Map(),
  released: new Map(),
  vipClaims: globalForBooking.__rubielVipClaims ?? 0,
};
const booking = createBookingStore(() => Date.now(), storage);
export const getAvailability = booking.getAvailability;
export const createReservation = booking.createReservation;
export const claimVipCoupon = booking.claimVipCoupon;
