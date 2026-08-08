import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { kvGet, kvSet } from "@/lib/storage";

const COOKIE = "wr_admin";

type AuthRecord = { salt: string; hash: string };

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

// The dashboard-set password (hashed, stored under "admin-auth") overrides
// the ADMIN_PASSWORD env var; the env var remains the bootstrap/recovery
// login (delete the admin-auth record to fall back to it).
async function readAuth(): Promise<AuthRecord | null> {
  const raw = await kvGet<AuthRecord>("admin-auth");
  if (raw && typeof raw.salt === "string" && typeof raw.hash === "string") {
    return raw;
  }
  return null;
}

export async function passwordMatches(password: string): Promise<boolean> {
  const rec = await readAuth();
  if (rec) return sha(`${rec.salt}::${password}`) === rec.hash;
  const env = process.env.ADMIN_PASSWORD || "";
  return env.length > 0 && password === env;
}

// Session token derives from the active secret, so changing the password
// invalidates every existing admin cookie automatically.
export async function adminToken(): Promise<string> {
  const rec = await readAuth();
  const material = rec ? rec.hash : process.env.ADMIN_PASSWORD || "";
  return sha(`wr-cookie::${material}`);
}

export async function setAdminPassword(newPassword: string): Promise<void> {
  const salt = randomBytes(16).toString("hex");
  await kvSet("admin-auth", { salt, hash: sha(`${salt}::${newPassword}`) });
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value === (await adminToken());
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    const { redirect } = await import("next/navigation");
    redirect("/admin/login");
  }
}

export const ADMIN_COOKIE = COOKIE;
