"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

async function requireBusinessId(): Promise<string> {
  const businessId = await getBusinessId();
  if (!businessId) redirect("/app");
  return businessId;
}

function adFields(formData: FormData) {
  return {
    headline: str(formData.get("headline")) ?? "Untitled ad",
    body: str(formData.get("body")),
    category: str(formData.get("category")) ?? "Other",
    state: str(formData.get("state")),
    city: str(formData.get("city")),
    cta_text: str(formData.get("cta_text")),
    cta_url: str(formData.get("cta_url")),
    package: str(formData.get("package")) ?? "starter",
  };
}

export async function createAd(formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase.from("ads").insert({
    business_id: businessId,
    ...adFields(formData),
    status: "draft",
  });

  revalidatePath("/app/ads");
  redirect("/app/ads?tab=my");
}

export async function updateAd(id: string, formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("ads")
    .update(adFields(formData))
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/ads");
  redirect("/app/ads?tab=my");
}

export async function deleteAd(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("ads")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/ads");
  redirect("/app/ads?tab=my");
}

export async function duplicateAd(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("ads")
    .select(
      "headline, body, category, state, city, cta_text, cta_url, package"
    )
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();

  if (data) {
    await supabase.from("ads").insert({
      business_id: businessId,
      ...data,
      headline: `${data.headline} (copy)`,
      status: "draft",
    });
  }

  revalidatePath("/app/ads");
}

export async function submitForReview(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("ads")
    .update({ status: "pending_review" })
    .eq("id", id)
    .eq("business_id", businessId)
    .eq("status", "draft");

  revalidatePath("/app/ads");
}

export async function approveToLive(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);

  await supabase
    .from("ads")
    .update({
      status: "live",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .eq("id", id)
    .eq("business_id", businessId)
    .in("status", ["draft", "pending_review", "paused"]);

  revalidatePath("/app/ads");
}

export async function pauseAd(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("ads")
    .update({ status: "paused" })
    .eq("id", id)
    .eq("business_id", businessId)
    .eq("status", "live");

  revalidatePath("/app/ads");
}

export async function resumeAd(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("ads")
    .update({ status: "live" })
    .eq("id", id)
    .eq("business_id", businessId)
    .eq("status", "paused");

  revalidatePath("/app/ads");
}

export async function reportAd(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  const { data } = await supabase
    .from("ads")
    .select("report_count")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();

  await supabase
    .from("ads")
    .update({ report_count: (data?.report_count ?? 0) + 1 })
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/ads");
}
