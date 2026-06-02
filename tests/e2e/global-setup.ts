import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * Reset the rate-limit counters before an E2E run so repeated runs don't trip
 * the (now fail-closed) sign-in limiter during the auth.setup logins.
 * Best-effort — never fail the whole run if psql isn't available.
 */
export default async function globalSetup() {
  try {
    const env = readFileSync(".env.local", "utf8");
    const dbUrl = env
      .match(/^SUPABASE_DB_URL=(.*)$/m)?.[1]
      ?.replace(/^["']|["']$/g, "")
      .trim();
    if (!dbUrl) return;
    execFileSync(
      "/opt/homebrew/opt/libpq/bin/psql",
      [dbUrl, "-c", "truncate table rate_limits"],
      { stdio: "ignore" },
    );
  } catch (err) {
    console.warn("[e2e globalSetup] could not reset rate_limits:", String(err));
  }
}
