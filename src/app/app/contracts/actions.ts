"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { getPlanAccess } from "@/lib/billing";
import { STAGES } from "./stages";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

async function requireBusinessId(): Promise<string> {
  const businessId = await getBusinessId();
  if (!businessId) redirect("/app");
  return businessId;
}

export async function createContract(formData: FormData) {
  const businessId = await requireBusinessId();

  // Free tracks up to 3 contracts. Pro and early members are unlimited.
  const access = await getPlanAccess();
  if (!access.canTrackMore) {
    redirect("/app/contracts?limit=reached");
  }

  const supabase = await createClient();

  const value = str(formData.get("contract_value"));
  const deadline = str(formData.get("deadline"));

  await supabase.from("contracts").insert({
    business_id: businessId,
    title: str(formData.get("title")) ?? "Untitled contract",
    buyer: str(formData.get("buyer")),
    buyer_type: str(formData.get("buyer_type")),
    stage: str(formData.get("stage")) ?? "watching",
    contract_value: value === null ? null : Number(value),
    deadline: deadline ? new Date(deadline).toISOString() : null,
    solicitation_number: str(formData.get("solicitation_number")),
    source_url: str(formData.get("source_url")),
    naics: str(formData.get("naics")),
    set_aside: str(formData.get("set_aside")),
    description: str(formData.get("description")),
    notes: str(formData.get("notes")),
  });

  revalidatePath("/app/contracts");
  redirect("/app/contracts");
}

export async function updateContract(id: string, formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  const value = str(formData.get("contract_value"));
  const deadline = str(formData.get("deadline"));

  await supabase
    .from("contracts")
    .update({
      title: str(formData.get("title")) ?? "Untitled contract",
      buyer: str(formData.get("buyer")),
      buyer_type: str(formData.get("buyer_type")),
      stage: str(formData.get("stage")) ?? "watching",
      contract_value: value === null ? null : Number(value),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      solicitation_number: str(formData.get("solicitation_number")),
      source_url: str(formData.get("source_url")),
      naics: str(formData.get("naics")),
      set_aside: str(formData.get("set_aside")),
      description: str(formData.get("description")),
      notes: str(formData.get("notes")),
    })
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/contracts");
  revalidatePath(`/app/contracts/${id}`);
  redirect(`/app/contracts/${id}`);
}

export async function deleteContract(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("contracts")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/contracts");
  redirect("/app/contracts");
}

/** Moves a contract to an explicit stage. */
export async function moveContractStage(id: string, stage: string) {
  if (!STAGES.some((s) => s.value === stage)) return;
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("contracts")
    .update({ stage })
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/contracts");
  revalidatePath(`/app/contracts/${id}`);
}
