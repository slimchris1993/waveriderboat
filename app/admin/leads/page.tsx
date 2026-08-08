import { requireAdmin } from "@/lib/admin";
import { readLeads } from "@/lib/leads";

const TYPE_STYLE: Record<string, string> = {
  popup: "bg-accent/15 text-accent",
  chat: "bg-blue-500/15 text-blue-400",
  contact: "bg-good/15 text-good",
};

export default async function AdminLeadsPage() {
  await requireAdmin();
  const leads = await readLeads();

  return (
    <div>
      <h1 className="font-display text-3xl">LEADS</h1>
      <p className="mt-2 text-sm text-muted">
        Everyone who dropped their email — $500 popup claims, chat
        conversations and contact messages. Each one also hit your inbox.
      </p>
      {leads.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-surface p-8 text-center text-muted">
          No leads yet.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {leads.map((l) => (
            <details key={l.id} className="rounded-xl border border-line bg-surface">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3.5">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${TYPE_STYLE[l.type] ?? "bg-line text-muted"}`}>
                  {l.type}
                </span>
                <span className="text-sm font-semibold">{l.name || "(no name)"}</span>
                <a href={`mailto:${l.email}`} className="text-sm text-accent hover:underline">
                  {l.email}
                </a>
                <span className="ml-auto text-xs text-muted">
                  {new Date(l.createdAt).toLocaleString("en-US")}
                </span>
              </summary>
              {(l.message || l.page) && (
                <div className="border-t border-line px-5 py-4 text-sm">
                  {l.message && (
                    <p className="rounded-lg bg-surface-2 p-3 leading-relaxed whitespace-pre-line">
                      {l.message}
                    </p>
                  )}
                  {l.page && (
                    <p className="mt-2 text-xs text-muted">From: {l.page}</p>
                  )}
                </div>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
