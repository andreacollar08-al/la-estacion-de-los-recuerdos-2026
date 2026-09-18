import { NextResponse } from "next/server";
import { adminIsConfigured, adminSessionCookie, createAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!adminIsConfigured()) return NextResponse.json({ error: "El acceso interno aún no está configurado." }, { status: 503 });
  try {
    const body = await request.json() as { password?: unknown };
    if (typeof body.password !== "string" || body.password.length < 1 || body.password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
    }
    const token = await createAdminSession();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store", "Set-Cookie": adminSessionCookie(token) } });
  } catch {
    return NextResponse.json({ error: "No pudimos iniciar sesión." }, { status: 400 });
  }
}
