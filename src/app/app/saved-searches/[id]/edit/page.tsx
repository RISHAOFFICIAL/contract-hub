import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import SavedSearchForm from "../../search-form";
import { updateSavedSearch } from "../../actions";
import type { SavedSearchRow } from "../../labels";

export default async function EditSavedSearchPage({
  params,
}: {
  params: { id: string };
}) {
  const businessId = await getBusinessId();
  const supabase = await createClient();

  const { data } = businessId
    ? await supabase
        .from("saved_searches")
        .select("*")
        .eq("id", params.id)
        .eq("business_id", businessId)
        .single()
    : { data: null };
  if (!data) notFound();

  return (
    <div className="space-y-5">
      <SavedSearchForm
        action={updateSavedSearch.bind(null, params.id)}
        search={data as SavedSearchRow}
        submitLabel="Save changes"
      />
    </div>
  );
}
