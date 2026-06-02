import Link from "next/link";
import { SellerNav } from "@/components/seller/SellerNav";
import { SignOutButton } from "@/components/auth-portal/SignOutButton";
import { ArrowRightIcon } from "@/components/ui/icons";

/** Seller dashboard chrome: top bar with nav, "list a piece", and sign-out. */
export function SellerShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-50 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-6 py-3.5 md:px-10">
          <div className="flex items-center gap-6">
            <Link
              href="/seller"
              className="font-serif text-[18px] uppercase tracking-[0.16em] text-gold"
            >
              D&amp;D Seller
            </Link>
            <SellerNav />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sell" className="btn btn-primary btn-sm hidden sm:inline-flex">
              List a piece <ArrowRightIcon width={14} height={14} />
            </Link>
            <span className="hidden text-[12px] text-ink-dim lg:inline">
              {email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1320px] px-6 py-10 md:px-10">
        {children}
      </main>
    </div>
  );
}
