import { NextResponse } from "next/server";

/** Liveness probe. Does not touch env or external services. */
export function GET() {
  return NextResponse.json({ status: "ok", service: "dnd-luxury-marketplace" });
}
