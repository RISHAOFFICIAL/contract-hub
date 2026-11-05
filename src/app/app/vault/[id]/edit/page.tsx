import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { PageHeader } from "@/components/ui";
import VaultForm from "../../vault-form";
import { updateVaultDocument, type VaultRow } from "../../actions";

export default async function EditVaultDocumentPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) notFound();

  const { data } = await supabase
    .from("vault_documents")
    .select("id, name, category, status, expiry_date, notes")
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  if (!data) notFound();

  return (
    <div className="space-y-5">
      <PageHeader title="Edit document" />
      <VaultForm
        action={updateVaultDocument.bind(null, params.id)}
        document={data as VaultRow}
        submitLabel="Save changes"
      />
    </div>
  );
}
