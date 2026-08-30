import { requireAdmin } from "@/lib/admin";
import { getSettings, PAYMENT_METHOD_LABELS, type PaymentMethodKey } from "@/lib/settings";
import { changePasswordAction, saveSettingsAction } from "@/app/admin/actions";
import { BrandIcon } from "@/components/BrandIcon";

const input =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted/60 focus:border-accent";

const METHOD_HINTS: Record<PaymentMethodKey, string> = {
  card: "e.g. payment link for card payments (Stripe/Square link)",
  applepay: "e.g. Apple Pay to +1 434 480 0777",
  paypal: "e.g. paypal.me/waverider or PayPal email",
  zelle: "e.g. Zelle to owner@gmail.com / +1 434 480 0777",
  cashapp: "e.g. Cash App: $waverider",
  bank: "e.g. Account name / routing / account number / SWIFT for wires",
  crypto: "e.g. BTC: bc1q… · USDT (TRC20): TX…",
  other: "e.g. Wise, Revolut, cash on delivery…",
};

const PW_ERRORS: Record<string, string> = {
  wrong: "Current password is incorrect.",
  short: "New password must be at least 8 characters.",
  match: "New passwords don't match.",
};

const SOCIALS = [
  { key: "instagram", icon: "instagram" },
  { key: "facebook", icon: "facebook" },
  { key: "tiktok", icon: "tiktok" },
  { key: "youtube", icon: "youtube" },
  { key: "x", icon: "x" },
] as const;

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    saveerr?: string;
    pwsaved?: string;
    pwerr?: string;
  }>;
}) {
  await requireAdmin();
  const { saved, saveerr, pwsaved, pwerr } = await searchParams;
  const s = await getSettings();

  return (
    <div>
      <h1 className="font-display text-3xl">SETTINGS</h1>
      {saved && (
        <p className="mt-3 inline-block rounded-lg border border-good/40 bg-good/10 px-4 py-2 text-sm font-semibold text-good">
          Saved — live on the store now.
        </p>
      )}
      {saveerr && (
        <p className="mt-3 rounded-lg border border-bad/40 bg-bad/10 px-4 py-2 text-sm font-semibold text-bad">
          Could not save — the database rejected the write. Open{" "}
          <a href="/api/health" target="_blank" className="underline">
            /api/health
          </a>{" "}
          to see what is wrong (usually supabase/schema.sql has not been run
          yet).
        </p>
      )}

      <form action={saveSettingsAction} className="mt-6 space-y-6">
        {/* Checkout mode */}
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
            Checkout mode
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line-2 p-4 has-[:checked]:border-accent has-[:checked]:bg-accent/5">
              <input
                type="radio"
                name="paymentMode"
                value="manual"
                defaultChecked={s.payments.mode === "manual"}
                className="mt-1 accent-[#ff7d1f]"
              />
              <span className="text-sm">
                <b>Manual</b>
                <br />
                <span className="text-muted">
                  Customer picks a preferred method and places the order — you
                  email them the payment details to proceed.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line-2 p-4 has-[:checked]:border-accent has-[:checked]:bg-accent/5">
              <input
                type="radio"
                name="paymentMode"
                value="direct"
                defaultChecked={s.payments.mode === "direct"}
                className="mt-1 accent-[#ff7d1f]"
              />
              <span className="text-sm">
                <b>Direct</b>
                <br />
                <span className="text-muted">
                  Your payment details below show at checkout so customers can
                  pay immediately. Only filled-in methods appear.
                </span>
              </span>
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethodKey[]).map((key) => (
              <label key={key} className="text-sm">
                <span className="font-semibold">
                  {key === "other" ? "Other (custom method)" : PAYMENT_METHOD_LABELS[key]}
                </span>
                <textarea
                  name={`method_${key}`}
                  defaultValue={s.payments.methods[key]}
                  placeholder={METHOD_HINTS[key]}
                  rows={3}
                  className={`${input} mt-1.5 font-mono text-[12.5px]`}
                />
              </label>
            ))}
            <label className="text-sm">
              <span className="font-semibold">&ldquo;Other&rdquo; method name</span>{" "}
              <span className="text-muted">(shown as the button at checkout)</span>
              <input
                name="otherLabel"
                defaultValue={s.payments.otherLabel}
                placeholder="e.g. Wise (USD)"
                className={`${input} mt-1.5`}
              />
            </label>
          </div>
        </section>

        {/* WhatsApp + livechat */}
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted">
            <BrandIcon name="whatsapp" size={14} /> WhatsApp &amp; livechat
          </h2>
          <label className="mt-4 block text-sm">
            <span className="font-semibold">WhatsApp number</span>{" "}
            <span className="text-muted">
              (with country code, digits only — updates every WhatsApp button
              on the site; empty hides them)
            </span>
            <input
              name="whatsapp"
              defaultValue={s.whatsapp}
              placeholder="14344800777"
              className={`${input} mt-1.5`}
            />
          </label>
          <label className="mt-4 block text-sm">
            <span className="font-semibold">Live chat embed code</span>{" "}
            <span className="text-muted">
              (paste the snippet from Tawk.to, Crisp, Tidio, etc. — it loads on
              every page and replaces the built-in chat bubble. Leave empty to
              keep the built-in chat, which emails you every message.)
            </span>
            <textarea
              name="livechatEmbed"
              defaultValue={s.livechatEmbed}
              rows={5}
              placeholder="<script>…tawk.to…</script>"
              className={`${input} mt-1.5 font-mono text-[12px]`}
            />
          </label>
        </section>

        {/* Socials */}
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
            Social links{" "}
            <span className="normal-case">(empty = icon hidden in the footer)</span>
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SOCIALS.map(({ key, icon }) => (
              <label key={key} className="text-sm">
                <span className="flex items-center gap-2 font-semibold capitalize">
                  <BrandIcon name={icon} size={14} /> {key === "x" ? "X (Twitter)" : key}
                </span>
                <input
                  name={key}
                  defaultValue={s.socials[key]}
                  placeholder={`https://${key === "x" ? "x" : key}.com/…`}
                  className={`${input} mt-1.5`}
                />
              </label>
            ))}
          </div>
        </section>

        <button className="glow-accent rounded-lg bg-accent px-8 py-3 text-sm font-extrabold uppercase tracking-wide text-background transition hover:bg-accent-2 hover:text-white">
          Save settings
        </button>
      </form>

      {/* Separate form — password changes shouldn't ride along with settings */}
      <section className="mt-10 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          Admin password
        </h2>
        {pwsaved && (
          <p className="mt-3 inline-block rounded-lg border border-good/40 bg-good/10 px-4 py-2 text-sm font-semibold text-good">
            Password changed — use it next time you sign in.
          </p>
        )}
        {pwerr && (
          <p className="mt-3 inline-block rounded-lg border border-bad/40 bg-bad/10 px-4 py-2 text-sm font-semibold text-bad">
            {PW_ERRORS[pwerr] ?? "Couldn't change the password."}
          </p>
        )}
        <form action={changePasswordAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            type="password"
            name="currentPassword"
            required
            placeholder="Current password"
            className={input}
          />
          <input
            type="password"
            name="newPassword"
            required
            minLength={8}
            placeholder="New password (min 8 chars)"
            className={input}
          />
          <input
            type="password"
            name="confirmPassword"
            required
            placeholder="Repeat new password"
            className={input}
          />
          <div className="sm:col-span-3">
            <button className="rounded-lg border border-line-2 px-6 py-2.5 text-sm font-bold text-foreground transition hover:border-accent hover:text-accent">
              Change password
            </button>
            <p className="mt-2 text-xs text-muted">
              Changing the password signs out every other admin session.
              Recovery: clear the admin-auth record (Supabase `store` table,
              bucket kv / key admin-auth) to fall back to the ADMIN_PASSWORD
              env var.
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}
