import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { PageHeader } from "@/components/ui";
import ContractForm from "../../contract-form";
import { updateContract } from "../../actions";
import type { ContractRow } from "../../stages";

export default async function EditContractPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) notFound();

  const { data } = await supabase
    .from("contracts")
    .select(
      "id, title, buyer, buyer_type, stage, contract_value, deadline, solicitation_number, source_url, naics, set_aside, description, notes"
    )
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  if (!data) notFound();

  return (
    <div className="space-y-5">
      <PageHeader title="Edit contract" />
      <ContractForm
        action={updateContract.bind(null, params.id)}
        contract={data as ContractRow}
        submitLabel="Save changes"
      />
    </div>
  );
}
