"use client";

import { useActionState, useState } from "react";
import {
  signInAction,
  signUpAction,
  magicLinkAction,
  type AuthState,
} from "@/lib/auth/actions";
import { ArrowRightIcon, EyeIcon } from "@/components/ui/icons";

type Mode = "signin" | "register" | "magic";
const EMPTY: AuthState = {};

export function AuthPanels({
  redirectTo,
  initialError,
}: {
  redirectTo?: string;
  initialError?: string;
}) {
  const [mode, setMode] = useState<Mode>("signin");

  return (
    <div className="surface-card mx-auto w-full max-w-[440px] p-9 sm:p-10">
      <div className="mb-8 text-center font-serif text-[22px] uppercase tracking-[0.16em] text-gold">
        D&amp;D Luxury
      </div>

      {/* Tabs */}
      <div className="mb-8 flex border-b border-border">
        <TabButton active={mode !== "register"} onClick={() => setMode("signin")}>
          Sign In
        </TabButton>
        <TabButton
          active={mode === "register"}
          onClick={() => setMode("register")}
        >
          Create Account
        </TabButton>
      </div>

      {initialError && mode === "signin" && (
        <p className="mb-4 text-[13px] text-[#e85d5d]">{initialError}</p>
      )}

      {mode === "register" ? (
        <RegisterPanel redirectTo={redirectTo} />
      ) : mode === "magic" ? (
        <MagicPanel redirectTo={redirectTo} onBack={() => setMode("signin")} />
      ) : (
        <SignInPanel
          redirectTo={redirectTo}
          onMagic={() => setMode("magic")}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px flex-1 border-b-2 py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] transition-colors ${
        active
          ? "border-ink text-ink"
          : "border-transparent text-ink-dim hover:text-ink-muted"
      }`}
    >
      {children}
    </button>
  );
}

function FieldError({ state }: { state: AuthState }) {
  if (!state.error) return null;
  return <p className="mb-3 text-[13px] text-[#e85d5d]">{state.error}</p>;
}

function FieldMessage({ state }: { state: AuthState }) {
  if (!state.message) return null;
  return (
    <p className="mb-3 rounded-[3px] border border-border-soft bg-bg px-4 py-3 text-[13px] text-ink-muted">
      {state.message}
    </p>
  );
}

function SignInPanel({
  redirectTo,
  onMagic,
}: {
  redirectTo?: string;
  onMagic: () => void;
}) {
  const [state, formAction, pending] = useActionState(signInAction, EMPTY);
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="animate-fadeIn">
      <h2 className="mb-1.5 font-serif text-[26px]">Welcome back.</h2>
      <p className="mb-7 text-sm text-ink-muted">
        Sign in to manage your account.
      </p>
      <form action={formAction}>
        {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
        <div className="mb-[18px]">
          <label className="field-label" htmlFor="si-email">
            Email
          </label>
          <input
            id="si-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.co.za"
            className="field-input"
          />
        </div>
        <div className="mb-[18px]">
          <label className="field-label" htmlFor="si-password">
            Password
          </label>
          <div className="relative">
            <input
              id="si-password"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="field-input pr-11"
            />
            <button
              type="button"
              aria-label="Toggle password visibility"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            >
              <EyeIcon width={16} height={16} />
            </button>
          </div>
        </div>
        <FieldError state={state} />
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary btn-block mt-2"
        >
          {pending ? "Signing in…" : "Sign in"}
          {!pending && <ArrowRightIcon width={16} height={16} />}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-ink-muted before:h-px before:flex-1 before:bg-border-soft after:h-px after:flex-1 after:bg-border-soft">
        <span>or</span>
      </div>
      <button
        type="button"
        onClick={onMagic}
        className="btn btn-outline btn-block"
      >
        Email me a magic link
      </button>
    </div>
  );
}

function MagicPanel({
  redirectTo,
  onBack,
}: {
  redirectTo?: string;
  onBack: () => void;
}) {
  const [state, formAction, pending] = useActionState(magicLinkAction, EMPTY);

  return (
    <div className="animate-fadeIn">
      <h2 className="mb-1.5 font-serif text-[26px]">Magic link.</h2>
      <p className="mb-7 text-sm text-ink-muted">
        We&apos;ll email you a secure, single-use sign-in link.
      </p>
      <form action={formAction}>
        {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
        <div className="mb-[18px]">
          <label className="field-label" htmlFor="ml-email">
            Email
          </label>
          <input
            id="ml-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.co.za"
            className="field-input"
          />
        </div>
        <FieldError state={state} />
        <FieldMessage state={state} />
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary btn-block mt-2"
        >
          {pending ? "Sending…" : "Send magic link"}
        </button>
      </form>
      <button
        type="button"
        onClick={onBack}
        className="mt-3.5 block w-full text-center text-[13px] text-ink-muted hover:text-gold"
      >
        Back to password sign-in
      </button>
    </div>
  );
}

function RegisterPanel({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, EMPTY);
  const [role, setRole] = useState<"buyer" | "seller">("buyer");

  return (
    <div className="animate-fadeIn">
      <h2 className="mb-1.5 font-serif text-[26px]">Create your account.</h2>
      <p className="mb-7 text-sm text-ink-muted">
        Join to buy authenticated pieces, or to sell your own.
      </p>
      <form action={formAction}>
        {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
        <input type="hidden" name="role" value={role} />

        <div className="mb-[18px]">
          <span className="field-label">I want to</span>
          <div className="grid grid-cols-2 gap-2">
            <RolePill active={role === "buyer"} onClick={() => setRole("buyer")}>
              Buy
            </RolePill>
            <RolePill
              active={role === "seller"}
              onClick={() => setRole("seller")}
            >
              Sell
            </RolePill>
          </div>
        </div>

        <div className="mb-[18px]">
          <label className="field-label" htmlFor="su-name">
            Full name
          </label>
          <input
            id="su-name"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            placeholder="Thandi Khumalo"
            className="field-input"
          />
        </div>
        <div className="mb-[18px]">
          <label className="field-label" htmlFor="su-email">
            Email
          </label>
          <input
            id="su-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.co.za"
            className="field-input"
          />
        </div>
        <div className="mb-[18px]">
          <label className="field-label" htmlFor="su-password">
            Password
          </label>
          <input
            id="su-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="field-input"
          />
        </div>

        <label className="mb-5 flex items-start gap-2.5 text-[13px] text-ink-muted">
          <input type="checkbox" required className="mt-1" />
          <span>
            I agree to the{" "}
            <span className="text-gold underline">Terms &amp; Conditions</span>{" "}
            and <span className="text-gold underline">Privacy Policy</span>.
          </span>
        </label>

        <FieldError state={state} />
        <FieldMessage state={state} />
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary btn-block"
        >
          {pending ? "Creating account…" : "Create account"}
          {!pending && <ArrowRightIcon width={16} height={16} />}
        </button>
      </form>
    </div>
  );
}

function RolePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[3px] border py-3 text-[11px] font-medium uppercase tracking-[0.18em] transition-all ${
        active
          ? "border-gold bg-gold text-white"
          : "border-border bg-bg text-ink-muted hover:border-gold/40"
      }`}
    >
      {children}
    </button>
  );
}
