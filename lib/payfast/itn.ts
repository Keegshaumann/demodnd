import "server-only";
import dns from "node:dns/promises";
import type { NextRequest } from "next/server";
import { payfast } from "./config";
import { payfastSignature } from "./signature";
import { pickClientIp } from "@/lib/net/client-ip";
import type { PayfastItn } from "./fulfill";

export type ItnResult =
  | { ok: true; data: PayfastItn }
  | { ok: false; retry: boolean; reason: string };

function clientIp(req: NextRequest): string | null {
  // Rightmost (proxy-appended) X-Forwarded-For entry — the address the closest
  // trusted proxy actually saw; a client can only spoof leftmost entries.
  return pickClientIp(
    req.headers.get("x-forwarded-for"),
    req.headers.get("x-real-ip"),
  );
}

async function ipIsPayfast(ip: string): Promise<boolean | null> {
  try {
    const resolved = await Promise.all(
      payfast.validHosts.map((h) =>
        dns.lookup(h, { all: true }).catch(() => []),
      ),
    );
    const allowed = new Set(resolved.flat().map((a) => a.address));
    return allowed.has(ip);
  } catch {
    return null; // couldn't resolve — undetermined
  }
}

async function postbackValidate(
  rawBody: string,
): Promise<"VALID" | "INVALID" | null> {
  try {
    const res = await fetch(payfast.validateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: rawBody,
    });
    const text = (await res.text()).trim();
    if (text === "VALID") return "VALID";
    if (text === "INVALID") return "INVALID";
    return null;
  } catch {
    return null; // network/transient
  }
}

/**
 * Validate a PayFast ITN with the four official checks; returns the parsed data
 * only if ALL pass. `retry: true` = transient (handler returns non-200 so
 * PayFast retries); `retry: false` = hard reject (return 200, never fulfil).
 * The amount-vs-listing anti-tamper check happens in fulfil.
 */
export async function validateItn(
  rawBody: string,
  req: NextRequest,
): Promise<ItnResult> {
  const params = new URLSearchParams(rawBody);

  // (1) Signature — recompute over the received fields IN ORDER, minus signature.
  const received = params.get("signature");
  if (!received) return { ok: false, retry: false, reason: "missing signature" };
  const pairs: [string, string][] = [...params.entries()].filter(
    ([k]) => k !== "signature",
  );
  const computed = payfastSignature(pairs, payfast.passphrase);
  if (computed.toLowerCase() !== received.toLowerCase()) {
    return { ok: false, retry: false, reason: "signature mismatch" };
  }

  // (1b) Merchant — the ITN must be for OUR PayFast account. This matters most
  // in sandbox / no-passphrase setups, where the signature alone wouldn't bind
  // the notification to our merchant_id.
  if (params.get("merchant_id") !== payfast.merchantId) {
    return { ok: false, retry: false, reason: "merchant_id mismatch" };
  }

  // (2) Source IP — fail closed only on a confidently non-PayFast IP. When the
  // IP is undeterminable (proxy/local), the postback below is authoritative.
  const ip = clientIp(req);
  if (ip) {
    const isPf = await ipIsPayfast(ip);
    if (isPf === false) {
      return { ok: false, retry: false, reason: `source ip ${ip} not PayFast` };
    }
    if (isPf === null) {
      console.warn("payfast ITN: could not resolve PayFast hosts for IP check");
    }
  } else {
    console.warn("payfast ITN: client IP undeterminable — relying on postback");
  }

  // (3) Data-validation postback — the authoritative server-side confirmation.
  const postback = await postbackValidate(rawBody);
  if (postback === "INVALID") {
    return { ok: false, retry: false, reason: "validate postback INVALID" };
  }
  if (postback === null) {
    return { ok: false, retry: true, reason: "validate postback unreachable" };
  }

  // (4) Payment status.
  const data = Object.fromEntries(params) as PayfastItn;
  if (data.payment_status !== "COMPLETE") {
    return {
      ok: false,
      retry: false,
      reason: `payment_status=${data.payment_status}`,
    };
  }

  return { ok: true, data };
}
