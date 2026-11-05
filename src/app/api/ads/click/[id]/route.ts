import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";

/** Increments click_count on an ad, then redirects to its CTA url. */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const businessId = await getBusinessId();

  const { data } = await supabase
    .from("ads")
    .select("cta_url, click_count, business_id")
    .eq("id", params.id)
    .maybeSingle();

  const ctaUrl = data?.cta_url ?? "";
  if (!data || !ctaUrl.startsWith("http")) redirect("/app/ads");

  // Only the owning business can increment its own counter under RLS.
  if (businessId && data.business_id === businessId) {
    await supabase
      .from("ads")
      .update({ click_count: (data.click_count ?? 0) + 1 })
      .eq("id", params.id);
  }

  redirect(ctaUrl);
}
