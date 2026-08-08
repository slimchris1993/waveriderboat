import { requireAdmin } from "@/lib/admin";
import { readOrders, type OrderStatus } from "@/lib/orders";
import { PAYMENT_METHOD_LABELS } from "@/lib/settings";
import { setOrderStatusAction } from "@/app/admin/actions";

const STATUSES: OrderStatus[] = ["new", "awaiting-payment", "paid", "shipped", "cancelled"];

const STATUS_STYLE: Record<OrderStatus, string> = {
  new: "bg-accent/15 text-accent",
  "awaiting-payment": "bg-yellow-500/15 text-yellow-500",
  paid: "bg-good/15 text-good",
  shipped: "bg-good/15 text-good",
  cancelled: "bg-line text-muted",
};

export default async function AdminOrdersPage() {
  await requireAdmin();
  const orders = await readOrders();

  return (
    <div>
      <h1 className="font-display text-3xl">ORDERS</h1>
      {orders.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-surface p-8 text-center text-muted">
          No orders yet — they land here (and in your inbox) the moment a
          customer checks out.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <details key={o.id} className="rounded-xl border border-line bg-surface">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-4">
                <span className="font-mono text-sm font-bold">{o.id}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${STATUS_STYLE[o.status]}`}>
                  {o.status}
                </span>
                <span className="text-sm">{o.customer.name}</span>
                <span className="text-xs text-muted">
                  {PAYMENT_METHOD_LABELS[o.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ??
                    (o.paymentOther ? `Other: ${o.paymentOther}` : o.paymentMethod)}
                  {" · "}
                  {o.customer.country}
                  {" · "}
                  {new Date(o.createdAt).toLocaleString("en-US")}
                </span>
                <span className="ml-auto text-sm font-bold">
                  ${o.total.toLocaleString("en-US")}
                  {o.discount ? (
                    <span className="ml-1.5 text-[11px] font-semibold text-good">
                      ({o.discountCode})
                    </span>
                  ) : null}
                </span>
              </summary>
              <div className="border-t border-line px-5 py-4 text-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted">Items</p>
                    <ul className="mt-2 space-y-1">
                      {o.items.map((i) => (
                        <li key={i.id} className="flex justify-between gap-2">
                          <span className="line-clamp-1">{i.name} ×{i.qty}</span>
                          <span className="shrink-0">${(i.price * i.qty).toLocaleString("en-US")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted">Customer</p>
                    <p className="mt-2 leading-relaxed">
                      <a href={`mailto:${o.customer.email}`} className="text-accent hover:underline">
                        {o.customer.email}
                      </a>
                      {" · "}
                      {o.customer.phone}
                      <br />
                      {[o.customer.address, o.customer.city, o.customer.state, o.customer.zip, o.customer.country]
                        .filter(Boolean)
                        .join(", ")}
                      {o.customer.notes && (
                        <>
                          <br />
                          <span className="text-muted">Notes: {o.customer.notes}</span>
                        </>
                      )}
                      {o.paymentReference && (
                        <>
                          <br />
                          <span className="text-muted">Payment ref: {o.paymentReference}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <form action={setOrderStatusAction} className="mt-4 flex items-center gap-2">
                  <input type="hidden" name="id" value={o.id} />
                  <label className="text-xs font-bold uppercase tracking-widest text-muted">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={o.status}
                    className="rounded-lg border border-line bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  <button className="rounded-lg bg-accent px-4 py-1.5 text-xs font-bold text-background transition hover:bg-accent-2 hover:text-white">
                    Update
                  </button>
                </form>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
