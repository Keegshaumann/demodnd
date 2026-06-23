/**
 * Quiet social-proof line for the PDP meta row: "· N saved · N views".
 *
 * Gated so it never looks dead: a metric is only surfaced once it clears a
 * minimum (>= 3) — a piece with 0/1 saves or views shows nothing rather than an
 * anaemic "1 view". When neither metric qualifies the component renders null, so
 * the surrounding meta row collapses cleanly.
 *
 * Plain server component (no client JS, no state) — both counts arrive from the
 * RSC page (view_count off the listing row, saveCount via getSaveCounts).
 */
const MIN = 3;

export function SocialProof({
  saveCount,
  viewCount,
}: {
  saveCount: number;
  viewCount: number;
}) {
  const showSaves = saveCount >= MIN;
  const showViews = viewCount >= MIN;
  if (!showSaves && !showViews) return null;

  return (
    <>
      {showSaves && (
        <>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span>
            {saveCount.toLocaleString("en-ZA")} saved
          </span>
        </>
      )}
      {showViews && (
        <>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span>
            {viewCount.toLocaleString("en-ZA")} views
          </span>
        </>
      )}
    </>
  );
}
