"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Newsletter / email capture — a single public, anonymous Server Action.
 *
 * This module is `"use server"`, so EVERY export is a network-callable Server
 * Action — keep it to actions only.
 *
 * No requireUser: newsletter capture is intentionally public (a guest in the
 * footer must be able to subscribe). There is no buyer/owner concept and we
 * never want anon/authenticated to read the subscriber list, so the table has
 * RLS on with no policy (deny-all) and we insert via the SERVICE-ROLE client
 * which bypasses RLS — exactly as the schema migration intends.
 */
export type SubscribeResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; error: string };

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export async function subscribeNewsletterAction(
  email: string,
): Promise<SubscribeResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: "Enter a valid email." };
  const value = parsed.data;

  const db = createAdminClient();
  const { error } = await db
    .from("newsletter_subscribers")
    .insert({ email: value });

  if (error) {
    // Unique-violation on email → already subscribed. We detect the duplicate by
    // the Postgres error code rather than racing a pre-SELECT (the UNIQUE(email)
    // constraint is the single source of truth; the action lowercases+trims so
    // it catches case/whitespace variants too).
    if (error.code === "23505") return { ok: true, duplicate: true };
    console.error("newsletter subscribe failed", error);
    return { ok: false, error: "Could not subscribe." };
  }

  return { ok: true, duplicate: false };
}
