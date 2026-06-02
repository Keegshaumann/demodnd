import { signOutAction } from "@/lib/auth/actions";

/**
 * Sign-out control. Renders a form posting to the signOutAction server action,
 * so it works without client JS. `className` styles the button.
 */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <button type="submit" className={className ?? "btn btn-outline btn-sm"}>
        Sign out
      </button>
    </form>
  );
}
