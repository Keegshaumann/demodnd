/**
 * Per-navigation entrance. A `template` re-mounts on every route change, so this
 * gives a subtle, consistent fade-up to page content. Gated by prefers-reduced-
 * motion via the global rule in globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
