"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { ROLE_HOME } from "@/lib/auth/roles";
import { rateLimitByIp } from "@/lib/rate-limit";
import type { UserRole } from "@/lib/supabase/database.types";

export interface AuthState {
  error?: string;
  message?: string;
}

/** Only allow internal redirect targets (defends against open redirects). */
function safeRedirect(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
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
  // Brute-force protection: 10 sign-in attempts per 15 min per IP.
  if (!(await rateLimitByIp("signin", 10, 900))) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Incorrect email or password. Please try again." };
  }

  const redirectTo = safeRedirect(formData.get("redirect"));
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
  // 10 sign-ups per hour per IP.
  if (!(await rateLimitByIp("signup", 10, 3600))) {
    return { error: "Too many sign-up attempts. Please try again later." };
  }
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
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
    return { error: error.message };
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
  // 5 magic-link requests per 15 min per IP.
  if (!(await rateLimitByIp("magiclink", 5, 900))) {
    return { error: "Too many requests. Please wait a few minutes." };
  }
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const next = safeRedirect(formData.get("redirect")) ?? "/";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    return { error: error.message };
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
