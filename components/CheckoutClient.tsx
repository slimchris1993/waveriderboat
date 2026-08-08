"use client";

// Checkout for the static storefront: reads the same localStorage cart
// (rw_cart) the static pages write via RWCart, submits to /api/orders.
// Modeled on the VapeAussie checkout: manual mode collects a preferred
// method; direct mode shows the owner's payment details immediately.

import { useEffect, useMemo, useState } from "react";
import { BrandIcon, MastercardMark } from "@/components/BrandIcon";
import { LogoMark } from "@/components/LogoMark";
import type { PaymentMethodKey } from "@/lib/settings";
import { WELCOME_CODE, WELCOME_DISCOUNT, WELCOME_MIN_SUBTOTAL } from "@/lib/discount";

type CartItem = {
  id: string;
  name: string;
  cat: string;
  price: number;
  image?: string;
  qty: number;
};

const METHODS: { key: PaymentMethodKey; label: string; icon?: string }[] = [
  { key: "card", label: "Card", icon: "visa" },
  { key: "applepay", label: "Apple Pay", icon: "applepay" },
  { key: "paypal", label: "PayPal", icon: "paypal" },
  { key: "zelle", label: "Zelle", icon: "zelle" },
  { key: "cashapp", label: "Cash App", icon: "cashapp" },
  { key: "bank", label: "Bank / Wire", icon: "bank" },
  { key: "crypto", label: "Crypto", icon: "bitcoin" },
  { key: "other", label: "Other" },
];

const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany",
  "France", "Spain", "Italy", "Netherlands", "Poland", "Sweden", "Norway",
  "Denmark", "Switzerland", "Austria", "Belgium", "Portugal", "Ireland",
  "Greece", "Croatia", "United Arab Emirates", "Saudi Arabia", "Qatar",
  "New Zealand", "Mexico", "Brazil", "Other",
];

const usd = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Props = {
  mode: "manual" | "direct";
  methodDetails: Record<PaymentMethodKey, string>;
  otherLabel?: string;
  whatsapp?: string;
};

