import { BRAND_PATHS } from "@/lib/brand-icons";

export const BRAND_COLORS: Record<string, string> = {
  visa: "#1A1F71",
  mastercard: "#EB001B",
  applepay: "#FFFFFF",
  paypal: "#00457C",
  zelle: "#6D1ED4",
  cashapp: "#00D632",
  bitcoin: "#F7931A",
  americanexpress: "#2E77BC",
  googlepay: "#FFFFFF",
  instagram: "#E4405F",
  facebook: "#0866FF",
  tiktok: "#FFFFFF",
  youtube: "#FF0000",
  x: "#FFFFFF",
  whatsapp: "#25D366",
};

export function BrandIcon({
  name,
  size = 18,
  color,
  className,
}: {
  name: keyof typeof BRAND_PATHS | string;
  size?: number;
  color?: string;
  className?: string;
}) {
  const d = BRAND_PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color ?? BRAND_COLORS[name] ?? "currentColor"}
      className={className}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

/** Mastercard needs its two-circle mark, not a single-color glyph */
export function MastercardMark({ height = 18 }: { height?: number }) {
  const w = (height / 20) * 32;
  return (
    <svg width={w} height={height} viewBox="0 0 32 20" aria-hidden>
      <circle cx="12" cy="10" r="9.5" fill="#EB001B" />
      <circle cx="20" cy="10" r="9.5" fill="#F79E1B" />
      <path
        d="M16 2.6a9.5 9.5 0 0 1 0 14.8A9.5 9.5 0 0 1 16 2.6z"
        fill="#FF5F00"
      />
    </svg>
  );
}
