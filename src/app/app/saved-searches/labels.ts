export const LEVEL_OPTIONS = [
  { value: "federal", label: "Federal" },
  { value: "state", label: "State" },
  { value: "county", label: "County" },
  { value: "city", label: "City" },
  { value: "institution", label: "Institution" },
] as const;

export const TYPE_OPTIONS = [
  { value: "active_bid", label: "Active bid" },
  { value: "upcoming", label: "Upcoming" },
  { value: "rfi", label: "RFI" },
  { value: "sources_sought", label: "Sources sought" },
  { value: "presolicitation", label: "Presolicitation" },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "manual", label: "Manual" },
] as const;

export function levelLabel(value: string | null | undefined): string {
  return (
    LEVEL_OPTIONS.find((o) => o.value === value)?.label ?? value ?? "Federal"
  );
}

export function typeLabel(value: string | null | undefined): string {
  return TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value ?? "";
}

export function frequencyLabel(value: string | null | undefined): string {
  return (
    FREQUENCY_OPTIONS.find((o) => o.value === value)?.label ?? value ?? "Daily"
  );
}

export type SavedSearchRow = {
  id: string;
  name: string;
  keywords: string | null;
  levels: string[];
  types: string[];
  state: string | null;
  city: string | null;
  set_asides: string[];
  frequency: string;
  last_run_at: string | null;
  is_active: boolean;
};
