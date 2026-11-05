import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { PageHeader } from "@/components/ui";
import RegistrationForm from "../../registration-form";
import { updateRegistration } from "../../actions";
import type { RegistrationRow } from "../../labels";

export default async function EditRegistrationPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) notFound();

  const { data } = await supabase
    .from("registrations")
    .select(
      "id, name, level, status, registration_number, uei, cage, issued_date, expiry_date, renewal_reminder_days, notes"
    )
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  if (!data) notFound();

  return (
    <div className="space-y-5">
      <PageHeader title="Edit registration" />
      <RegistrationForm
        action={updateRegistration.bind(null, params.id)}
        registration={data as RegistrationRow}
        submitLabel="Save changes"
      />
    </div>
  );
}
