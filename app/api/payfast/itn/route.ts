import { NextResponse, type NextRequest } from "next/server";
import { validateItn } from "@/lib/payfast/itn";
import { fulfillPayfastPayment } from "@/lib/payfast/fulfill";

// ITN validation needs the RAW, unparsed body for the signature + postback.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const result = await validateItn(rawBody, request);

  if (!result.ok) {
    console.error("payfast ITN rejected:", result.reason);
    // Transient (e.g. validate postback unreachable) → 500 so PayFast retries.
    // Hard-invalid → 200 to acknowledge and stop retries (we never fulfil).
    return new NextResponse("", { status: result.retry ? 500 : 200 });
  }

  try {
    await fulfillPayfastPayment(result.data);
  } catch (err) {
    // Returning 500 makes PayFast retry; fulfilment is idempotent so that's safe.
    console.error("payfast ITN: fulfilment error", err);
    return new NextResponse("", { status: 500 });
  }

  return new NextResponse("", { status: 200 });
}
