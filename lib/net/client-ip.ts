/**
 * Derive the client IP from proxy headers using a trust model that is safe
 * behind an APPEND-style reverse proxy (Vercel, and PayFast's ITN path): the
 * trusted proxy appends the real peer address to the RIGHT of X-Forwarded-For,
 * so the RIGHTMOST entry is the one a client cannot forge. A client can only
 * prepend spoofed entries on the left — which is exactly why reading the
 * leftmost entry (the naive `split(",")[0]`) lets an attacker rotate a fresh
 * fake IP per request and slip every per-IP rate-limit bucket.
 *
 * Falls back to X-Real-IP (also set by the trusted proxy), then null.
 *
 * Single source of truth so the rate limiter and the PayFast ITN IP check can
 * never drift apart.
 */
export function pickClientIp(
  forwardedFor: string | null,
  realIp: string | null,
): string | null {
  if (forwardedFor) {
    const ips = forwardedFor
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ips.length > 0) return ips[ips.length - 1] ?? null;
  }
  return realIp ?? null;
}
