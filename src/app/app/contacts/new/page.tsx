import { PageHeader } from "@/components/ui";
import ContactForm from "../contact-form";
import { createContact } from "../actions";

export default function NewContactPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="New contact" />
      <ContactForm action={createContact} submitLabel="Save contact" />
    </div>
  );
}
