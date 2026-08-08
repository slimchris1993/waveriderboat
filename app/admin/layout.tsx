import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { logoutAction } from "@/app/admin/actions";

export const metadata = { title: "Admin — WAVERIDER" };

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authed = await isAdmin();

  if (!authed) {
    // login page renders inside the same layout without the chrome
    return <div className="min-h-screen">{children}</div>;
  }

  const nav = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/leads", label: "Leads" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/admin" className="font-display text-xl tracking-wide">
            WAVE<span className="text-accent">RIDER</span>{" "}
            <span className="text-muted">ADMIN</span>
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-muted transition hover:bg-accent/10 hover:text-accent"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <a
            href="/index.html"
            target="_blank"
            className="hidden text-xs font-semibold text-muted transition hover:text-accent sm:block"
          >
            View store ↗
          </a>
          <form action={logoutAction}>
            <button className="rounded-md border border-line-2 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-muted transition hover:border-accent hover:text-accent">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
