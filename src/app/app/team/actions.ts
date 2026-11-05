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

export async function addMember(formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  const role = str(formData.get("role")) ?? "member";
  if (!["admin", "member", "viewer"].includes(role)) return;

  await supabase.from("team_members").insert({
    business_id: businessId,
    name: str(formData.get("name")) ?? "Unnamed member",
    email: str(formData.get("email")),
    role,
    status: "invited",
  });

  revalidatePath("/app/team");
  redirect("/app/team");
}

export async function changeRole(id: string, formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  const role = str(formData.get("role"));
  if (!role || !["owner", "admin", "member", "viewer"].includes(role)) return;
  if (role === "owner") return; // Owner role is never granted from here.

  await supabase
    .from("team_members")
    .update({ role })
    .eq("id", id)
    .eq("business_id", businessId)
    .neq("role", "owner");

  revalidatePath("/app/team");
}

export async function removeMember(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  // Never remove an owner row.
  await supabase
    .from("team_members")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId)
    .neq("role", "owner");

  revalidatePath("/app/team");
}
