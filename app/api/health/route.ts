import { NextResponse } from "next/server";
import { storagePing, storageStatus } from "@/lib/storage";
import { getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Deployment self-check. Reports configuration health without leaking any
// secret values — visit /api/health after a deploy to see what is missing.
export async function GET() {
  const ping = await storagePing();
  const status = storageStatus();

  const checks = {
    storage: {
      ...status,
      tableReachable: ping.ok,
      canRead: ping.canRead,
      canWrite: ping.canWrite,
      error: ping.error,
      hint: ping.ok
        ? undefined
        : "Run supabase/schema.sql in the Supabase SQL editor, and check SUPABASE_SECRET_KEY.",
    },
    email: {
      resendKeySet: !!process.env.RESEND_API_KEY,
      from: process.env.MAIL_FROM || "(default no-reply@waveriderboat.com)",
      ownerSet: !!process.env.MAIL_OWNER,
      replyToSet: !!(process.env.MAIL_REPLY_TO || process.env.MAIL_OWNER),
      hint:
        process.env.RESEND_API_KEY && process.env.MAIL_OWNER
          ? undefined
          : "Set RESEND_API_KEY and MAIL_OWNER in the Vercel environment.",
    },
    admin: { passwordSet: !!process.env.ADMIN_PASSWORD },
    catalog: { products: getProducts().length },
    siteUrl: process.env.SITE_URL || "(unset)",
  };

  const ok =
    checks.storage.tableReachable &&
    checks.email.resendKeySet &&
    checks.email.ownerSet &&
    checks.admin.passwordSet &&
    checks.catalog.products > 0;

  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
