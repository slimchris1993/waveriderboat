import { hashGetAll, hashSet } from "@/lib/storage";

export type LeadType = "popup" | "chat" | "contact";

export type Lead = {
  id: string;
  createdAt: string;
  type: LeadType;
  name: string;
  email: string;
  /** chat transcript or form message */
  message?: string;
  /** page the lead came from */
  page?: string;
};

const HASH = "leads";

export async function readLeads(): Promise<Lead[]> {
  const map = await hashGetAll<Lead>(HASH);
  return Object.values(map).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addLead(lead: Lead): Promise<void> {
  await hashSet(HASH, lead.id, lead);
}

export function newLeadId(): string {
  return `L-${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .toUpperCase()
    .slice(2, 5)}`;
}
