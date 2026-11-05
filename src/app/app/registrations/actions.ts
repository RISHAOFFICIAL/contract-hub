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

function payload(formData: FormData) {
  return {
    name: str(formData.get("name")) ?? "Untitled registration",
    level: str(formData.get("level")) ?? "federal",
    status: str(formData.get("status")) ?? "not_started",
    registration_number: str(formData.get("registration_number")),
    uei: str(formData.get("uei")),
    cage: str(formData.get("cage")),
    issued_date: str(formData.get("issued_date")),
    expiry_date: str(formData.get("expiry_date")),
    notes: str(formData.get("notes")),
  };
}

export async function createRegistration(formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("registrations")
    .insert({ business_id: businessId, ...payload(formData) });

  revalidatePath("/app/registrations");
  revalidatePath("/app");
  redirect("/app/registrations");
}

export async function updateRegistration(id: string, formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("registrations")
    .update(payload(formData))
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/registrations");
  revalidatePath("/app");
  redirect("/app/registrations");
}

export async function deleteRegistration(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("registrations")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/registrations");
  revalidatePath("/app");
  redirect("/app/registrations");
}
