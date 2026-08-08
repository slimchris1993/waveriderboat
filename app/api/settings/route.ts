import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

// Public, cache-lightly: the static pages fetch this on load to hydrate
// the WhatsApp links and footer social icons. Payment details stay private.
export async function GET() {
  const s = await getSettings();
  return NextResponse.json(
    { whatsapp: s.whatsapp, socials: s.socials },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}
