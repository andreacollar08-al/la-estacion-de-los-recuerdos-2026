import { NextResponse } from "next/server";
import { createReservation, reservationSchema } from "@/lib/booking";
import { getPaymentService, paymentMode, siteUrl } from "@/lib/stripe-payments";
import { BookingError } from "@/lib/payment-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = reservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Revisa los datos: selecciona un horario y completa todos los campos." }, { status: 400 });
    }

    const mode = paymentMode();
    if (mode === "demo") {
      const result = createReservation(parsed.data);
      return NextResponse.json(result, { status: result.status });
    }
    if (mode !== "stripe") return NextResponse.json({ error: "Los pagos todavía no están disponibles. Intenta más tarde." }, { status: 503 });
    if (request.headers.get("origin") !== siteUrl()) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
    const requestKey = request.headers.get("idempotency-key");
    if (!requestKey || !/^[a-f0-9-]{36}$/.test(requestKey)) return NextResponse.json({ error: "Vuelve a intentar la reserva." }, { status: 400 });
    const result = await (await getPaymentService()).reserve(parsed.data, requestKey);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    if (error instanceof BookingError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "No pudimos preparar tu pago. Intenta de nuevo con los mismos datos." }, { status: 503 });
  }
}
