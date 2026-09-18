import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { OCTOBER_DATES, TIME_SLOTS } from "@/lib/booking-config";
import { getPaymentStore, type PaymentReservation } from "@/lib/payment-store";
import { paymentMode } from "@/lib/stripe-payments";

export const runtime = "nodejs";

function publicReservation(reservation: PaymentReservation) {
  return {
    reference: reservation.reference,
    date: reservation.date,
    time: reservation.time,
    name: reservation.name,
    whatsapp: reservation.whatsapp,
    email: reservation.email,
    people: reservation.people,
    photos: reservation.photos,
    couponApplied: reservation.couponApplied,
    state: reservation.state,
    base: reservation.base,
    extraPeople: reservation.extraPeople,
    extraFee: reservation.extraFee,
    total: reservation.total,
    deposit: reservation.deposit,
    balance: reservation.balance,
    photoStatus: reservation.photoStatus ?? "pendientes",
    adminNote: reservation.adminNote ?? "",
    createdAt: reservation.createdAt,
  };
}

export async function GET(request: Request) {
  if (!(await hasAdminSession(request))) return NextResponse.json({ error: "Sesión no autorizada." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const store = await getPaymentStore();
    const [reservations, availability] = await Promise.all([store.list(), store.getAvailability()]);
    const visible = reservations.map(publicReservation);
    const active = reservations.filter((reservation) => ["held", "processing", "paid"].includes(reservation.state));
    const paid = reservations.filter((reservation) => reservation.state === "paid");
    const pending = reservations.filter((reservation) => ["held", "processing"].includes(reservation.state));
    const scheduledSlots = OCTOBER_DATES.length * TIME_SLOTS.length;
    const availableSlots = availability.dates.flatMap((date) => date.slots).filter((slot) => slot.status === "available").length;
    const reservationsBySlot = new Map(reservations.filter((reservation) => ["held", "processing", "paid"].includes(reservation.state)).map((reservation) => [`${reservation.date}_${reservation.time}`, publicReservation(reservation)]));
    const calendar = availability.dates.map((date) => ({
      ...date,
      slots: date.slots.map((slot) => ({ ...slot, reservation: reservationsBySlot.get(`${date.iso}_${slot.time}`) ?? null })),
    }));
    return NextResponse.json({
      paymentMode: paymentMode(),
      generatedAt: new Date().toISOString(),
      metrics: {
        scheduledSlots,
        reservations: active.length,
        availableSlots,
        confirmed: paid.length,
        collected: paid.reduce((sum, reservation) => sum + reservation.deposit, 0),
        pending: pending.reduce((sum, reservation) => sum + reservation.balance, 0),
      },
      coupon: availability.coupon,
      calendar,
      reservations: visible,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No pudimos cargar el control interno." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
