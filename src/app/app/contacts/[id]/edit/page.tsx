import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { PageHeader } from "@/components/ui";
import ContactForm from "../../contact-form";
import { updateContact, type ContactRow } from "../../actions";

export default async function EditContactPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) notFound();

  const { data } = await supabase
    .from("contacts")
    .select("id, name, role, organization, email, phone, notes")
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  if (!data) notFound();

  return (
    <div className="space-y-5">
      <PageHeader title="Edit contact" />
      <ContactForm
        action={updateContact.bind(null, params.id)}
        contact={data as ContactRow}
        submitLabel="Save changes"
      />
    </div>
  );
}
