import { NextResponse } from "next/server";
import { addLead, newLeadId, type Lead, type LeadType } from "@/lib/leads";
import { leadOwnerHtml, leadWelcomeHtml, sendMail, OWNER } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPES: LeadType[] = ["popup", "chat", "contact"];

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const type = TYPES.includes(body.type as LeadType) ? (body.type as LeadType) : "contact";
  const email = String(body.email ?? "").trim().slice(0, 160);
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const lead: Lead = {
    id: newLeadId(),
    createdAt: new Date().toISOString(),
    type,
    name: String(body.name ?? "").trim().slice(0, 120),
    email,
    message: body.message ? String(body.message).slice(0, 4000) : undefined,
    page: body.page ? String(body.page).slice(0, 300) : undefined,
  };

  await addLead(lead);

  // Popup leads get the $500 welcome code by email; every lead notifies
  // the owner, with Reply-To pointed at the lead.
  if (type === "popup") {
    void sendMail({
      to: lead.email,
      subject: "Your WAVERIDER $500 code",
      html: leadWelcomeHtml(lead),
    });
  }
  void sendMail({
    to: OWNER(),
    subject:
      type === "popup"
        ? `New $500 popup lead: ${lead.name || lead.email}`
        : type === "chat"
          ? `New chat lead: ${lead.name || lead.email}`
          : `New contact form message: ${lead.name || lead.email}`,
    html: leadOwnerHtml(lead),
    replyTo: lead.email,
  });

  return NextResponse.json({ ok: true });
}
