"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

/** Split a comma separated input into a clean, deduped list. */
function list(v: FormDataEntryValue | null): string[] {
  const out: string[] = [];
  for (const part of (v ?? "").toString().split(",")) {
    const item = part.trim();
    if (item !== "" && !out.includes(item)) out.push(item);
  }
  return out;
}

/** NAICS codes are digits only; keep 2 to 6 digit codes, deduped. */
function naicsList(v: FormDataEntryValue | null): string[] {
  const out: string[] = [];
  for (const part of (v ?? "").toString().split(",")) {
    const code = part.replace(/\D/g, "");
    if (code.length >= 2 && code.length <= 6 && !out.includes(code)) {
      out.push(code);
    }
  }
  return out;
}

function normalizeWebsite(v: string | null): string | null {
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export async function saveProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/app/profile");

  const businessId = await getBusinessId();
  if (!businessId) redirect("/app");

  const legalName = str(formData.get("legal_name"));
  if (!legalName) redirect("/app/profile?error=name");

  const email = str(formData.get("email"));
  if (email !== null && !email.includes("@")) {
    redirect("/app/profile?error=email");
  }

  const updates = {
    legal_name: legalName,
    dba: str(formData.get("dba")),
    email,
    phone: str(formData.get("phone")),
    city: str(formData.get("city")),
    state: str(formData.get("state")),
    country: str(formData.get("country")) ?? "United States",
    service_area: str(formData.get("service_area")),
    website: normalizeWebsite(str(formData.get("website"))),
    naics_codes: naicsList(formData.get("naics_codes")),
    product_lines: list(formData.get("product_lines")),
    service_lines: list(formData.get("service_lines")),
    certifications_summary: str(formData.get("certifications_summary")),
  };

  // Update only this user's own business row.
  await supabase
    .from("businesses")
    .update(updates)
    .eq("id", businessId)
    .eq("owner_id", user.id);

  revalidatePath("/app");
  revalidatePath("/app/profile");
  revalidatePath("/app/guide");
  revalidatePath("/app/opportunities");
  revalidatePath("/app/rewards");
  redirect("/app/profile?saved=1");
}
