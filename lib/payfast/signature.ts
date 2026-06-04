import "server-only";
import crypto from "node:crypto";

/**
 * URL-encode a value the way PayFast (PHP `urlencode`) does, which is what the
 * signature must match: spaces become "+", and reserved chars use UPPERCASE
 * percent-hex. `encodeURIComponent` already uppercases its hex but leaves
 * !'()* unescaped (PHP escapes them), so we patch those.
 */
function pfEncode(value: string): string {
  // PayFast signs urlencode(trim(value)) — trim to match.
  return encodeURIComponent(value.trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * PayFast MD5 signature over ORDERED key/value pairs. Order is load-bearing:
 *  - building a checkout signature → PayFast's documented field order,
 *  - verifying an ITN → the order the fields were RECEIVED in (do not re-sort).
 * Blank values are excluded. The account passphrase (if set) is appended last.
 */
export function payfastSignature(
  pairs: [string, string][],
  passphrase?: string,
): string {
  let paramString = pairs
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `${k}=${pfEncode(v)}`)
    .join("&");

  if (passphrase && passphrase.length > 0) {
    paramString += `&passphrase=${pfEncode(passphrase)}`;
  }

  return crypto.createHash("md5").update(paramString).digest("hex");
}
