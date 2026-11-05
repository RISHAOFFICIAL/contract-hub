export const PROGRAMS = [
  { value: "wosb", label: "WOSB" },
  { value: "edwosb", label: "EDWOSB" },
  { value: "hubzone", label: "HUBZone" },
  { value: "dbe", label: "DBE" },
  { value: "mbe", label: "MBE" },
  { value: "dbb", label: "DBB" },
  { value: "other", label: "Other" },
] as const;

export const CERT_STATUSES = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "expired", label: "Expired" },
] as const;

export function programLabel(program: string): string {
  return PROGRAMS.find((p) => p.value === program)?.label ?? program;
}

export function certStatusLabel(status: string): string {
  return CERT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function certStatusPillClass(status: string): string {
  switch (status) {
    case "approved":
      return "pill-active";
    case "in_progress":
      return "pill-warn";
    case "denied":
    case "expired":
      return "pill-bad";
    default:
      return "pill-muted";
  }
}

export type CertificationRow = {
  id: string;
  name: string;
  program: string;
  status: string;
  applied_date: string | null;
  approved_date: string | null;
  expiry_date: string | null;
  cert_number: string | null;
  notes: string | null;
};
