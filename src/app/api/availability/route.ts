import { NextResponse } from "next/server";
import { getAvailability } from "@/lib/booking";
import { getPaymentService, paymentMode } from "@/lib/stripe-payments";
import { getPaymentStore } from "@/lib/payment-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const mode = paymentMode();
    if (mode === "stripe") await (await getPaymentService()).reconcileExpired();
    const availability = mode === "demo" ? getAvailability() : await (await getPaymentStore()).getAvailability();
    return NextResponse.json({ ...availability, paymentMode: mode }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No pudimos consultar la agenda." }, { status: 503 });
  }
}
