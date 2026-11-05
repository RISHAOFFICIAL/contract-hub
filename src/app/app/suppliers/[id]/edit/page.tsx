import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { PageHeader } from "@/components/ui";
import SupplierForm from "../../supplier-form";
import { updateSupplier } from "../../actions";
import type { SupplierRow } from "../../labels";

export default async function EditSupplierPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) notFound();

  const { data } = await supabase
    .from("suppliers")
    .select(
      "id, name, contact_name, email, phone, categories, outreach_status, notes"
    )
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  if (!data) notFound();

  return (
    <div className="space-y-5">
      <PageHeader title="Edit supplier" />
      <SupplierForm
        action={updateSupplier.bind(null, params.id)}
        supplier={data as SupplierRow}
        submitLabel="Save changes"
      />
    </div>
  );
}
