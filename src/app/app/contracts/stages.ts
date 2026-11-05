export const STAGES = [
  { value: "watching", label: "Watching" },
  { value: "preparing", label: "Preparing" },
  { value: "submitted", label: "Submitted" },
  { value: "awarded", label: "Awarded" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "closed_out", label: "Closed Out" },
  { value: "lost", label: "Lost" },
] as const;

export type StageValue = (typeof STAGES)[number]["value"];

export function stageLabel(stage: string): string {
  return STAGES.find((s) => s.value === stage)?.label ?? stage;
}

/** Pill style per stage. */
export function stagePillClass(stage: string): string {
  switch (stage) {
    case "awarded":
    case "in_progress":
    case "completed":
    case "closed_out":
      return "pill-active";
    case "submitted":
      return "pill-warn";
    case "lost":
      return "pill-bad";
    default:
      return "pill-muted";
  }
}

export type ContractRow = {
  id: string;
  title: string;
  buyer: string | null;
  buyer_type: string | null;
  stage: string;
  contract_value: string | number | null;
  deadline: string | null;
  solicitation_number: string | null;
  source_url: string | null;
  naics: string | null;
  set_aside: string | null;
  description: string | null;
  notes: string | null;
};
