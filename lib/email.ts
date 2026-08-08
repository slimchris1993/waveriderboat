// Transactional email via Resend. Every send goes out as
// no-reply@waveriderboat.com (MAIL_FROM) with Reply-To pointed at the
// owner's Gmail, so customer replies land in the owner's inbox.
// Without RESEND_API_KEY the send becomes a logged no-op — orders and
// leads must never be lost to a mail outage.

import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PAYMENT_METHOD_LABELS, type SiteSettings } from "@/lib/settings";
import type { Order } from "@/lib/orders";
import type { Lead } from "@/lib/leads";
import { WELCOME_CODE, WELCOME_MIN_SUBTOTAL } from "@/lib/discount";

export const OWNER = () => process.env.MAIL_OWNER || "";
const REPLY_TO = () => process.env.MAIL_REPLY_TO || process.env.MAIL_OWNER || "";
const FROM = () => process.env.MAIL_FROM || "WAVERIDER <no-reply@waveriderboat.com>";
const SITE = () => process.env.SITE_URL || "https://waveriderboat.com";

function logEmail(entry: Record<string, unknown>) {
  const line = JSON.stringify({ at: new Date().toISOString(), ...entry });
  // stdout survives on Vercel (function logs)
  console.log("[email]", line);
  try {
    const dir = path.join(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    appendFileSync(path.join(dir, "email-log.jsonl"), line + "\n");
  } catch {
    // read-only filesystem (Vercel) — stdout log above is enough
  }
}

// Fire-and-forget sender: an email failure must never block an order.
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  /** override Reply-To (e.g. owner notifications reply to the customer) */
  replyTo?: string;
}): Promise<boolean> {
  if (!opts.to) return false;
  if (!process.env.RESEND_API_KEY) {
    logEmail({ ok: false, skipped: "no RESEND_API_KEY", to: opts.to, subject: opts.subject });
    return false;
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM(),
      replyTo: opts.replyTo || REPLY_TO() || undefined,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) throw new Error(error.message);
    logEmail({ ok: true, to: opts.to, subject: opts.subject });
    return true;
  } catch (e) {
    logEmail({
      ok: false,
      to: opts.to,
      subject: opts.subject,
      error: String((e as Error)?.message ?? e).slice(0, 300),
    });
    return false;
  }
}

