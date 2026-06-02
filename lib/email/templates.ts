import { formatZar } from "@/lib/money";

/**
 * Branded HTML email layout — mirrors the D&D Luxury aesthetic (serif headings,
 * off-white background, near-black accents). Inline styles only, for client
 * compatibility.
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
  return `<tr>
    <td style="padding:8px 0;color:#888888;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;width:160px;">${label}</td>
    <td style="padding:8px 0;color:#1A1A1A;font-size:14px;">${value}</td>
  </tr>`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function submissionReceivedAdminEmail(args: {
  brand: string;
  title: string;
  method: string;
  askingPriceCents: number;
  sellerEmail: string;
  reviewUrl: string;
}): string {
  return layout({
    heading: "New authentication submission",
    bodyHtml: `
      ${paragraph("A seller has submitted a piece for authentication. Review it in the admin queue.")}
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #EFEFEF;border-bottom:1px solid #EFEFEF;margin:8px 0 24px;">
        ${detailRow("Brand", args.brand)}
        ${detailRow("Item", args.title)}
        ${detailRow("Method", args.method)}
        ${detailRow("Asking price", formatZar(args.askingPriceCents))}
        ${detailRow("Seller", args.sellerEmail)}
      </table>
      ${button("Open the auth queue", args.reviewUrl)}
    `,
  });
}

export function submissionApprovedSellerEmail(args: {
  title: string;
  listingUrl: string;
}): string {
  return layout({
    heading: "Your piece is now live",
    bodyHtml: `
      ${paragraph(`Good news — <strong>${args.title}</strong> has been authenticated by our team and is now live on the marketplace.`)}
      ${paragraph("Buyers can now view and purchase it. We'll notify you the moment it sells.")}
      ${button("View your listing", args.listingUrl)}
    `,
  });
}

export function submissionMoreInfoSellerEmail(args: {
  title: string;
  notes: string;
  portalUrl: string;
}): string {
  return layout({
    heading: "We need a little more information",
    bodyHtml: `
      ${paragraph(`Our authentication team has reviewed <strong>${args.title}</strong> and needs some additional detail before we can approve it.`)}
      <div style="background:#F8F8F8;border:1px solid #E5E5E5;border-radius:3px;padding:16px 18px;margin:0 0 20px;color:#1A1A1A;font-size:14px;line-height:1.7;">${args.notes}</div>
      ${button("Update your submission", args.portalUrl)}
    `,
  });
}

export function submissionDeclinedSellerEmail(args: {
  title: string;
  notes: string;
}): string {
  return layout({
    heading: "Submission outcome",
    bodyHtml: `
      ${paragraph(`Thank you for submitting <strong>${args.title}</strong>. After careful review, our authentication team is unable to list this piece at this time.`)}
      ${args.notes ? `<div style="background:#F8F8F8;border:1px solid #E5E5E5;border-radius:3px;padding:16px 18px;margin:0 0 20px;color:#1A1A1A;font-size:14px;line-height:1.7;">${args.notes}</div>` : ""}
      ${paragraph("You're welcome to submit other pieces any time.")}
    `,
  });
}

export function purchaseConfirmationBuyerEmail(args: {
  title: string;
  brand: string;
  grossAmountCents: number;
  orderUrl: string;
}): string {
  return layout({
    heading: "Your purchase is confirmed",
    bodyHtml: `
      ${paragraph(`Thank you for your purchase. Your order is confirmed and D&amp;D Luxury will arrange white-glove delivery.`)}
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #EFEFEF;border-bottom:1px solid #EFEFEF;margin:8px 0 24px;">
        ${detailRow("Brand", args.brand)}
        ${detailRow("Item", args.title)}
        ${detailRow("Total paid", formatZar(args.grossAmountCents))}
      </table>
      ${paragraph("You'll be able to confirm receipt once your piece arrives.")}
      ${button("View your order", args.orderUrl)}
    `,
  });
}

export function saleNotificationSellerEmail(args: {
  title: string;
  grossAmountCents: number;
  sellerPayoutCents: number;
  dashboardUrl: string;
}): string {
  return layout({
    heading: "Your piece has sold",
    bodyHtml: `
      ${paragraph(`Congratulations — <strong>${args.title}</strong> has sold.`)}
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #EFEFEF;border-bottom:1px solid #EFEFEF;margin:8px 0 24px;">
        ${detailRow("Sale price", formatZar(args.grossAmountCents))}
        ${detailRow("Your payout", formatZar(args.sellerPayoutCents))}
      </table>
      ${paragraph("D&amp;D Luxury will pay your net amount via EFT to your registered banking details once delivery is confirmed.")}
      ${button("Open your dashboard", args.dashboardUrl)}
    `,
  });
}

export function wishlistAlertBuyerEmail(args: {
  title: string;
  brand: string;
  priceCents: number;
  listingUrl: string;
}): string {
  return layout({
    heading: "A piece on your wishlist just arrived",
    bodyHtml: `
      ${paragraph(`A new authenticated piece matching your wishlist is now available.`)}
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #EFEFEF;border-bottom:1px solid #EFEFEF;margin:8px 0 24px;">
        ${detailRow("Brand", args.brand)}
        ${detailRow("Item", args.title)}
        ${detailRow("Price", formatZar(args.priceCents))}
      </table>
      ${paragraph("These pieces move quickly — view it before someone else does.")}
      ${button("View the piece", args.listingUrl)}
    `,
  });
}

export function magicLinkEmail(args: { url: string }): string {
  return layout({
    heading: "Sign in to D&D Luxury",
    bodyHtml: `
      ${paragraph("Use the secure link below to sign in. It expires shortly and can only be used once.")}
      ${button("Sign in", args.url)}
    `,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function conciergeMessageEmail(args: {
  name: string;
  email: string;
  phone: string;
  reason: string;
  message: string;
}): string {
  return layout({
    heading: "New concierge enquiry",
    bodyHtml: `
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #EFEFEF;border-bottom:1px solid #EFEFEF;margin:8px 0 20px;">
        ${detailRow("From", escapeHtml(args.name))}
        ${detailRow("Email", escapeHtml(args.email))}
        ${args.phone ? detailRow("Phone", escapeHtml(args.phone)) : ""}
        ${detailRow("Reason", escapeHtml(args.reason))}
      </table>
      <div style="background:#F8F8F8;border:1px solid #E5E5E5;border-radius:3px;padding:16px 18px;color:#1A1A1A;font-size:14px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(args.message)}</div>
    `,
  });
}
