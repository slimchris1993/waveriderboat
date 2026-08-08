// Storage layer with two drivers:
//  - Supabase (Postgres) when SUPABASE_URL + SUPABASE_SECRET_KEY are
//    set — used in production on Vercel, where the filesystem is ephemeral.
//    Single table `store` (bucket, key, value jsonb) — see supabase/schema.sql.
//  - Local JSON files under data/ otherwise — used in dev, zero setup.
// Server-only: the secret key must never reach the client bundle.
//
// Resilience contract: READS never throw. A misconfigured or unmigrated
// database must not take down checkout, the storefront or the admin login —
// callers fall back to committed defaults instead. WRITES do throw, so the
// admin panel can report a failed save and the order route can fall back to
// email-only capture.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Prefer the new revocable secret key (sb_secret_…, Dashboard → API Keys);
// the legacy service_role JWT still works as a fallback during migration.
const supabaseKey = () =>
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const useSupabase = () => !!process.env.SUPABASE_URL && !!supabaseKey();

let _client: import("@supabase/supabase-js").SupabaseClient | null = null;
async function supabase() {
  if (!_client) {
    const { createClient } = await import("@supabase/supabase-js");
    _client = createClient(process.env.SUPABASE_URL!, supabaseKey(), {
      auth: { persistSession: false },
    });
  }
  return _client;
}

const TABLE = "store";
const KV_BUCKET = "kv";

/** Last storage error, surfaced by /api/health so misconfig is diagnosable. */
let lastError: string | null = null;
export function storageStatus() {
  return {
    driver: useSupabase() ? "supabase" : "file",
    supabaseUrlSet: !!process.env.SUPABASE_URL,
    supabaseKeySet: !!supabaseKey(),
    keyKind: process.env.SUPABASE_SECRET_KEY
      ? "secret"
      : process.env.SUPABASE_SERVICE_ROLE_KEY
        ? "service_role (legacy)"
        : "none",
    lastError,
  };
}

function note(op: string, error: { message?: string } | unknown): void {
  const msg = (error as { message?: string })?.message ?? String(error);
  lastError = `${op}: ${msg}`;
  console.error(
    `[storage] ${op} failed: ${msg} — has supabase/schema.sql been run on this project?`
  );
}

/* ── local file driver ── */

const fileFor = (key: string) =>
  path.join(process.cwd(), "data", `${key.replace(/[^a-z0-9-]/gi, "_")}.json`);

export function fsRead<T>(key: string): T | null {
  try {
    return JSON.parse(readFileSync(fileFor(key), "utf8")) as T;
  } catch {
    return null;
  }
}

function fsWrite(key: string, value: unknown): void {
  mkdirSync(path.dirname(fileFor(key)), { recursive: true });
  writeFileSync(fileFor(key), JSON.stringify(value, null, 1));
}

/* ── single JSON documents (settings, admin auth) ── */

export async function kvGet<T>(key: string): Promise<T | null> {
  if (useSupabase()) {
    try {
      const db = await supabase();
      const { data, error } = await db
        .from(TABLE)
        .select("value")
        .eq("bucket", KV_BUCKET)
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return (data?.value as T) ?? null;
    } catch (e) {
      note(`get ${key}`, e);
      return fsRead<T>(key); // committed defaults keep the site up
    }
  }
  return fsRead<T>(key);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  if (useSupabase()) {
    const db = await supabase();
    const { error } = await db
      .from(TABLE)
      .upsert({ bucket: KV_BUCKET, key, value }, { onConflict: "bucket,key" });
    if (error) {
      note(`set ${key}`, error);
      throw new Error(
        `Could not save to the database (${error.message}). Run supabase/schema.sql on this project.`
      );
    }
    return;
  }
  fsWrite(key, value);
}

/* ── hash maps (orders by id, leads by id) ── */

export async function hashGetAll<T>(hash: string): Promise<Record<string, T>> {
  if (useSupabase()) {
    try {
      const db = await supabase();
      const { data, error } = await db
        .from(TABLE)
        .select("key,value")
        .eq("bucket", hash);
      if (error) throw error;
      const map: Record<string, T> = {};
      for (const row of data ?? []) map[row.key as string] = row.value as T;
      return map;
    } catch (e) {
      note(`list ${hash}`, e);
      return fsRead<Record<string, T>>(hash) ?? {};
    }
  }
  return fsRead<Record<string, T>>(hash) ?? {};
}

export async function hashSet(hash: string, field: string, value: unknown): Promise<void> {
  if (useSupabase()) {
    const db = await supabase();
    const { error } = await db
      .from(TABLE)
      .upsert({ bucket: hash, key: field, value }, { onConflict: "bucket,key" });
    if (error) {
      note(`set ${hash}/${field}`, error);
      throw new Error(
        `Could not save to the database (${error.message}). Run supabase/schema.sql on this project.`
      );
    }
    return;
  }
  const map = await hashGetAll<unknown>(hash);
  map[field] = value;
  fsWrite(hash, map);
}

/**
 * Read+write round-trip used by /api/health. A plain select is used rather
 * than a HEAD/count request, because PostgREST returns an empty error body
 * for HEAD requests — which reports as a failure with no explanation.
 */
export async function storagePing(): Promise<{
  ok: boolean;
  canRead: boolean;
  canWrite: boolean;
  error?: string;
}> {
  if (!useSupabase()) return { ok: true, canRead: true, canWrite: true };
  const db = await supabase();
  let canRead = false;
  let canWrite = false;
  let error: string | undefined;

  const read = await db.from(TABLE).select("key").limit(1);
  if (read.error) error = `read: ${read.error.message || read.error.code || "unknown"}`;
  else canRead = true;

  const write = await db
    .from(TABLE)
    .upsert(
      { bucket: "health", key: "ping", value: { at: new Date().toISOString() } },
      { onConflict: "bucket,key" }
    );
  if (write.error) {
    error = [error, `write: ${write.error.message || write.error.code || "unknown"}`]
      .filter(Boolean)
      .join(" | ");
  } else canWrite = true;

  return { ok: canRead && canWrite, canRead, canWrite, error };
}
