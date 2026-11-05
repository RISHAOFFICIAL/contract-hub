import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { PageHeader } from "@/components/ui";
import CertificationForm from "../../certification-form";
import { updateCertification } from "../../actions";
import type { CertificationRow } from "../../labels";

export default async function EditCertificationPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) notFound();

  const { data } = await supabase
    .from("certifications")
    .select(
      "id, name, program, status, applied_date, approved_date, expiry_date, cert_number, notes"
    )
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  if (!data) notFound();

  return (
    <div className="space-y-5">
      <PageHeader title="Edit certification" />
      <CertificationForm
        action={updateCertification.bind(null, params.id)}
        certification={data as CertificationRow}
        submitLabel="Save changes"
      />
    </div>
  );
}
