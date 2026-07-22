import "server-only";
import { z } from "zod";

/**
 * Server-side environment validation.
 *
 * This module is `server-only` — importing it from a client component is a build
 * error, which guarantees secrets (service role key, Resend key, PayFast passphrase)
 * never leak into the browser bundle.
 *
 * Public values (NEXT_PUBLIC_*) are validated here too but are also safe to read
 * directly via `process.env` in client code, where Next.js inlines them at build.
 */
const serverEnvSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // PayFast (South African gateway — D&D collects funds directly; sellers are
  // paid later via manual EFT). Defaults to PayFast's PUBLIC SANDBOX credentials
  // so checkout works end-to-end before D&D has onboarded. For production set
  // PAYFAST_MODE=live + the real merchant id/key/passphrase.
  PAYFAST_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYFAST_MERCHANT_ID: z.string().min(1).default("10000100"),
  PAYFAST_MERCHANT_KEY: z.string().min(1).default("46f0cd694581a"),
  PAYFAST_PASSPHRASE: z.string().default(""),

  // Resend (transactional email)
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  ADMIN_NOTIFICATION_EMAIL: z.string().email(),

  // App
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Anthropic (seller price-estimate AI). OPTIONAL — when ANTHROPIC_API_KEY is
  // absent the estimator gracefully falls back to own-catalogue comps (or an
  // "unavailable" state), so the app builds and runs without it. Model defaults
  // to Haiku 4.5 (cheap, ~$0.0015/estimate); set ANTHROPIC_VALUATION_MODEL to
  // claude-opus-4-8 for higher-quality estimates.
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_VALUATION_MODEL: z.string().min(1).default("claude-haiku-4-5"),

  // Escrow provider (ESCROW-COURIER-SPEC.md §9) — replaces PayFast in Phase 6.
  // GENERIC placeholders until the provider (Truzo, ZAR-native) API docs arrive;
  // every concrete value is bound in Phase 2. ESCROW_ENABLED gates the whole
  // feature: while "false" (the default) the escrow checkout action + webhook
  // route are inert and the fail-closed live guard below stays dormant, so the
  // current PayFast flow is completely unaffected.
  ESCROW_ENABLED: z.string().default("false").transform((v) => v === "true"),
  ESCROW_PROVIDER: z.string().min(1).default("truzo"),
  ESCROW_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  ESCROW_API_BASE: z.string().default(""), // TODO(escrow-provider): from provider docs
  ESCROW_API_KEY: z.string().default(""), // TODO(escrow-provider): API key / OAuth / signing secret
  ESCROW_WEBHOOK_SECRET: z.string().default(""), // TODO(escrow-provider): webhook verification secret
}).superRefine((values, ctx) => {
  // Live PayFast REQUIRES a passphrase — it salts the ITN MD5 signature, so an
  // empty passphrase in live mode leaves the signature forgeable. Defence in
  // depth: the server-to-server validation postback remains the authoritative
  // ITN check, but a missing passphrase should never reach production.
  if (values.PAYFAST_MODE === "live" && values.PAYFAST_PASSPHRASE.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["PAYFAST_PASSPHRASE"],
      message:
        "PAYFAST_PASSPHRASE is required when PAYFAST_MODE=live (it salts the ITN signature).",
    });
  }
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Fail CLOSED on a production PayFast misconfiguration.
 *
 * The schema defaults to PayFast's shared PUBLIC sandbox (merchant 10000100) so
 * checkout works end-to-end in dev before onboarding. The danger: a real deploy
 * that forgets `PAYFAST_MODE=live` silently keeps pointing at the sandbox, which
 * still emits a valid `COMPLETE` ITN — so an attacker completes a $0 sandbox
 * payment and receives real goods while D&D collects nothing. This refuses to
 * boot a production RUNTIME while still on the sandbox.
 *
 * Deliberately NOT enforced during builds (Next `phase-production-build`), in CI
 * (`CI=true`), or on Vercel preview/dev deployments — those legitimately run
 * with placeholder/sandbox config. A staging box or a local `next start` that
 * intentionally uses the sandbox can opt out with `PAYFAST_ALLOW_SANDBOX=true`.
 */
