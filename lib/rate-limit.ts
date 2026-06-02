import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Returns true if the action is ALLOWED (under the limit for the window), false
 * if rate-limited. Counter is DB-backed (works across serverless instances).
 *
 * Default policy FAILS OPEN: if the limiter itself errors we allow the request
 * rather than block a legitimate user (good for cosmetic limits like concierge).
 * Pass `failClosed=true` for credential endpoints (sign-in/up, magic link) so a
 * broken limiter can never silently remove brute-force protection (PUB-2).
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
  failClosed = false,
): Promise<boolean> {
  try {
    const db = createAdminClient();
    const { data, error } = await db.rpc("rate_limit_hit", {
      p_key: key,
      p_max: max,
      p_window: windowSeconds,
    });
    if (error) {
      console.error("rate_limit_hit error", error.message);
      return !failClosed;
    }
    return data === true;
  } catch (err) {
    console.error("rateLimit failed", err);
    return !failClosed;
  }
}

/** Convenience: rate-limit by client IP for a named action. */
export async function rateLimitByIp(
  action: string,
  max: number,
  windowSeconds: number,
  failClosed = false,
): Promise<boolean> {
  const ip = await clientIp();
  return rateLimit(`${action}:${ip}`, max, windowSeconds, failClosed);
}
