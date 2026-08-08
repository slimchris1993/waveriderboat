import { loginAction } from "@/app/admin/actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        action={loginAction}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8"
      >
        <div className="font-display text-3xl">
          WAVE<span className="text-accent">RIDER</span>
        </div>
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted">
          Admin panel
        </p>
        {error && (
          <p className="mt-4 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
            Wrong password — try again.
          </p>
        )}
        <input
          type="password"
          name="password"
          required
          autoFocus
          placeholder="Password"
          className="mt-6 w-full rounded-lg border border-line bg-surface-2 px-3 py-3 text-sm outline-none transition focus:border-accent"
        />
        <button className="glow-accent mt-4 w-full rounded-lg bg-accent px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-background transition hover:bg-accent-2 hover:text-white">
          Sign in
        </button>
      </form>
    </div>
  );
}
