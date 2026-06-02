/**
 * Returns `value` only if it is a safe INTERNAL redirect target, else null.
 *
 * Rejects:
 *   - non-string / empty values
 *   - anything not starting with "/"
 *   - protocol-relative URLs ("//evil.com")
 *   - backslash bypasses ("/\evil.com", "\/evil.com") — browsers normalise "\"
 *     to "/", so these resolve off-site as protocol-relative URLs
 *
 * Single chokepoint reused by the sign-in page, the auth server actions, and the
 * OAuth/magic-link callback so the three validations can never drift apart
 * (the cause of AUTH-1/AUTH-5). Pure + dependency-free so it is unit-testable.
 */
export function safeInternalRedirect(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const normalised = value.replace(/\\/g, "/");
  if (!normalised.startsWith("/") || normalised.startsWith("//")) return null;
  return value;
}
