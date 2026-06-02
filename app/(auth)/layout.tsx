import { AnnounceBar } from "@/components/marketplace/AnnounceBar";
import { SiteHeader } from "@/components/marketplace/SiteHeader";
import { getNavUser } from "@/lib/auth/nav-user";

/** Chrome for auth pages (sign in / register). */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getNavUser();
  return (
    <>
      <AnnounceBar />
      <SiteHeader user={user} />
      <main>{children}</main>
    </>
  );
}
