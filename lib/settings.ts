import { fsRead, kvGet, kvSet } from "@/lib/storage";

export type PaymentMethodKey =
  | "card"
  | "applepay"
  | "paypal"
  | "zelle"
  | "cashapp"
  | "bank"
  | "crypto"
  | "other";

export type SiteSettings = {
  /** WhatsApp number with country code, digits only; empty hides the buttons */
  whatsapp: string;
  /**
   * Livechat provider embed snippet (Tawk.to, Crisp, Tidio…). When set it is
   * injected into every storefront page and replaces the built-in chat
   * bubble, so customers reach a real person instead of the canned replies.
   */
  livechatEmbed: string;
  socials: {
    instagram: string;
    facebook: string;
    tiktok: string;
    youtube: string;
    x: string;
  };
  payments: {
    /**
     * manual — customer picks a preferred method, places the order, and
     *   the owner follows up with payment details by email.
     * direct — the owner's saved method details show at checkout so the
     *   customer can pay immediately.
     */
    mode: "manual" | "direct";
    /** Owner-entered payment details per method; empty = hidden in direct mode */
    methods: Record<PaymentMethodKey, string>;
    /** Display name for the owner's custom "other" method (e.g. "Wise — USD") */
    otherLabel: string;
  };
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  card: "Card",
  applepay: "Apple Pay",
  paypal: "PayPal",
  zelle: "Zelle",
  cashapp: "Cash App",
  bank: "Bank / Wire",
  crypto: "Crypto",
  other: "Other",
};

const DEFAULTS: SiteSettings = {
  whatsapp: "18312964971",
  livechatEmbed: "",
  socials: { instagram: "", facebook: "", tiktok: "", youtube: "", x: "" },
  payments: {
    mode: "manual",
    methods: {
      card: "",
      applepay: "",
      paypal: "",
      zelle: "",
      cashapp: "",
      bank: "",
      crypto: "",
      other: "",
    },
    otherLabel: "",
  },
};

// Stored under "site-settings" (data/site-settings.json locally, Supabase in
// production). Read fresh on every call so admin saves apply without a
// restart.
export async function getSettings(): Promise<SiteSettings> {
  let raw = await kvGet<Partial<SiteSettings>>("site-settings");
  // Fresh database: fall back to the committed defaults file so the store
  // works on first deploy; the first admin save persists to the database.
  if (!raw) raw = fsRead<Partial<SiteSettings>>("site-settings");
  if (!raw) return structuredClone(DEFAULTS);
  return {
    whatsapp: raw.whatsapp ?? DEFAULTS.whatsapp,
    livechatEmbed: raw.livechatEmbed ?? "",
    socials: { ...DEFAULTS.socials, ...raw.socials },
    payments: {
      mode: raw.payments?.mode === "direct" ? "direct" : "manual",
      methods: { ...DEFAULTS.payments.methods, ...raw.payments?.methods },
      otherLabel: raw.payments?.otherLabel ?? "",
    },
  };
}

export async function saveSettings(settings: SiteSettings): Promise<void> {
  await kvSet("site-settings", settings);
}
