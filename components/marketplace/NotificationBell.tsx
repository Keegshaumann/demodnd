"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/notifications/actions";
import type { NotificationItem } from "@/lib/notifications/queries";

/**
 * Header notification bell (feature 4) — an icon button with an unread-count
 * badge and a dropdown of the most-recent notifications. Mounted by SiteHeader
 * for signed-in users only; the layouts hydrate `initialUnread`/`initialItems`
 * server-side so there is no client round-trip on first paint.
 *
 * The bell icon is an inline SVG (not from components/ui/icons) so we don't have
 * to touch the shared icons.tsx for a single new glyph.
 *
 * Marking read calls the server action then router.refresh() so the badge and
 * dropdown re-sync from the layouts' server reads.
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
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });
}

function BellGlyph({ className }: { className?: string }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function NotificationBell({
  initialUnread,
  initialItems,
}: {
  initialUnread: number;
  initialItems: NotificationItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside-click / Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = Math.max(0, initialUnread);
  const badge = unread > 9 ? "9+" : String(unread);

  function markAll() {
    if (pending) return;
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  function openItem(item: NotificationItem) {
    setOpen(false);
    if (!item.read) {
      startTransition(async () => {
        await markNotificationReadAction(item.id);
        router.refresh();
      });
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-[3px] border border-border text-ink transition-colors hover:border-gold hover:text-gold"
      >
        <BellGlyph />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 flex min-w-[17px] items-center justify-center rounded-full bg-gold px-1 text-[9px] font-semibold leading-[16px] text-white tabular-nums"
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+10px)] z-[120] w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-[3px] border border-border bg-bg shadow-[0_18px_50px_-20px_rgba(13,13,13,0.35)]"
        >
          <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink">
              Notifications
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                disabled={pending}
                className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-dim transition-colors hover:text-gold disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {initialItems.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] text-ink-muted">
                You&apos;re all caught up.
              </p>
            </div>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-border-soft overflow-y-auto">
              {initialItems.map((n) => {
                const inner = (
                  <span className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                        n.read ? "bg-transparent" : "bg-gold"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {n.title}
                      </span>
                      {n.body && (
                        <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-ink-muted">
                          {n.body}
                        </span>
                      )}
                      <span className="mt-1 block text-[10.5px] uppercase tracking-[0.14em] text-ink-dim">
                        {relativeTime(n.created_at)}
                      </span>
                    </span>
                  </span>
                );
                const cls = `block px-4 py-3 transition-colors hover:bg-surface ${
                  n.read ? "" : "bg-surface/60"
                }`;
                return (
                  <li key={n.id} role="menuitem">
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => openItem(n)}
                        className={cls}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openItem(n)}
                        className={`w-full text-left ${cls}`}
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-border-soft px-4 py-2.5 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-dim transition-colors hover:text-gold"
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
