import { formatZar } from "@/lib/money";

/**
 * Engagement/retention email templates (price-drop + brand-follow alerts).
 *
 * A SEPARATE plain (non-'use server') module from lib/email/templates.ts so the
 * notification lane never has to touch the shared templates file. The layout /
 * paragraph / button helpers there are private, so we re-implement small
 * self-contained equivalents here using the SAME inline-style house aesthetic
 * (serif headings, off-white background, near-black accents). Inline styles only,
 * for email-client compatibility.
 */

function layout(opts: { heading: string; bodyHtml: string }): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F8F8F8;font-family:'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F8F8;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E5E5E5;border-radius:3px;">
            <tr>
              <td style="padding:28px 36px;border-bottom:1px solid #EFEFEF;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.16em;text-transform:uppercase;color:#0D0D0D;">D&amp;D Luxury</span>
              </td>
            </tr>
            <tr>
              <td style="padding:36px;">
                <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:26px;line-height:1.2;margin:0 0 20px;color:#1A1A1A;">${opts.heading}</h1>
                ${opts.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px;border-top:1px solid #EFEFEF;color:#888888;font-size:12px;line-height:1.6;">
                D&amp;D Luxury (Pty) Ltd · South Africa's authenticated luxury marketplace<br/>
                Every piece independently authenticated before it goes live.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="font-size:15px;line-height:1.7;color:#555555;margin:0 0 16px;">${text}</p>`;
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0D0D0D;color:#FFFFFF;text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;border-radius:3px;margin:8px 0 4px;">${label}</a>`;
}

function detailRow(label: string, value: string): string {
  // value is data (brand/title/amounts) — always escape (escape-by-default).
  return `<tr>
    <td style="padding:8px 0;color:#888888;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;width:160px;">${label}</td>
    <td style="padding:8px 0;color:#1A1A1A;font-size:14px;">${escapeHtml(value)}</td>
  </tr>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/** A buyer who saved this piece is told its price has dropped. */
export function priceDropBuyerEmail(args: {
  title: string;
  brand: string;
  oldCents: number;
  newCents: number;
  listingUrl: string;
}): string {
  return layout({
    heading: "A piece you saved just dropped in price",
    bodyHtml: `
      ${paragraph(`Good news — a piece on your saved list is now more affordable.`)}
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #EFEFEF;border-bottom:1px solid #EFEFEF;margin:8px 0 24px;">
        ${detailRow("Brand", args.brand)}
        ${detailRow("Item", args.title)}
        ${detailRow("Was", formatZar(args.oldCents))}
        ${detailRow("Now", formatZar(args.newCents))}
      </table>
      ${paragraph("These pieces move quickly — secure it before someone else does.")}
      ${button("View the piece", args.listingUrl)}
    `,
  });
}

/** A buyer following this brand is told a new piece by it just went live. */
export function brandFollowBuyerEmail(args: {
  title: string;
  brand: string;
  priceCents: number;
  listingUrl: string;
}): string {
  return layout({
    heading: `New from ${escapeHtml(args.brand)}`,
    bodyHtml: `
      ${paragraph(`A new authenticated piece from a designer you follow just went live.`)}
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #EFEFEF;border-bottom:1px solid #EFEFEF;margin:8px 0 24px;">
        ${detailRow("Brand", args.brand)}
        ${detailRow("Item", args.title)}
        ${detailRow("Price", formatZar(args.priceCents))}
      </table>
      ${paragraph("Be the first to view it before it reaches the wider marketplace.")}
      ${button("View the piece", args.listingUrl)}
    `,
  });
}