export default function CheckoutClient({ mode, methodDetails, otherLabel, whatsapp }: Props) {
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [method, setMethod] = useState<string>("card");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [placed, setPlaced] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [code, setCode] = useState("");
  const [country, setCountry] = useState("United States");

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem("rw_cart") || "[]"));
    } catch {
      setItems([]);
    }
  }, []);

  const subtotal = useMemo(
    () => (items ?? []).reduce((n, i) => n + i.price * i.qty, 0),
    [items]
  );
  const codeOk = code.trim().toUpperCase() === WELCOME_CODE && subtotal >= WELCOME_MIN_SUBTOTAL;
  const discount = codeOk ? WELCOME_DISCOUNT : 0;
  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

  // Direct mode only offers methods the owner configured
  const available = useMemo(() => {
    if (mode === "manual") return METHODS;
    const configured = METHODS.filter(
      (m) => m.key !== "other" && methodDetails[m.key]?.trim()
    );
    if (methodDetails.other?.trim()) {
      configured.push({ key: "other", label: otherLabel?.trim() || "Other" });
    }
    return configured.length ? configured : METHODS;
  }, [mode, methodDetails, otherLabel]);

  const activeMethod = available.some((m) => m.key === method)
    ? method
    : (available[0]?.key ?? "card");

  function setQty(id: string, qty: number) {
    const next = (items ?? [])
      .map((i) => (i.id === id ? { ...i, qty } : i))
      .filter((i) => i.qty > 0);
    setItems(next);
    localStorage.setItem("rw_cart", JSON.stringify(next));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy");
    setErrorMsg("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      customer: {
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        address: fd.get("address"),
        city: fd.get("city"),
        state: fd.get("state"),
        zip: fd.get("zip"),
        country: fd.get("country"),
        notes: fd.get("notes"),
      },
      items: (items ?? []).map((i) => ({ id: i.id, qty: i.qty })),
      paymentMethod: activeMethod,
      paymentOther:
        mode === "direct" && activeMethod === "other"
          ? otherLabel || "Custom"
          : fd.get("paymentOther"),
      paymentReference: fd.get("paymentReference"),
      discountCode: codeOk ? WELCOME_CODE : undefined,
    };
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setPlaced(data.orderId);
      localStorage.removeItem("rw_cart");
      setState("idle");
      window.scrollTo(0, 0);
    } catch (err) {
      setState("error");
      setErrorMsg(String((err as Error).message));
    }
  }

  const input =
    "w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent";

  const shellHead = (
    <div className="border-b border-line bg-background/95">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <a href="/index.html" className="flex items-center gap-2.5 font-display text-2xl tracking-wide">
          <LogoMark height={19} />
          <span>
            WAVE<span className="text-accent">RIDER</span>
          </span>
        </a>
        <a href="/cart.html" className="text-xs font-bold uppercase tracking-widest text-muted transition hover:text-accent">
          &larr; Back to cart
        </a>
      </div>
    </div>
  );

  if (items === null) {
    return (
      <>
        {shellHead}
        <div className="mx-auto max-w-xl px-4 py-24 text-center text-muted">Loading…</div>
      </>
    );
  }

  if (placed) {
    return (
      <>
        {shellHead}
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent bg-accent/10">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ff7d1f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h1 className="font-display text-4xl">ORDER PLACED</h1>
          <p className="mt-3 text-muted">
            Your order number is{" "}
            <span className="font-bold text-foreground">{placed}</span>. A
            confirmation email is on its way.
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            {mode === "manual"
              ? "Our team will email you shortly with payment details to complete your order."
              : "Complete your payment using the details shown (also in your email), quoting your order number as the reference."}
          </p>
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi, I just placed order ${placed}`)}`}
              target="_blank"
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-line-2 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
            >
              <BrandIcon name="whatsapp" size={16} /> Chat with us on WhatsApp
            </a>
          ) : null}
          <div>
            <a
              href="/index.html"
              className="glow-accent mt-8 inline-block rounded-lg bg-accent px-7 py-3 text-sm font-extrabold uppercase tracking-wide text-background transition hover:bg-accent-2 hover:text-white"
            >
              Keep browsing
            </a>
          </div>
        </div>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        {shellHead}
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="font-display text-3xl">YOUR CART IS EMPTY</h1>
          <a
            href="/index.html"
            className="mt-6 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-background transition hover:bg-accent-2 hover:text-white"
          >
            Browse the lineup
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      {shellHead}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-4xl">CHECKOUT</h1>

        <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          {/* Details */}
          <div className="space-y-6">
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
                Your details
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input name="name" required placeholder="Full name" className={input} />
                <input name="email" type="email" required placeholder="Email" className={input} />
                <input name="phone" required placeholder="Phone / WhatsApp" className={input} />
              </div>
            </section>

            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
                Delivery address
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input name="address" required placeholder="Street address" className={`${input} sm:col-span-2`} />
                <input name="city" required placeholder="City" className={input} />
                <div className="grid grid-cols-2 gap-3">
                  <input name="state" placeholder="State / Region" className={input} />
                  <input name="zip" placeholder="ZIP / Postcode" className={input} />
                </div>
                <select
                  name="country"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={`${input} sm:col-span-2`}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Delivery notes (optional)"
                  className={`${input} sm:col-span-2`}
                />
              </div>
            </section>

            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
                Payment method
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {available.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMethod(m.key)}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      activeMethod === m.key
                        ? "border-accent bg-accent text-background"
                        : "border-line-2 bg-surface-2 text-muted hover:border-accent hover:text-accent"
                    }`}
                  >
                    {m.icon === "bank" ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="21" x2="21" y2="21" /><line x1="6" y1="17" x2="6" y2="10" /><line x1="12" y1="17" x2="12" y2="10" /><line x1="18" y1="17" x2="18" y2="10" /><polygon points="12 2 22 7 2 7" /></svg>
                    ) : m.icon ? (
                      <BrandIcon
                        name={m.icon}
                        size={15}
                        color={activeMethod === m.key ? "#0d0906" : undefined}
                      />
                    ) : null}
                    {m.label}
                  </button>
                ))}
              </div>

              {mode === "manual" && activeMethod === "other" && (
                <input
                  name="paymentOther"
                  placeholder="Tell us your preferred payment method"
                  className={`${input} mt-3`}
                />
              )}

              {mode === "direct" ? (
                <div className="mt-4 rounded-lg border border-accent/40 bg-accent/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-accent">
                    Pay now — {available.find((m) => m.key === activeMethod)?.label}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">
                    {methodDetails[activeMethod as PaymentMethodKey] ||
                      "Details will be emailed with your order confirmation."}
                  </p>
                  <input
                    name="paymentReference"
                    placeholder="Payment reference / receipt number (optional)"
                    className={`${input} mt-3`}
                  />
                </div>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  Place your order and our team will email you the{" "}
                  {METHODS.find((m) => m.key === activeMethod)?.label} details to
                  complete payment. Nothing is charged now.
                </p>
              )}
            </section>
          </div>

          {/* Summary */}
          <aside className="h-fit rounded-xl border border-line bg-surface p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
              Order summary
            </h2>
            <ul className="mt-4 space-y-3">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 text-sm">
                  {i.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image} alt="" className="h-11 w-14 shrink-0 rounded-md border border-line object-cover" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1">{i.name}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      <button type="button" onClick={() => setQty(i.id, i.qty - 1)} className="h-5 w-5 rounded border border-line-2 leading-none hover:border-accent hover:text-accent">−</button>
                      ×{i.qty}
                      <button type="button" onClick={() => setQty(i.id, i.qty + 1)} className="h-5 w-5 rounded border border-line-2 leading-none hover:border-accent hover:text-accent">+</button>
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold">{usd(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-line pt-3">
              <label className="text-xs font-semibold text-muted">Discount code</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={WELCOME_CODE}
                  className={input}
                />
              </div>
              {code.trim() !== "" && !codeOk && (
                <p className="mt-1 text-xs text-bad">
                  {code.trim().toUpperCase() === WELCOME_CODE
                    ? `${WELCOME_CODE} applies on orders over ${usd(WELCOME_MIN_SUBTOTAL)}`
                    : "Code not recognized"}
                </p>
              )}
            </div>

            <div className="mt-4 space-y-1.5 border-t border-line pt-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{usd(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm font-semibold text-good">
                  <span>{WELCOME_CODE} — $500 off</span>
                  <span>−{usd(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{usd(total)}</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted">
              Free shipping over $5,000 — delivery window confirmed within 24h
              from the nearest warehouse.
            </p>
            <button
              disabled={state === "busy"}
              className="glow-accent mt-5 w-full rounded-lg bg-accent px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-background transition hover:bg-accent-2 hover:text-white disabled:opacity-60"
            >
              {state === "busy" ? "Placing order…" : "Place order"}
            </button>
            {state === "error" && (
              <p className="mt-3 text-center text-sm text-bad">{errorMsg}</p>
            )}
            <div className="mt-4 flex items-center justify-center gap-2.5 border-t border-line pt-3.5 opacity-80">
              <BrandIcon name="visa" size={22} color="#e6dccd" />
              <MastercardMark height={14} />
              <BrandIcon name="applepay" size={22} color="#e6dccd" />
              <BrandIcon name="paypal" size={15} color="#e6dccd" />
              <BrandIcon name="zelle" size={15} color="#e6dccd" />
              <BrandIcon name="cashapp" size={15} color="#e6dccd" />
              <BrandIcon name="bitcoin" size={15} color="#e6dccd" />
            </div>
          </aside>
        </form>
      </div>
    </>
  );
}
