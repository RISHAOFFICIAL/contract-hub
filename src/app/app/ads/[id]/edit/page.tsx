import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import AdForm from "../../ad-form";
import { updateAd } from "../../actions";
import type { AdRow } from "../../page";

export default async function EditAdPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) notFound();

  const { data } = await supabase
    .from("ads")
    .select(
      "id, headline, body, category, state, city, cta_text, cta_url, package, status, starts_at, ends_at, click_count, report_count"
    )
    .eq("id", params.id)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data) notFound();
  const ad = data as AdRow;

  return (
    <AdForm
      ad={ad}
      action={updateAd.bind(null, ad.id)}
      submitLabel="Save changes"
    />
  );
}
