export const OUTREACH_ORDER = [
  "to_contact",
  "contacted",
  "quoted",
  "active",
] as const;

export const OUTREACH_STATUSES = [
  { value: "to_contact", label: "To contact" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "active", label: "Active" },
  { value: "declined", label: "Declined" },
] as const;

export function outreachLabel(status: string): string {
  return (
    OUTREACH_STATUSES.find((s) => s.value === status)?.label ?? status
  );
}

export function outreachPillClass(status: string): string {
  switch (status) {
    case "active":
      return "pill-active";
    case "contacted":
    case "quoted":
      return "pill-warn";
    case "declined":
      return "pill-bad";
    default:
      return "pill-muted";
  }
}

/** Next status for the quick advance button, or null when terminal. */
export function nextOutreachStatus(status: string): {
  value: string;
  label: string;
} | null {
  const idx = OUTREACH_ORDER.indexOf(
    status as (typeof OUTREACH_ORDER)[number]
  );
  if (idx === -1 || idx >= OUTREACH_ORDER.length - 1) return null;
  const next = OUTREACH_ORDER[idx + 1];
  return { value: next, label: outreachLabel(next) };
}

export type SupplierRow = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  categories: string[] | null;
  outreach_status: string;
  notes: string | null;
};
