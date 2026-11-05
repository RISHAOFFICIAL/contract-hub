export const VAULT_STATUSES = [
  { value: "have", label: "Have" },
  { value: "need", label: "Need" },
  { value: "expired", label: "Expired" },
] as const;

export function vaultStatusLabel(status: string): string {
  return VAULT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function vaultStatusPillClass(status: string): string {
  switch (status) {
    case "have":
      return "pill-active";
    case "need":
      return "pill-warn";
    case "expired":
      return "pill-bad";
    default:
      return "pill-muted";
  }
}
