import { Field, FormCard, TextArea, TextInput } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import type { ContactRow } from "./actions";

export default function ContactForm({
  action,
  contact,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  contact?: ContactRow | null;
  submitLabel: string;
}) {
  return (
    <FormCard backHref="/app/contacts" backLabel="Contacts">
      <form action={action} className="space-y-4">
        <Field label="Name">
          <TextInput
            name="name"
            required
            defaultValue={contact?.name ?? ""}
            placeholder="Full name"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Role">
            <TextInput
              name="role"
              defaultValue={contact?.role ?? ""}
              placeholder="Contracting officer, buyer..."
            />
          </Field>
          <Field label="Organization">
            <TextInput
              name="organization"
              defaultValue={contact?.organization ?? ""}
              placeholder="Agency or company"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email">
            <TextInput
              name="email"
              type="email"
              defaultValue={contact?.email ?? ""}
              placeholder="name@agency.gov"
            />
          </Field>
          <Field label="Phone">
            <TextInput
              name="phone"
              type="tel"
              defaultValue={contact?.phone ?? ""}
              placeholder="(555) 123-4567"
            />
          </Field>
        </div>

        <Field label="Notes">
          <TextArea
            name="notes"
            defaultValue={contact?.notes ?? ""}
            placeholder="How you met, what they buy, follow ups..."
          />
        </Field>

        <SubmitButton label={submitLabel} />
      </form>
    </FormCard>
  );
}
