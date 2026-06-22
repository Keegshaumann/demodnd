"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ROLE_HOME } from "@/lib/auth/roles";
import { rateLimitByIp } from "@/lib/rate-limit";
import { safeInternalRedirect } from "@/lib/auth/safe-redirect";
import type { UserRole } from "@/lib/supabase/database.types";

export interface AuthState {
  error?: string;
  message?: string;
  // Non-sensitive submitted values, echoed back on failure so React 19's
  // post-action form reset doesn't wipe what the user typed.
  values?: {
    email?: string;
    fullName?: string;
    terms?: boolean;
  };
}

function fieldValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

const signUpSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  fullName: z.string().trim().min(1, "Enter your name.").max(120),
  role: z.enum(["buyer", "seller"]),
});

const emailOnlySchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

// ---------------------------------------------------------------------------
// Sign in (email + password)
// ---------------------------------------------------------------------------
export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const values = { email: fieldValue(formData, "email") };
  // Brute-force protection: 10 sign-in attempts per 15 min per IP.
  // Fail CLOSED on a limiter error — never silently drop auth abuse protection.
  if (!(await rateLimitByIp("signin", 10, 900, true))) {
    return { error: "Too many attempts. Please wait a few minutes and try again.", values };
  }
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Incorrect email or password. Please try again.", values };
  }

  const redirectTo = safeInternalRedirect(formData.get("redirect"));
  let destination = redirectTo;
  if (!destination) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    const role = (profile?.role as UserRole | undefined) ?? "buyer";
    destination = ROLE_HOME[role];
  }
  redirect(destination);
}

// ---------------------------------------------------------------------------
// Create account (buyer or seller — admin is never self-assignable)
// ---------------------------------------------------------------------------
export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const values = {
    email: fieldValue(formData, "email"),
    fullName: fieldValue(formData, "fullName"),
    terms: formData.get("terms") === "on",
  };
  // 10 sign-ups per hour per IP. Fail CLOSED on a limiter error.
  if (!(await rateLimitByIp("signup", 10, 3600, true))) {
    return { error: "Too many sign-up attempts. Please try again later.", values };
  }
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { role: parsed.data.role, full_name: parsed.data.fullName },
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${ROLE_HOME[parsed.data.role]}`,
    },
  });
  if (error) {
    // Don't surface the raw Supabase message — it can leak whether an email is
    // already registered or other internals. Mirror signInAction's generic copy.
    return {
      error: "We couldn't create your account. Please check your details and try again.",
      values,
    };
  }

  // If email confirmation is required, there is no session yet.
  if (!data.session) {
    return {
      message:
        "Account created. Check your email to confirm your address, then sign in.",
    };
  }

  redirect(ROLE_HOME[parsed.data.role]);
}

// ---------------------------------------------------------------------------
// Magic link
// ---------------------------------------------------------------------------
export async function magicLinkAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const values = { email: fieldValue(formData, "email") };
  // 5 magic-link requests per 15 min per IP. Fail CLOSED on a limiter error.
  if (!(await rateLimitByIp("magiclink", 5, 900, true))) {
    return { error: "Too many requests. Please wait a few minutes.", values };
  }
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", values };
  }
  const next = safeInternalRedirect(formData.get("redirect")) ?? "/";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    return { error: error.message, values };
  }
  return { message: "Check your email for a secure sign-in link." };
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
