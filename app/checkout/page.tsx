import { getSettings } from "@/lib/settings";
import CheckoutClient from "@/components/CheckoutClient";

export const metadata = { title: "Checkout — WAVERIDER" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const s = await getSettings();
  return (
    <CheckoutClient
      mode={s.payments.mode}
      methodDetails={s.payments.methods}
      otherLabel={s.payments.otherLabel}
      whatsapp={s.whatsapp}
    />
  );
}
