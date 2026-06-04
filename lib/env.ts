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
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

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
  return parsed.data;
}

export const env: ServerEnv = loadEnv();
