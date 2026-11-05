export const LEVELS = [
  { value: "federal", label: "Federal" },
  { value: "state", label: "State" },
  { value: "county", label: "County" },
  { value: "city", label: "City" },
  { value: "institution", label: "Institution" },
] as const;

export const REG_STATUSES = [
  { value: "active", label: "Active" },
  { value: "in_progress", label: "In progress" },
  { value: "not_started", label: "Not started" },
  { value: "inactive", label: "Inactive" },
  { value: "expired", label: "Expired" },
] as const;

export function levelLabel(level: string): string {
  return LEVELS.find((l) => l.value === level)?.label ?? level;
}

export function regStatusLabel(status: string): string {
  return REG_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function regStatusPillClass(status: string): string {
  switch (status) {
    case "active":
      return "pill-active";
    case "in_progress":
      return "pill-warn";
    case "inactive":
    case "expired":
      return "pill-bad";
    default:
      return "pill-muted";
  }
}

export type RegistrationRow = {
  id: string;
  name: string;
  level: string;
  status: string;
  registration_number: string | null;
  uei: string | null;
  cage: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  renewal_reminder_days: number[] | null;
  notes: string | null;
};
