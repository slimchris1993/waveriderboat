// Build the server-side price catalog by scanning the static pages for
// RWCart.add({...}) calls (buttons and addToCart functions). Output:
// catalog/products.json — the orders API re-prices carts against it.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "public");
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    const s = statSync(p);
    if (s.isDirectory() && f !== "images") walk(p);
    else if (f.endsWith(".html")) files.push(p);
  }
})(ROOT);

const RE =
  /RWCart\.add\(\{\s*id:\s*['"]([^'"]+)['"]\s*,\s*name:\s*['"]([^'"]+)['"]\s*,\s*cat:\s*['"]([^'"]+)['"]\s*,\s*price:\s*([\d.]+)\s*,\s*image:\s*['"]([^'"]+)['"]/g;

const byId = new Map();
const conflicts = [];
for (const f of files) {
  const c = readFileSync(f, "utf8");
  for (const m of c.matchAll(RE)) {
    const [, id, name, cat, priceRaw, image] = m;
    const price = Number(priceRaw);
    const existing = byId.get(id);
    if (existing) {
      if (existing.price !== price)
        conflicts.push(`${id}: ${existing.price} vs ${price} (${path.relative(ROOT, f)})`);
      continue;
    }
    byId.set(id, { id, name, cat, price, image });
  }
}

const products = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
mkdirSync(path.join(process.cwd(), "catalog"), { recursive: true });
writeFileSync(
  path.join(process.cwd(), "catalog", "products.json"),
  JSON.stringify(products, null, 1)
);
console.log(`catalog: ${products.length} products from ${files.length} pages`);
if (conflicts.length) {
  console.warn("PRICE CONFLICTS (first value kept):");
  conflicts.forEach((c) => console.warn("  " + c));
}
