import { NextResponse } from "next/server";
import { getAvailability } from "@/lib/booking";

export function GET() {
  return NextResponse.json(getAvailability(), { headers: { "Cache-Control": "no-store" } });
}