function assertProductionPayfast(env: ServerEnv): void {
  const vercelEnv = process.env.VERCEL_ENV; // production | preview | development | undefined
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  const isCI = process.env.CI === "true";
  const isProdRuntime =
    vercelEnv === "production" ||
    (env.NODE_ENV === "production" &&
      vercelEnv === undefined &&
      !isBuild &&
      !isCI);
  if (!isProdRuntime) return;
  if (process.env.PAYFAST_ALLOW_SANDBOX === "true") return;

  const problems: string[] = [];
  if (env.PAYFAST_MODE !== "live") {
    problems.push("PAYFAST_MODE must be 'live'");
  }
  if (
    env.PAYFAST_MERCHANT_ID === "10000100" ||
    env.PAYFAST_MERCHANT_KEY === "46f0cd694581a"
  ) {
    problems.push(
      "PAYFAST_MERCHANT_ID/PAYFAST_MERCHANT_KEY are still the shared public sandbox credentials",
    );
  }
  if (env.PAYFAST_PASSPHRASE.length === 0) {
    problems.push("PAYFAST_PASSPHRASE must be set");
  }
  if (problems.length > 0) {
    throw new Error(
      "Refusing to start in production against the PayFast SANDBOX " +
        "(orders would be fulfilled for R0):\n" +
        problems.map((p) => `  • ${p}`).join("\n") +
        "\n\nSet the live PayFast credentials, or set PAYFAST_ALLOW_SANDBOX=true " +
        "to override (non-production only).",
    );
  }
}

/**
 * Fail CLOSED on a production escrow misconfiguration — modelled on
 * {@link assertProductionPayfast}, but DORMANT until ESCROW_ENABLED=true (set in
 * Phase 2), so it never blocks the current PayFast-based deploy. Once escrow is
 * enabled, a production runtime must have live mode + an https base URL +
 * credentials + a webhook secret, or it refuses to boot (an unbound/sandbox
 * escrow in production could secure R0 and release real goods). A staging box or
 * local `next start` that intentionally runs sandbox escrow can opt out with
 * ESCROW_ALLOW_SANDBOX=true.
 */
function assertProductionEscrow(env: ServerEnv): void {
  if (!env.ESCROW_ENABLED) return; // dormant until Phase 2 flips escrow on

  const vercelEnv = process.env.VERCEL_ENV;
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  const isCI = process.env.CI === "true";
  const isProdRuntime =
    vercelEnv === "production" ||
    (env.NODE_ENV === "production" &&
      vercelEnv === undefined &&
      !isBuild &&
      !isCI);
  if (!isProdRuntime) return;
  if (process.env.ESCROW_ALLOW_SANDBOX === "true") return;

  const problems: string[] = [];
  if (env.ESCROW_MODE !== "live") {
    problems.push("ESCROW_MODE must be 'live'");
  }
  if (!/^https:\/\//.test(env.ESCROW_API_BASE)) {
    problems.push("ESCROW_API_BASE must be set to an https URL");
  }
  if (env.ESCROW_API_KEY.length === 0) {
    problems.push("ESCROW_API_KEY must be set");
  }
  if (env.ESCROW_WEBHOOK_SECRET.length === 0) {
    problems.push("ESCROW_WEBHOOK_SECRET must be set");
  }
  if (problems.length > 0) {
    throw new Error(
      "Refusing to start in production with escrow ENABLED but misconfigured:\n" +
        problems.map((p) => `  • ${p}`).join("\n") +
        "\n\nSet the live escrow credentials, or set ESCROW_ALLOW_SANDBOX=true " +
        "to override (non-production only).",
    );
  }
}

function loadEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid or missing environment variables:\n${issues}\n\n` +
        `Copy .env.example to .env.local and fill in the required values.`,
    );
  }
  assertProductionPayfast(parsed.data);
  assertProductionEscrow(parsed.data);
  return parsed.data;
}

export const env: ServerEnv = loadEnv();
