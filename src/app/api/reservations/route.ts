import { NextResponse } from "next/server";
import { createReservation, reservationSchema } from "@/lib/booking";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = reservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Revisa los datos: selecciona un horario y completa todos los campos." }, { status: 400 });
    }

    const result = createReservation(parsed.data);
    return NextResponse.json(result, { status: result.status });
  } catch {
    return NextResponse.json({ error: "No pudimos preparar tu reserva. Intenta de nuevo." }, { status: 400 });
  }
}
