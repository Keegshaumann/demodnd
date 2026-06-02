import type { Metadata } from "next";
import { searchUsers, type AdminUserRow } from "@/lib/admin/users";
import { UserActions } from "@/components/admin/UserActions";
import { SearchIcon } from "@/components/ui/icons";
import type { UserRole, UserStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Users" };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const ROLE_CLASS: Record<UserRole, string> = {
  buyer: "border-border text-ink-muted",
  seller: "border-blue-300 text-blue-700",
  admin: "border-gold text-gold",
};
const STATUS_CLASS: Record<UserStatus, string> = {
  active: "border-emerald-300 text-emerald-700",
  suspended: "border-amber-300 text-amber-700",
  banned: "border-rose-300 text-rose-700",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const users = await searchUsers(q);

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow mb-3">Accounts</p>
        <h1 className="font-serif text-[34px]">User management</h1>
        <p className="mt-2 max-w-[640px] text-sm text-ink-muted">
          Search by email, name, seller username, or user ID. Verify a seller&apos;s
          identity to let them list, or suspend, ban, or delete an account.
        </p>
      </header>

      <form method="get" className="surface-card mb-8 flex items-end gap-3 p-5">
        <div className="flex-1">
          <label className="field-label" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="email, name, @username, or user ID"
            className="field-input"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-sm">
          <SearchIcon width={14} height={14} /> Search
        </button>
      </form>

      {users.length === 0 ? (
        <div className="surface-card p-16 text-center text-ink-muted">
          {q ? "No accounts match that search." : "No accounts yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              roleClass={ROLE_CLASS[u.role]}
              statusClass={STATUS_CLASS[u.status]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  roleClass,
  statusClass,
}: {
  user: AdminUserRow;
  roleClass: string;
  statusClass: string;
}) {
  return (
    <article className="surface-card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink">{user.fullName ?? "—"}</span>
          <Pill className={roleClass}>{user.role}</Pill>
          <Pill className={statusClass}>{user.status}</Pill>
          {user.role !== "buyer" &&
            (user.verified ? (
              <Pill className="border-emerald-300 text-emerald-700">
                ID verified
              </Pill>
            ) : (
              <Pill className="border-amber-300 text-amber-700">
                Pending verification
              </Pill>
            ))}
        </div>
        <div className="mt-1 text-[13px] text-ink-muted">{user.email}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-4 text-[11.5px] text-ink-dim">
          {user.username && <span>@{user.username}</span>}
          <span className="font-mono">{user.id}</span>
          <span>
            joined{" "}
            {new Date(user.createdAt).toLocaleDateString("en-ZA", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
      <UserActions user={user} />
    </article>
  );
}

function Pill({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${className}`}
    >
      {children}
    </span>
  );
}
