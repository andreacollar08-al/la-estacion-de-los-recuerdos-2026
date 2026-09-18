export const OCTOBER_DATES = [
  { iso: "2026-10-21", weekday: "MIÉ", day: "21" },
  { iso: "2026-10-22", weekday: "JUE", day: "22" },
  { iso: "2026-10-23", weekday: "VIE", day: "23" },
  { iso: "2026-10-24", weekday: "SÁB", day: "24" },
  { iso: "2026-10-28", weekday: "MIÉ", day: "28" },
  { iso: "2026-10-29", weekday: "JUE", day: "29" },
  { iso: "2026-10-30", weekday: "VIE", day: "30" },
  { iso: "2026-10-31", weekday: "SÁB", day: "31" },
] as const;

export const TIME_SLOTS = ["08:30", "10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00", "20:30", "22:00"] as const;

// Start with the five afternoon/evening appointments; release earlier times in order.
export const INITIAL_RELEASED_TIMES = ["16:00", "17:30", "19:00", "20:30", "22:00"] as const satisfies readonly (typeof TIME_SLOTS)[number][];
export const HOLD_DURATION_MS = 20 * 60 * 1000;
export const INCLUDED_PEOPLE = 5;
export const MAX_PEOPLE = 12;
export const EXTRA_PERSON_PRICE = 200;
export const REGULAR_SESSION_PRICE = 1800;
export const VIP_SESSION_PRICE = 1600;

export type SlotStatus = "available" | "held" | "not_open";
export type Availability = {
  paymentMode?: "demo" | "stripe" | "unavailable";
  dates: ((typeof OCTOBER_DATES)[number] & {
    slots: { time: string; available: boolean; status: SlotStatus }[];
  })[];
  coupon: { code: string; limit: number; claimed: number; available: boolean };
};
