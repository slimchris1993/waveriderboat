import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// The storefront is the static site in public/ — Next only owns /checkout,
// /admin and /api. Clean URLs are generated from the actual files rather
// than pattern-matched, so there is no chance of a rewrite shadowing a real
// Next route (/checkout is a page, not a static file).
const PUBLIC_DIR = path.join(process.cwd(), "public");
// Served by Next itself — never rewrite these to a static file.
const NEXT_ROUTES = new Set(["/checkout", "/admin"]);

function staticPages(): string[] {
  const out: string[] = [];
  (function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry !== "images") walk(full);
      } else if (entry.endsWith(".html")) {
        out.push("/" + path.relative(PUBLIC_DIR, full).split(path.sep).join("/"));
      }
    }
  })(PUBLIC_DIR);
  return out;
}

/** "/products/f2.html" → "/products/f2"; "/index.html" → "/" */
const cleanOf = (file: string) =>
  file === "/index.html" ? "/" : file.replace(/\.html$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return staticPages()
      .map((file) => ({ clean: cleanOf(file), file }))
      .filter(({ clean }) => !NEXT_ROUTES.has(clean))
      .map(({ clean, file }) => ({ source: clean, destination: file }));
  },
  async redirects() {
    // Old .html URLs (and anything already indexed) move to the clean form.
    return staticPages().map((file) => ({
      source: file,
      destination: cleanOf(file),
      permanent: true,
    }));
  },
};

export default nextConfig;
