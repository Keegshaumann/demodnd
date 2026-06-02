import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getSellerProfile } from "@/lib/seller/profile";
import { ProfileForm } from "@/components/seller/ProfileForm";

export const metadata: Metadata = { title: "Profile" };

export default async function SellerProfilePage() {
  const user = await requireRole("seller");
  const supabase = await createClient();
  const profile = await getSellerProfile(supabase, user.id);

  return (
    <div className="max-w-[760px]">
      <header className="mb-8">
        <p className="eyebrow mb-3">Account</p>
        <h1 className="font-serif text-[34px]">Profile &amp; banking</h1>
        {profile?.username && (
          <p className="mt-2 text-sm text-ink-muted">
            Your public page:{" "}
            <Link
              href={`/seller/${profile.username}`}
              className="text-gold hover:underline"
            >
              /seller/{profile.username}
            </Link>
          </p>
        )}
      </header>

      <ProfileForm
        initial={{
          displayName: profile?.display_name ?? "",
          bio: profile?.bio ?? "",
          bankName: profile?.bank_name ?? "",
          bankAccountNumber: profile?.bank_account_number ?? "",
          bankBranchCode: profile?.bank_branch_code ?? "",
          bankAccountHolder: profile?.bank_account_holder ?? "",
        }}
      />
    </div>
  );
}
