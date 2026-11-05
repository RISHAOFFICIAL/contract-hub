import type { SupabaseClient } from "@supabase/supabase-js";

/* ---------- Badge catalog: the 13-step Bid Ready Journey ---------- */

export type BadgeDef = {
  key: string;
  title: string;
  description: string;
};

export const BADGES: BadgeDef[] = [
  {
    key: "profile_completed",
    title: "Profile completed",
    description: "Your business profile has a legal name.",
  },
  {
    key: "ein_done",
    title: "EIN obtained",
    description: "You completed the EIN foundation lesson.",
  },
  {
    key: "uei_done",
    title: "UEI obtained",
    description: "You completed the UEI and SAM registration lesson.",
  },
  {
    key: "sam_active",
    title: "SAM registration active",
    description: "A SAM registration is tracked as active.",
  },
  {
    key: "duns_bank",
    title: "DUNS and bank account set up",
    description: "You completed the DUNS and banking lesson.",
  },
  {
    key: "first_registration",
    title: "First registration tracked",
    description: "You added a registration to the tracker.",
  },
  {
    key: "first_scan",
    title: "First scan run",
    description: "You ran your first opportunity scan.",
  },
  {
    key: "first_bid",
    title: "First bid tracked",
    description: "You added a contract to the tracker.",
  },
  {
    key: "first_workbench",
    title: "First workbench started",
    description: "You opened the proposal workbench on a bid.",
  },
  {
    key: "first_cert_filed",
    title: "First certification filed",
    description: "You started or filed a certification.",
  },
  {
    key: "first_award",
    title: "First contract awarded",
    description: "One of your contracts reached an awarded stage.",
  },
  {
    key: "first_invoice_paid",
    title: "First invoice paid",
    description: "An invoice you sent was paid.",
  },
  {
    key: "closeout_done",
    title: "Closeout with past performance",
    description: "A contract was fully closed out.",
  },
];

const AWARD_STAGES = ["awarded", "in_progress", "completed", "closed_out"];

/** Checks whether a foundation lesson is completed. */
async function lessonDone(
  supabase: SupabaseClient,
  businessId: string,
  key: string
): Promise<boolean> {
  const { data } = await supabase
    .from("foundation_progress")
    .select("completed")
    .eq("business_id", businessId)
    .eq("lesson_key", key)
    .maybeSingle();
  return data?.completed === true;
}

/** True when at least one row exists in the table for this business. */
async function hasRow(
  supabase: SupabaseClient,
  table: string,
  businessId: string
): Promise<boolean> {
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);
  return (count ?? 0) > 0;
}

/** Formats the celebration date line on the rewards page. */
export function formatEarnedDate(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Evaluates all 13 badge conditions against live data, upserts any newly
 * earned badges into the badges table, and returns the badge keys that were
 * newly earned on this call.
 */
export async function evaluateBadges(
  supabase: SupabaseClient,
  businessId: string
): Promise<string[]> {
  const checks: { key: string; earned: boolean }[] = [];

  // profile_completed: businesses.legal_name set
  const { data: business } = await supabase
    .from("businesses")
    .select("legal_name")
    .eq("id", businessId)
    .maybeSingle();
  checks.push({
    key: "profile_completed",
    earned: Boolean(business?.legal_name && business.legal_name.trim() !== ""),
  });

  checks.push({
    key: "ein_done",
    earned: await lessonDone(supabase, businessId, "ein"),
  });
  checks.push({
    key: "uei_done",
    earned: await lessonDone(supabase, businessId, "uei_sam"),
  });

  // sam_active: a registration with SAM in the name and status active (case-insensitive)
  const { data: regs } = await supabase
    .from("registrations")
    .select("name, status")
    .eq("business_id", businessId);
  const samActive = (regs ?? []).some(
    (r: { name: string | null; status: string | null }) =>
      (r.name ?? "").toLowerCase().includes("sam") &&
      (r.status ?? "").toLowerCase() === "active"
  );
  checks.push({ key: "sam_active", earned: samActive });

  checks.push({
    key: "duns_bank",
    earned: await lessonDone(supabase, businessId, "duns_bank"),
  });
  checks.push({
    key: "first_registration",
    earned: await hasRow(supabase, "registrations", businessId),
  });
  checks.push({
    key: "first_scan",
    earned: await hasRow(supabase, "scan_history", businessId),
  });
  checks.push({
    key: "first_bid",
    earned: await hasRow(supabase, "contracts", businessId),
  });

  // first_workbench: a proposal section or compliance item exists for a contract
  const [sections, compliance] = await Promise.all([
    supabase
      .from("proposal_sections")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId),
    supabase
      .from("compliance_items")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId),
  ]);
  checks.push({
    key: "first_workbench",
    earned:
      (sections.count ?? 0) > 0 || (compliance.count ?? 0) > 0,
  });

  // first_cert_filed: any certification with status other than not_started
  const { count: certCount } = await supabase
    .from("certifications")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .neq("status", "not_started");
  checks.push({ key: "first_cert_filed", earned: (certCount ?? 0) > 0 });

  // first_award and closeout_done from contract stages
  const { data: contracts } = await supabase
    .from("contracts")
    .select("stage")
    .eq("business_id", businessId);
  const stages = (contracts ?? []).map((c: { stage: string | null }) =>
    (c.stage ?? "").toLowerCase()
  );
  checks.push({
    key: "first_award",
    earned: stages.some((s) => AWARD_STAGES.includes(s)),
  });
  checks.push({
    key: "closeout_done",
    earned: stages.includes("closed_out"),
  });

  checks.push({
    key: "first_invoice_paid",
    earned: await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "paid")
      .then(({ count }) => (count ?? 0) > 0),
  });

  const newlyEarned: string[] = [];
  for (const check of checks) {
    if (!check.earned) continue;
    const { data: existing } = await supabase
      .from("badges")
      .select("id")
      .eq("business_id", businessId)
      .eq("badge_key", check.key)
      .maybeSingle();
    if (!existing) {
      const { error } = await supabase.from("badges").insert({
        business_id: businessId,
        badge_key: check.key,
      });
      if (!error) newlyEarned.push(check.key);
    }
  }
  return newlyEarned;
}

/** Returns the earned badge rows keyed by badge_key. */
export async function getEarnedBadges(
  supabase: SupabaseClient,
  businessId: string
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("badges")
    .select("badge_key, earned_at")
    .eq("business_id", businessId);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.badge_key, row.earned_at);
  }
  return map;
}
