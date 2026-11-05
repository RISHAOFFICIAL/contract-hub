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
    name: str(formData.get("name")) ?? "Untitled certification",
    program: str(formData.get("program")) ?? "other",
    status: str(formData.get("status")) ?? "not_started",
    applied_date: str(formData.get("applied_date")),
    approved_date: str(formData.get("approved_date")),
    expiry_date: str(formData.get("expiry_date")),
    cert_number: str(formData.get("cert_number")),
    notes: str(formData.get("notes")),
  };
}

export async function createCertification(formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("certifications")
    .insert({ business_id: businessId, ...payload(formData) });

  revalidatePath("/app/certifications");
  revalidatePath("/app");
  redirect("/app/certifications");
}

export async function updateCertification(id: string, formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("certifications")
    .update(payload(formData))
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/certifications");
  revalidatePath("/app");
  redirect("/app/certifications");
}

export async function deleteCertification(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("certifications")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/certifications");
  revalidatePath("/app");
  redirect("/app/certifications");
}
