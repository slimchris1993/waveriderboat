import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { readOrders } from "@/lib/orders";
import { readLeads } from "@/lib/leads";

export default async function AdminDashboard() {
  await requireAdmin();
  const [orders, leads] = await Promise.all([readOrders(), readLeads()]);

  const newOrders = orders.filter((o) => o.status === "new" || o.status === "awaiting-payment");
  const revenue = orders
    .filter((o) => o.status === "paid" || o.status === "shipped")
    .reduce((n, o) => n + o.total, 0);

  const cards = [
    { label: "Orders", value: orders.length, href: "/admin/orders" },
    { label: "Needs action", value: newOrders.length, href: "/admin/orders", hot: newOrders.length > 0 },
    { label: "Confirmed revenue", value: `$${revenue.toLocaleString("en-US")}`, href: "/admin/orders" },
    { label: "Leads", value: leads.length, href: "/admin/leads" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl">DASHBOARD</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`rounded-xl border p-5 transition hover:border-accent ${
              c.hot ? "border-accent/60 bg-accent/10" : "border-line bg-surface"
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-widest text-muted">
              {c.label}
            </div>
            <div className="mt-2 font-display text-3xl text-accent">{c.value}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
            Latest orders
          </h2>
          {orders.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {orders.slice(0, 6).map((o) => (
                <li key={o.id} className="flex justify-between gap-3">
                  <span className="font-mono">{o.id}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">{o.customer.name}</span>
                  <span className="font-semibold">${o.total.toLocaleString("en-US")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
            Latest leads
          </h2>
          {leads.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No leads yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {leads.slice(0, 6).map((l) => (
                <li key={l.id} className="flex justify-between gap-3">
                  <span className="rounded bg-accent/10 px-1.5 text-xs font-bold uppercase text-accent">
                    {l.type}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted">
                    {l.name || l.email}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(l.createdAt).toLocaleDateString("en-US")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
