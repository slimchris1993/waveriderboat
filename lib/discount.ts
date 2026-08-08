// The $500 welcome code promised by the popup. Flat discount, applied
// server-side only on carts big enough to carry it (boards start ~$1.5K —
// the guard keeps an accessories-only cart from going negative or free).
export const WELCOME_CODE = "WAVE500";
export const WELCOME_DISCOUNT = 500;
export const WELCOME_MIN_SUBTOTAL = 1000;

export function discountFor(code: string | null | undefined, subtotal: number): number {
  if (!code) return 0;
  if (code.trim().toUpperCase() !== WELCOME_CODE) return 0;
  return subtotal >= WELCOME_MIN_SUBTOTAL ? WELCOME_DISCOUNT : 0;
}
