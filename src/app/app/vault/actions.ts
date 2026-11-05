"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { VAULT_STATUSES } from "./labels";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

async function requireBusinessId(): Promise<string> {
  const businessId = await getBusinessId();
  if (!businessId) redirect("/app");
  return businessId;
}

function payload(formData: FormData) {
  return {
    name: str(formData.get("name")) ?? "Untitled document",
    category: str(formData.get("category")),
    status: str(formData.get("status")) ?? "need",
    expiry_date: str(formData.get("expiry_date")),
    notes: str(formData.get("notes")),
  };
}

export async function createVaultDocument(formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("vault_documents")
    .insert({ business_id: businessId, ...payload(formData) });

  revalidatePath("/app/vault");
  redirect("/app/vault");
}

export async function updateVaultDocument(id: string, formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("vault_documents")
    .update(payload(formData))
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/vault");
  redirect("/app/vault");
}

export async function deleteVaultDocument(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("vault_documents")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/vault");
  redirect("/app/vault");
}

/** Quick toggle for the checklist status. */
export async function setVaultStatus(id: string, status: string) {
  if (!VAULT_STATUSES.some((s) => s.value === status)) return;
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("vault_documents")
    .update({ status })
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/vault");
}

export type VaultRow = {
  id: string;
  name: string;
  category: string | null;
  status: string;
  expiry_date: string | null;
  notes: string | null;
};
