import { NextResponse } from "next/server";
import { addOrder, newOrderId, type Order, type OrderItem } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { orderCustomerHtml, orderOwnerHtml, sendMail, OWNER } from "@/lib/email";
import { productById } from "@/lib/catalog";
import { discountFor, WELCOME_CODE } from "@/lib/discount";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const c = (body.customer ?? {}) as Record<string, string>;
  const required = ["name", "email", "phone", "address", "city", "country"];
  for (const f of required) {
    if (!c[f] || String(c[f]).trim().length < 2) {
      return NextResponse.json({ error: `Missing ${f}` }, { status: 400 });
    }
  }
  if (!EMAIL_RE.test(c.email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items)
    ? (body.items as { id: string; qty: number }[])
    : [];
  if (rawItems.length === 0 || rawItems.length > 100) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }
  // Re-price server-side from the generated catalog — never trust client prices
  const items: OrderItem[] = [];
  for (const it of rawItems) {
    const p = productById(String(it.id));
    const qty = Math.min(Math.max(1, Number(it.qty) || 1), 20);
    if (!p) continue;
    items.push({ id: p.id, name: p.name, cat: p.cat, price: p.price, qty, image: p.image });
  }
  if (items.length === 0) {
    return NextResponse.json({ error: "No valid items" }, { status: 400 });
  }

  const settings = await getSettings();
  const method = String(body.paymentMethod ?? "bank");
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const discount = discountFor(String(body.discountCode ?? ""), subtotal);
  const order: Order = {
    id: newOrderId(),
    createdAt: new Date().toISOString(),
    status: settings.payments.mode === "direct" ? "awaiting-payment" : "new",
    paymentMode: settings.payments.mode,
    paymentMethod: method,
    paymentOther: body.paymentOther ? String(body.paymentOther).slice(0, 120) : undefined,
    paymentReference: body.paymentReference
      ? String(body.paymentReference).slice(0, 120)
      : undefined,
    customer: {
      name: String(c.name).slice(0, 120),
      email: String(c.email).slice(0, 160),
      phone: String(c.phone).slice(0, 40),
      address: String(c.address).slice(0, 200),
      city: String(c.city).slice(0, 80),
      state: String(c.state ?? "").slice(0, 60),
      zip: String(c.zip ?? "").slice(0, 16),
      country: String(c.country).slice(0, 60),
      notes: c.notes ? String(c.notes).slice(0, 500) : undefined,
    },
    items,
    subtotal,
    discountCode: discount > 0 ? WELCOME_CODE : undefined,
    discount: discount > 0 ? discount : undefined,
    total: Math.round((subtotal - discount) * 100) / 100,
  };

  await addOrder(order);

  // Emails are fire-and-forget — a mail outage must not lose the order
  void sendMail({
    to: order.customer.email,
    subject: `Your WAVERIDER order ${order.id}`,
    html: orderCustomerHtml(order, settings),
  });
  void sendMail({
    to: OWNER(),
    subject: `New order ${order.id} — $${order.total.toLocaleString("en-US")} (${order.paymentMode})`,
    html: orderOwnerHtml(order),
    replyTo: order.customer.email,
  });

  return NextResponse.json({ ok: true, orderId: order.id });
}
