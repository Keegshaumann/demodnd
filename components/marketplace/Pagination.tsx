import Link from "next/link";

/**
 * Server-rendered pagination for the browse grid. `hrefFor` builds the URL for a
 * page while preserving the active filters (constructed by the caller).
 */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (p: number) => string;
}) {
  if (totalPages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav
      className="mt-14 flex items-center justify-center gap-4 text-[13px]"
      aria-label="Pagination"
    >
      {prevDisabled ? (
        <span className="btn btn-outline btn-sm pointer-events-none opacity-40">
          Previous
        </span>
      ) : (
        <Link href={hrefFor(page - 1)} className="btn btn-outline btn-sm" rel="prev">
          Previous
        </Link>
      )}

      <span className="text-ink-muted">
        Page {page} of {totalPages}
      </span>

      {nextDisabled ? (
        <span className="btn btn-outline btn-sm pointer-events-none opacity-40">
          Next
        </span>
      ) : (
        <Link href={hrefFor(page + 1)} className="btn btn-outline btn-sm" rel="next">
          Next
        </Link>
      )}
    </nav>
  );
}
