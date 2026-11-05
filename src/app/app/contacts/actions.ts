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
    name: str(formData.get("name")) ?? "Untitled contact",
    role: str(formData.get("role")),
    organization: str(formData.get("organization")),
    email: str(formData.get("email")),
    phone: str(formData.get("phone")),
    notes: str(formData.get("notes")),
  };
}

export async function createContact(formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("contacts")
    .insert({ business_id: businessId, ...payload(formData) });

  revalidatePath("/app/contacts");
  redirect("/app/contacts");
}

export async function updateContact(id: string, formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("contacts")
    .update(payload(formData))
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/contacts");
  redirect("/app/contacts");
}

export async function deleteContact(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  revalidatePath("/app/contacts");
  redirect("/app/contacts");
}

export type ContactRow = {
  id: string;
  name: string;
  role: string | null;
  organization: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};
