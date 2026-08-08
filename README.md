# WAVERIDER — waveriderboat.com

Hybrid storefront: the 30+ page static site lives in `public/` (served
as-is), and a Next.js App Router shell provides the dynamic parts —
checkout, admin panel, and the API. Deployed on Vercel, data in Supabase,
email via Resend, repo on GitHub.

## Stack

- **Static storefront** — `public/*.html` (home, products, collections,
  cart). Cart state is client-side `localStorage` (`rw_cart`, written by
  `public/js/cart.js`). `/` rewrites to `/index.html` (next.config.ts).
- **Checkout** — `/checkout` (Next page) reads the same `rw_cart`,
  submits to `/api/orders`. Payment modes: *manual* (owner emails payment
  details after the order) or *direct* (owner's payment details show at
  checkout) — switched from the admin panel.
- **Admin panel** — `/admin`: dashboard, orders (status workflow), leads,
  settings (WhatsApp number, social links, payment methods, admin
  password). Login with `ADMIN_PASSWORD` initially.
- **API** — `/api/orders` (re-prices carts server-side against
  `catalog/products.json`), `/api/lead` (popup / chat / contact),
  `/api/settings` (public subset: WhatsApp + socials, consumed by
  `public/js/site-config.js` to hydrate static pages).
- **Storage** — Supabase Postgres, single `store` table
  (`supabase/schema.sql`, run once). Without Supabase env vars it falls
  back to JSON files in `data/` (dev mode).
- **Email** — Resend, from `no-reply@waveriderboat.com` (domain must be
  verified in Resend). Customer + owner copies on every order/lead;
  Reply-To routes responses to the owner's Gmail (owner notifications
  reply to the customer). Without `RESEND_API_KEY`, sends become logged
  no-ops (`data/email-log.jsonl`) — orders are never lost to mail issues.

## Develop

```bash
npm install
cp .env.example .env.local   # fill in
npm run dev                  # http://localhost:3000
```

`npm run catalog` regenerates `catalog/products.json` by scanning the
static pages for `RWCart.add()` calls — run it after adding/repricing any
product in `public/`.

## Deploy (Vercel)

1. Push to GitHub (`slimchris1993/waveriderboat`), import in Vercel.
2. Set the env vars from `.env.example` in Vercel → Project → Settings →
   Environment Variables.
3. Run `supabase/schema.sql` once in Supabase → SQL Editor.
4. Verify `waveriderboat.com` in Resend (DNS records) so
   `no-reply@waveriderboat.com` delivers.

## Notes

- The `WAVE500` popup code = flat $500 off orders ≥ $1,000, enforced
  server-side (`lib/discount.ts`).
- Product prices shown on RIB/board pages are provisional pending client
  confirmation (converted from GBP supplier listings).
- Product-page photos still show the OEM's livery on some goods — replace
  with unbranded supplier assets when available.
