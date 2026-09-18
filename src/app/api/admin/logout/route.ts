import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store", "Set-Cookie": clearAdminSessionCookie() } });
}
