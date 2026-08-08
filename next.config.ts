import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The storefront is the static site in public/ — Next only owns
  // /checkout, /admin and /api. Root must serve public/index.html.
  async rewrites() {
    return [{ source: "/", destination: "/index.html" }];
  },
};

export default nextConfig;
