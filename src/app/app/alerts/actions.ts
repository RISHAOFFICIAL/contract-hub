"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";

async function requireBusinessId(): Promise<string> {
  const businessId = await getBusinessId();
  if (!businessId) redirect("/app");
  return businessId;
}

export async function markAlertRead(id: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();
  await supabase
    .from("alerts")
    .update({ is_read: true })
    .eq("id", id)
    .eq("business_id", businessId);
  revalidatePath("/app/alerts");
}

export async function markAllAlertsRead() {
  const businessId = await requireBusinessId();
  const supabase = await createClient();
  await supabase
    .from("alerts")
    .update({ is_read: true })
    .eq("business_id", businessId)
    .eq("is_read", false);
  revalidatePath("/app/alerts");
}
