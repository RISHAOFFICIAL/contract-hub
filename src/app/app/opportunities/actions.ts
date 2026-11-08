"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { getPlanAccess } from "@/lib/billing";
import { runScanForSearch } from "@/lib/scan";

async function requireBusinessId(): Promise<string> {
  const businessId = await getBusinessId();
  if (!businessId) redirect("/app");
  return businessId;
}

type SearchRow = {
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

/** Run every active saved search, then come back to the inbox. */
export async function scanAllActive() {
  const businessId = await requireBusinessId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true);
  const searches = (data ?? []) as SearchRow[];
  for (const s of searches) {
    await runScanForSearch(supabase, businessId, {
      id: s.id,
      name: s.name,
      keywords: s.keywords,
    });
  }
  revalidatePath("/app/opportunities");
  revalidatePath("/app/alerts");
}

/** One-off scan from the keyword prompt when no saved search exists. */
export async function scanWithKeywords(formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();
  const keywords = (formData.get("keywords") ?? "").toString().trim();
  if (!keywords) redirect("/app/opportunities");
  await runScanForSearch(supabase, businessId, { keywords });
  revalidatePath("/app/opportunities");
  revalidatePath("/app/alerts");
}

/** Move an opportunity into the pipeline as a contract at the watching stage. */
export async function trackOpportunity(id: string) {
  const businessId = await requireBusinessId();

  // Free tracks up to 3 contracts. Pro and early members are unlimited.
  const access = await getPlanAccess();
  if (!access.canTrackMore) {
    redirect("/app/opportunities?limit=reached");
  }

  const supabase = await createClient();
  const { data: opp } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();
  if (!opp) redirect("/app/opportunities");

  const raw = (opp.raw_data ?? {}) as { description?: string | null };
  await supabase.from("contracts").insert({
    business_id: businessId,
    title: opp.title,
    buyer: opp.buyer,
    stage: "watching",
    deadline: opp.deadline,
    solicitation_number: opp.solicitation_number,
    source_url: opp.source_url,
    naics: opp.naics,
    set_aside: opp.set_aside,
    description: raw.description ?? null,
    notes: `Tracked from ${opp.source_name ?? "a scan"}${
      opp.match_reason ? `; match: ${opp.match_reason}` : ""
    }`,
  });
  await supabase
    .from("opportunities")
    .update({ status: "tracked" })
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/opportunities");
  revalidatePath("/app/contracts");
}

/** Hide an opportunity from the inbox. */
export async function dismissOpportunity(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();
  await supabase
    .from("opportunities")
    .update({ status: "dismissed" })
    .eq("id", id)
    .eq("business_id", businessId);
  revalidatePath("/app/opportunities");
}
