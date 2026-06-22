/**
 * Dispute window shared between the buyer order page (UI) and the raise-dispute
 * server action. Kept out of the "use server" module because Next server-action
 * modules may only export async functions.
 */
export const DISPUTE_WINDOW_HOURS = 48;

/** When the buyer's dispute window closes for an order delivered at the given time. */
export function disputeWindowEndsAt(deliveredAtIso: string): Date {
  return new Date(
    new Date(deliveredAtIso).getTime() + DISPUTE_WINDOW_HOURS * 3_600_000,
  );
}
