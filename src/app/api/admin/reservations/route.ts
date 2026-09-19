import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { hasAdminSession } from "@/lib/admin-auth";
import { getPaymentStore, BookingError } from "@/lib/payment-store";
import { reservationSchema } from "@/lib/booking";

export const runtime = "nodejs";

const PHOTO_STATUSES = new Set(["pendientes", "en_edicion", "listas", "entregadas"]);

export async function POST(request: Request) {
  if (!(await hasAdminSession(request))) return NextResponse.json({ error: "Sesión no autorizada." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const parsed = reservationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Completa fecha, horario y datos del cliente." }, { status: 400 });
    const reservation = await (await getPaymentStore()).reserve(parsed.data, `admin-${randomUUID()}`);
    return NextResponse.json({ ok: true, reference: reservation.reference }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof BookingError ? error.status : 503;
    return NextResponse.json({ error: error instanceof Error ? error.message : "No pudimos registrar la reserva." }, { status });
  }
}

export async function PATCH(request: Request) {
  if (!(await hasAdminSession(request))) return NextResponse.json({ error: "Sesión no autorizada." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const body = await request.json() as { reference?: unknown; name?: unknown; photoStatus?: unknown; adminNote?: unknown };
    if (typeof body.reference !== "string" || body.reference.length < 4 || body.reference.length > 120) {
      return NextResponse.json({ error: "Reserva inválida." }, { status: 400 });
    }
    const patch: { name?: string; photoStatus?: "pendientes" | "en_edicion" | "listas" | "entregadas"; adminNote?: string } = {};
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 90) return NextResponse.json({ error: "El nombre es inválido." }, { status: 400 });
      patch.name = body.name.trim();
    }
    if (body.photoStatus !== undefined) {
      if (typeof body.photoStatus !== "string" || !PHOTO_STATUSES.has(body.photoStatus)) return NextResponse.json({ error: "Estado de fotos inválido." }, { status: 400 });
      patch.photoStatus = body.photoStatus as NonNullable<typeof patch.photoStatus>;
    }
    if (body.adminNote !== undefined) {
      if (typeof body.adminNote !== "string" || body.adminNote.length > 1200) return NextResponse.json({ error: "La nota es demasiado larga." }, { status: 400 });
      patch.adminNote = body.adminNote.trim();
    }
    if (!Object.keys(patch).length) return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
    const reservation = await (await getPaymentStore()).updateAdmin(body.reference, patch);
    return NextResponse.json({ ok: true, reference: reservation.reference, photoStatus: reservation.photoStatus ?? "pendientes", adminNote: reservation.adminNote ?? "" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 503;
    return NextResponse.json({ error: error instanceof Error ? error.message : "No pudimos guardar el cambio." }, { status });
  }
}
