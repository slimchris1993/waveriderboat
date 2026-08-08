// Storage layer with two drivers:
//  - Supabase (Postgres) when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are
//    set — used in production on Vercel, where the filesystem is ephemeral.
//    Single table `store` (bucket, key, value jsonb) — see supabase/schema.sql.
//  - Local JSON files under data/ otherwise — used in dev, zero setup.
// Server-only: the service-role key must never reach the client bundle.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const useSupabase = () =>
  !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

let _client: import("@supabase/supabase-js").SupabaseClient | null = null;
async function supabase() {
  if (!_client) {
    const { createClient } = await import("@supabase/supabase-js");
    _client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _client;
}

const TABLE = "store";
const KV_BUCKET = "kv";

function fail(op: string, error: { message?: string } | null): never {
  throw new Error(
    `Supabase ${op} failed: ${error?.message ?? "unknown"} — has supabase/schema.sql been run?`
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
    const db = await supabase();
    const { data, error } = await db
      .from(TABLE)
      .select("value")
      .eq("bucket", KV_BUCKET)
      .eq("key", key)
      .maybeSingle();
    if (error) fail(`get ${key}`, error);
    return (data?.value as T) ?? null;
  }
  return fsRead<T>(key);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  if (useSupabase()) {
    const db = await supabase();
    const { error } = await db
      .from(TABLE)
      .upsert({ bucket: KV_BUCKET, key, value }, { onConflict: "bucket,key" });
    if (error) fail(`set ${key}`, error);
    return;
  }
  fsWrite(key, value);
}

/* ── hash maps (orders by id, leads by id) ── */

export async function hashGetAll<T>(hash: string): Promise<Record<string, T>> {
  if (useSupabase()) {
    const db = await supabase();
    const { data, error } = await db
      .from(TABLE)
      .select("key,value")
      .eq("bucket", hash);
    if (error) fail(`list ${hash}`, error);
    const map: Record<string, T> = {};
    for (const row of data ?? []) map[row.key as string] = row.value as T;
    return map;
  }
  return fsRead<Record<string, T>>(hash) ?? {};
}

export async function hashSet(hash: string, field: string, value: unknown): Promise<void> {
  if (useSupabase()) {
    const db = await supabase();
    const { error } = await db
      .from(TABLE)
      .upsert({ bucket: hash, key: field, value }, { onConflict: "bucket,key" });
    if (error) fail(`set ${hash}/${field}`, error);
    return;
  }
  const map = await hashGetAll<unknown>(hash);
  map[field] = value;
  fsWrite(hash, map);
}
