"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/notifications/actions";
import type { NotificationItem } from "@/lib/notifications/queries";

/**
 * The full notification-centre list (feature 4) rendered on /notifications.
 * Each row links to its target and marks itself read on click; a "Mark all
 * read" control clears every unread one. Monochrome editorial, 390px-safe.
 *
 * After a mutation we router.refresh() so the server-rendered list (and the
 * header bell, hydrated by the layout) re-sync from the DB.
 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const hasUnread = items.some((n) => !n.read);

  function markAll() {
    if (pending) return;
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  function markOne(id: string, alreadyRead: boolean) {
    if (alreadyRead) return;
    startTransition(async () => {
      await markNotificationReadAction(id);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-[3px] border border-dashed border-border bg-surface px-6 py-20 text-center">
        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border text-ink-dim">
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
        </span>
        <h2 className="font-serif text-2xl">No notifications yet.</h2>
        <p className="mt-2 max-w-[400px] text-[14px] text-ink-muted">
          Price drops, new pieces from designers you follow, and updates on your
          activity will appear here.
        </p>
        <div className="mt-6">
          <Link href="/browse" className="btn btn-primary btn-sm">
            Browse the collection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={markAll}
          disabled={pending || !hasUnread}
          className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-dim transition-colors hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Mark all read
        </button>
      </div>

      <ul className="overflow-hidden rounded-[3px] border border-border bg-surface">
        {items.map((n, i) => {
          const inner = (
            <span className="flex items-start gap-3.5">
              <span
                aria-hidden="true"
                className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${
                  n.read ? "bg-transparent ring-1 ring-border" : "bg-gold"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-ink">
                  {n.title}
                </span>
                {n.body && (
                  <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">
                    {n.body}
                  </span>
                )}
                <span className="mt-1.5 block text-[10.5px] uppercase tracking-[0.14em] text-ink-dim">
                  {relativeTime(n.created_at)}
                </span>
              </span>
            </span>
          );
          const cls = `block px-5 py-4 transition-colors hover:bg-bg ${
            i > 0 ? "border-t border-border-soft" : ""
          } ${n.read ? "" : "bg-surface"}`;
          return (
            <li key={n.id}>
              {n.link ? (
                <Link
                  href={n.link}
                  onClick={() => markOne(n.id, n.read)}
                  className={cls}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => markOne(n.id, n.read)}
                  className={`w-full text-left ${cls}`}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
