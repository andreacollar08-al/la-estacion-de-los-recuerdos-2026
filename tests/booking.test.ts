import { describe, expect, it } from "vitest";
import { createBookingStore, getReservationPricing, reservationSchema } from "../src/lib/booking";
import { HOLD_DURATION_MS, INITIAL_RELEASED_TIMES, VIP_PRE_SALE_END_MS } from "../src/lib/booking-config";

const input = (time = "16:00", date = "2026-10-21") => reservationSchema.parse({
  date, time, name: "Familia Test", whatsapp: "9210000000", email: "test@example.com", people: 5, coupon: "",
});

describe("staged booking", () => {
  it("starts every October day with five afternoon/evening appointments", () => {
    const availability = createBookingStore().getAvailability();
    expect(availability.dates).toHaveLength(8);
    for (const day of availability.dates) {
      expect(day.slots).toHaveLength(10);
      expect(day.slots.filter((slot) => slot.available).map((slot) => slot.time)).toEqual(INITIAL_RELEASED_TIMES);
      expect(day.slots.filter((slot) => slot.status === "not_open")).toHaveLength(5);
      expect(day.slots.filter((slot) => slot.status === "held")).toHaveLength(0);
    }
  });

  it("rejects a direct request for an unopened morning without opening another slot", () => {
    const store = createBookingStore();
    const before = store.getAvailability();
    expect(store.createReservation(input("08:30"))).toMatchObject({ ok: false, status: 409 });
    expect(store.getAvailability()).toEqual(before);
  });

  it("opens exactly one morning on the reserved day and leaves other days untouched", () => {
    const store = createBookingStore();
    expect(store.createReservation(input()).ok).toBe(true);
    const [day, nextDay] = store.getAvailability().dates;
    expect(day.slots.find((slot) => slot.time === "16:00")).toMatchObject({ available: false, status: "held" });
    expect(day.slots.find((slot) => slot.time === "08:30")).toMatchObject({ available: true, status: "available" });
    expect(day.slots.filter((slot) => slot.status === "not_open")).toHaveLength(4);
    expect(nextDay.slots.find((slot) => slot.time === "08:30")?.status).toBe("not_open");
  });

  it("opens morning times in order for successive reservations", () => {
    const store = createBookingStore();
    for (const [index, time] of INITIAL_RELEASED_TIMES.entries()) {
      expect(store.createReservation(input(time)).ok).toBe(true);
      const slots = store.getAvailability().dates[0].slots;
      expect(slots.filter((slot) => slot.status === "not_open")).toHaveLength(4 - index);
      expect(slots[index].status).toBe("available");
    }
  });

  it("never opens extra times on a duplicate reservation", () => {
    const store = createBookingStore();
    expect(store.createReservation(input()).ok).toBe(true);
    const before = store.getAvailability();
    expect(store.createReservation(input())).toMatchObject({ ok: false, status: 409 });
    expect(store.getAvailability()).toEqual(before);
  });

  it("accepts only one same-slot request in a burst", async () => {
    const store = createBookingStore();
    const results = await Promise.all(Array.from({ length: 10 }, async () => store.createReservation(input())));
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(store.getAvailability().dates[0].slots.filter((slot) => slot.status === "not_open")).toHaveLength(4);
  });

  it("returns an expired hold to availability without closing previously released times", () => {
    let now = 0;
    const store = createBookingStore(() => now);
    store.createReservation(input());
    now = HOLD_DURATION_MS - 1;
    expect(store.getAvailability().dates[0].slots.find((slot) => slot.time === "16:00")?.status).toBe("held");
    now = HOLD_DURATION_MS;
    const day = store.getAvailability().dates[0];
    expect(day.slots.find((slot) => slot.time === "16:00")?.available).toBe(true);
    expect(day.slots.find((slot) => slot.time === "08:30")?.available).toBe(true);
    expect(day.slots.filter((slot) => slot.available)).toHaveLength(6);
  });

  it("stops at the ten actual appointments without inventing capacity", () => {
    const store = createBookingStore();
    for (let index = 0; index < 10; index++) {
      const slot = store.getAvailability().dates[0].slots.find((slot) => slot.available)!;
      expect(store.createReservation(input(slot.time)).ok).toBe(true);
    }
    const slots = store.getAvailability().dates[0].slots;
    expect(slots.filter((slot) => slot.available)).toHaveLength(0);
    expect(slots.filter((slot) => slot.status === "held")).toHaveLength(10);
    expect(store.createReservation(input())).toMatchObject({ ok: false, status: 409 });
  });

  it("keeps the VIP price and photo count on an open appointment", () => {
    const store = createBookingStore();
    const result = store.createReservation({ ...input(), coupon: "navidad26" });
    expect(result).toMatchObject({ ok: true, deposit: 800, total: 1600, photos: 7, people: 5 });
    expect(store.getAvailability().coupon.limit).toBe(10);
  });

  it("closes the VIP code and extra photos after the VIP deadline", () => {
    const store = createBookingStore(() => VIP_PRE_SALE_END_MS + 1);
    expect(store.getAvailability().coupon).toMatchObject({ active: false, available: false });
    expect(store.createReservation({ ...input(), coupon: "NAVIDAD26" })).toMatchObject({
      ok: false,
      status: 409,
      error: "La tarifa preferente terminó. Continúa con el precio de preventa.",
    });
  });

  it("adds $200 for each person after the five included", () => {
    expect(getReservationPricing(5, false)).toMatchObject({ base: 1800, extraPeople: 0, extraFee: 0, total: 1800, deposit: 900, balance: 900 });
    expect(getReservationPricing(7, false)).toMatchObject({ base: 1800, extraPeople: 2, extraFee: 400, total: 2200, deposit: 1100, balance: 1100 });
    expect(getReservationPricing(7, true)).toMatchObject({ base: 1600, extraPeople: 2, extraFee: 400, total: 2000, deposit: 1000, balance: 1000 });
  });

  it("stores the people count and extra price with the reservation result", () => {
    const store = createBookingStore();
    const result = store.createReservation({ ...input(), people: 6 });
    expect(result).toMatchObject({ ok: true, people: 6, extraPeople: 1, extraFee: 200, total: 2000, deposit: 1000, balance: 1000 });
  });

  it("rejects malformed customer data without changing availability", () => {
    const store = createBookingStore();
    const before = store.getAvailability();
    expect(store.createReservation({ ...input(), whatsapp: "123" })).toMatchObject({ ok: false, status: 400 });
    expect(store.getAvailability()).toEqual(before);
    expect(() => reservationSchema.parse({ ...input(), whatsapp: "123" })).toThrow();
  });
});
