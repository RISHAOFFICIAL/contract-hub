import { Field, FormCard, Select, TextArea, TextInput } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { OUTREACH_STATUSES, type SupplierRow } from "./labels";

export default function SupplierForm({
  action,
  supplier,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  supplier?: SupplierRow | null;
  submitLabel: string;
}) {
  return (
    <FormCard backHref="/app/suppliers" backLabel="Suppliers">
      <form action={action} className="space-y-4">
        <Field label="Supplier name">
          <TextInput
            name="name"
            required
            defaultValue={supplier?.name ?? ""}
            placeholder="e.g. Acme Janitorial Supply"
          />
        </Field>

        <Field label="Contact name">
          <TextInput
            name="contact_name"
            defaultValue={supplier?.contact_name ?? ""}
            placeholder="Person you talk to"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email">
            <TextInput
              name="email"
              type="email"
              defaultValue={supplier?.email ?? ""}
              placeholder="sales@example.com"
            />
          </Field>
          <Field label="Phone">
            <TextInput
              name="phone"
              type="tel"
              defaultValue={supplier?.phone ?? ""}
              placeholder="(555) 123-4567"
            />
          </Field>
        </div>

        <Field
          label="Categories"
          hint="Separate with commas, e.g. janitorial, paper goods"
        >
          <TextInput
            name="categories"
            defaultValue={(supplier?.categories ?? []).join(", ")}
            placeholder="janitorial, paper goods"
          />
        </Field>

        <Field label="Outreach status">
          <Select
            name="outreach_status"
            defaultValue={supplier?.outreach_status ?? "to_contact"}
          >
            {OUTREACH_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Notes">
          <TextArea
            name="notes"
            defaultValue={supplier?.notes ?? ""}
            placeholder="Pricing, lead times, terms..."
          />
        </Field>

        <SubmitButton label={submitLabel} />
      </form>
    </FormCard>
  );
}
