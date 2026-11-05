/** Shared proposal section titles, in display order. */

export const PROPOSAL_SECTION_TITLES = [
  "Cover Letter",
  "Company Overview",
  "Technical Approach",
  "Past Performance",
  "Pricing Narrative",
  "Certifications and Compliance",
] as const;

export const SEEDER_NOTE =
  "Starter item. Verify against the official solicitation before relying on it.";

export const STARTER_COMPLIANCE_ITEMS: string[] = [
  "Certificate of Insurance",
  "SF-1449 or equivalent bid form",
  "W-9",
  "Bid bond",
  "Representations and certifications",
  "Past performance references",
  "Technical approach narrative",
  "Price schedule",
];

export const COMPLIANCE_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "met", label: "Met" },
  { value: "waived", label: "Waived" },
] as const;

export function complianceStatusLabel(status: string): string {
  return (
    COMPLIANCE_STATUSES.find((s) => s.value === status)?.label ?? status
  );
}

export function complianceStatusPillClass(status: string): string {
  switch (status) {
    case "met":
      return "pill-active";
    case "waived":
      return "pill-muted";
    default:
      return "pill-warn";
  }
}