/* ── Branded HTML shell — WAVERIDER charcoal + molten orange ── */

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#efe9e0;font-family:Arial,Helvetica,sans-serif;color:#24190f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe9e0;padding:24px 12px;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e2d8ca;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#0d0906;padding:24px 28px;">
        <span style="font-size:22px;font-weight:800;letter-spacing:2px;color:#ffffff;">WAVE<span style="color:#ff7d1f;">RIDER</span></span><br>
        <span style="font-size:11px;color:#8d7c67;letter-spacing:3px;">WAVERIDERBOAT.COM</span>
      </td></tr>
      <tr><td style="background:#ff7d1f;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:26px 28px;">
        <h1 style="font-size:22px;margin:0 0 14px;color:#24190f;">${title}</h1>
        ${body}
        <p style="font-size:12px;color:#8a7a66;margin-top:28px;border-top:1px solid #e2d8ca;padding-top:14px;">
          Questions? Just reply to this email — it goes straight to our team.<br>
          WAVERIDER &middot; Electric surfboards, E-Foils, jet skis, boats &amp; RIBs &middot; 5 global warehouses.
        </p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function itemsTable(order: Order): string {
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #efe8dd;font-size:13.5px;">${i.name}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #efe8dd;font-size:13.5px;text-align:center;">&times;${i.qty}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #efe8dd;font-size:13.5px;text-align:right;">${usd(i.price * i.qty)}</td>
      </tr>`
    )
    .join("");
  const discountRow = order.discount
    ? `<tr><td colspan="2" style="padding:6px 10px;font-size:13px;color:#1f7a4d;font-weight:700;">${order.discountCode} applied</td>
       <td style="padding:6px 10px;font-size:13px;color:#1f7a4d;font-weight:700;text-align:right;">&minus;${usd(order.discount)}</td></tr>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2d8ca;border-radius:8px;overflow:hidden;">
    ${rows}
    <tr><td colspan="2" style="padding:8px 10px;font-size:13px;">Subtotal</td>
    <td style="padding:8px 10px;font-size:13px;text-align:right;">${usd(order.subtotal)}</td></tr>
    ${discountRow}
    <tr><td colspan="2" style="padding:10px;font-weight:800;font-size:14px;">Total</td>
    <td style="padding:10px;font-weight:800;font-size:14px;text-align:right;">${usd(order.total)}</td></tr>
  </table>`;
}

function methodLabel(order: Order): string {
  const label =
    PAYMENT_METHOD_LABELS[order.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ??
    order.paymentMethod;
  return order.paymentMethod === "other" && order.paymentOther
    ? `Other — ${order.paymentOther}`
    : label;
}

const shipTo = (o: Order) =>
  [o.customer.address, o.customer.city, o.customer.state, o.customer.zip, o.customer.country]
    .filter(Boolean)
    .join(", ");

/* ── Order emails ── */

export function orderCustomerHtml(order: Order, settings: SiteSettings): string {
  const payBlock =
    order.paymentMode === "direct"
      ? `<div style="background:#fdf3ea;border:1px solid #ffd9b8;border-radius:8px;padding:14px 16px;margin:16px 0;">
          <p style="margin:0 0 6px;font-size:13.5px;font-weight:800;color:#b3480d;">Complete your payment — ${methodLabel(order)}</p>
          <p style="margin:0;font-size:13.5px;white-space:pre-line;">${
            settings.payments.methods[
              order.paymentMethod as keyof typeof settings.payments.methods
            ] || "Payment details will follow shortly."
          }</p>
          <p style="margin:10px 0 0;font-size:12.5px;color:#8a7a66;">Use <b>${order.id}</b> as the payment reference. Your order ships once payment clears.</p>
        </div>`
      : `<div style="background:#fdf3ea;border:1px solid #ffd9b8;border-radius:8px;padding:14px 16px;margin:16px 0;">
          <p style="margin:0;font-size:13.5px;">You chose <b>${methodLabel(order)}</b>. Our team will email you shortly with the payment details to complete this order.</p>
        </div>`;

  return shell(
    `Order ${order.id} received`,
    `<p style="font-size:14px;">Hi ${order.customer.name.split(" ")[0]}, thanks for your order — here's the summary:</p>
     ${itemsTable(order)}
     ${payBlock}
     <p style="font-size:13.5px;"><b>Delivery to:</b> ${shipTo(order)}</p>
     <p style="font-size:13.5px;">We coordinate shipping from the nearest warehouse and confirm your delivery window by email or WhatsApp within 24 hours.</p>`
  );
}

export function orderOwnerHtml(order: Order): string {
  const c = order.customer;
  return shell(
    `New order ${order.id} — ${usd(order.total)}`,
    `<p style="font-size:14px;"><b>${c.name}</b> placed an order (${order.paymentMode} mode, method: ${methodLabel(order)}${order.paymentReference ? `, ref: ${order.paymentReference}` : ""}).</p>
     ${itemsTable(order)}
     <p style="font-size:13.5px;margin-top:14px;">
       <b>Contact:</b> ${c.email} &middot; ${c.phone}<br>
       <b>Ship to:</b> ${shipTo(order)}<br>
       ${c.notes ? `<b>Notes:</b> ${c.notes}` : ""}
     </p>
     <p style="font-size:13.5px;">${
       order.paymentMode === "manual"
         ? "&#9888;&#65039; Manual mode: reply to the customer with payment details to proceed."
         : "Direct mode: the customer has your payment details; confirm once funds arrive."
     }</p>
     <p style="font-size:13px;"><a href="${SITE()}/admin/orders" style="color:#b3480d;font-weight:700;">Open in admin panel &rarr;</a></p>`
  );
}

/* ── Lead emails (popup / chat / contact) ── */

export function leadWelcomeHtml(lead: Lead): string {
  return shell(
    `Your $500 code is inside`,
    `<p style="font-size:14px;">Hi ${lead.name.split(" ")[0] || "there"}, welcome to WAVERIDER! Here's your first-order discount code:</p>
     <p style="text-align:center;margin:18px 0;"><span style="display:inline-block;background:#ff7d1f;color:#0d0906;font-weight:800;font-size:20px;letter-spacing:3px;padding:14px 30px;border-radius:8px;">${WELCOME_CODE}</span></p>
     <p style="font-size:13.5px;">Enter it at checkout for <b>$500 off</b> any order over ${usd(WELCOME_MIN_SUBTOTAL)} — boards, E-Foils, jet skis, boats or RIBs. One per customer, first order only.</p>
     <p style="font-size:13.5px;"><a href="${SITE()}" style="color:#b3480d;font-weight:700;">Browse the lineup &rarr;</a></p>`
  );
}

export function leadOwnerHtml(lead: Lead): string {
  const typeLabel =
    lead.type === "popup" ? "$500 popup" : lead.type === "chat" ? "chat widget" : "contact form";
  return shell(
    `New ${typeLabel} lead`,
    `<p style="font-size:14px;"><b>${lead.name || "(no name)"}</b> &middot; <a href="mailto:${lead.email}" style="color:#b3480d;">${lead.email}</a></p>
     ${lead.message ? `<div style="background:#faf6f0;border:1px solid #e2d8ca;border-radius:8px;padding:12px 14px;font-size:13.5px;white-space:pre-line;">${lead.message}</div>` : ""}
     ${lead.page ? `<p style="font-size:12.5px;color:#8a7a66;">From page: ${lead.page}</p>` : ""}
     <p style="font-size:13px;">Reply directly to this email to reach them${lead.type === "popup" ? " — they already received the WAVE500 code" : ""}.</p>`
  );
}
