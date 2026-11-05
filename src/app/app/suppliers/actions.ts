"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { OUTREACH_ORDER } from "./labels";

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
  const categoriesRaw = str(formData.get("categories"));
  const categories = categoriesRaw
    ? categoriesRaw
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    : [];
  return {
    name: str(formData.get("name")) ?? "Untitled supplier",
    contact_name: str(formData.get("contact_name")),
    email: str(formData.get("email")),
    phone: str(formData.get("phone")),
    categories,
    outreach_status: str(formData.get("outreach_status")) ?? "to_contact",
    notes: str(formData.get("notes")),
  };
}

export async function createSupplier(formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("suppliers")
    .insert({ business_id: businessId, ...payload(formData) });

  revalidatePath("/app/suppliers");
  revalidatePath("/app");
  redirect("/app/suppliers");
}

export async function updateSupplier(id: string, formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("suppliers")
    .update(payload(formData))
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/suppliers");
  revalidatePath("/app");
  redirect("/app/suppliers");
}

export async function deleteSupplier(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("suppliers")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/suppliers");
  revalidatePath("/app");
  redirect("/app/suppliers");
}

/** Sets the outreach status directly (quick advance button). */
export async function setOutreachStatus(id: string, status: string) {
  if (!OUTREACH_ORDER.includes(status as (typeof OUTREACH_ORDER)[number]))
    return;
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("suppliers")
    .update({ outreach_status: status })
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/suppliers");
}
