"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { runScanForSearch } from "@/lib/scan";
import type { SavedSearchRow } from "./labels";

async function requireBusinessId(): Promise<string> {
  const businessId = await getBusinessId();
  if (!businessId) redirect("/app");
  return businessId;
}

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

function payload(formData: FormData) {
  const setAsides = (str(formData.get("set_asides")) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    name: str(formData.get("name")) ?? "Untitled search",
    keywords: str(formData.get("keywords")),
    levels: formData.getAll("levels").map((v) => v.toString()),
    types: formData.getAll("types").map((v) => v.toString()),
    state: str(formData.get("state")),
    city: str(formData.get("city")),
    set_asides: setAsides,
    frequency: str(formData.get("frequency")) ?? "daily",
    is_active: formData.get("is_active") === "on",
  };
}

export async function createSavedSearch(formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();
  await supabase
    .from("saved_searches")
    .insert({ business_id: businessId, ...payload(formData) });
  revalidatePath("/app/saved-searches");
  redirect("/app/saved-searches");
}

export async function updateSavedSearch(id: string, formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();
  await supabase
    .from("saved_searches")
    .update(payload(formData))
    .eq("id", id)
    .eq("business_id", businessId);
  revalidatePath("/app/saved-searches");
  redirect("/app/saved-searches");
}

export async function deleteSavedSearch(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();
  await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);
  revalidatePath("/app/saved-searches");
  redirect("/app/saved-searches");
}

/** Flip the is_active flag for a saved search. */
export async function toggleSavedSearch(id: string, next: boolean) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();
  await supabase
    .from("saved_searches")
    .update({ is_active: next })
    .eq("id", id)
    .eq("business_id", businessId);
  revalidatePath("/app/saved-searches");
  revalidatePath("/app/opportunities");
}

/** Run one saved search right now, then return to the list. */
export async function runSavedSearch(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();
  const search = data as SavedSearchRow | null;
  if (!search) redirect("/app/saved-searches");
  await runScanForSearch(supabase, businessId, {
    id: search.id,
    name: search.name,
    keywords: search.keywords,
  });
  revalidatePath("/app/saved-searches");
  revalidatePath("/app/opportunities");
  redirect("/app/saved-searches");
}
