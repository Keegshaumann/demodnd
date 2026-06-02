import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanels } from "@/components/auth-portal/AuthPanels";
import { getCurrentUser } from "@/lib/auth/guards";
import { ROLE_HOME } from "@/lib/auth/roles";
import { safeInternalRedirect } from "@/lib/auth/safe-redirect";

export const metadata: Metadata = { title: "Sign In" };

const ERROR_MESSAGES: Record<string, string> = {
  account_suspended:
    "Your account is suspended. Please contact D&D Luxury support.",
  auth_callback_failed: "That sign-in link is invalid or has expired.",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirectParam = firstParam(params.redirect);
  const errorCode = firstParam(params.error);

  // Only honour internal redirect targets (defends against open redirects) —
  // shared chokepoint so the page/action/callback checks can't drift (AUTH-1/5).
  const safeRedirect = safeInternalRedirect(redirectParam) ?? undefined;

  // Already signed in → go to the safe redirect, else the right dashboard.
  const user = await getCurrentUser();
  if (user) {
    redirect(safeRedirect ?? ROLE_HOME[user.role]);
  }

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center px-5 py-16">
      <AuthPanels
        redirectTo={safeRedirect}
        initialError={errorCode ? ERROR_MESSAGES[errorCode] : undefined}
      />
    </div>
  );
}
