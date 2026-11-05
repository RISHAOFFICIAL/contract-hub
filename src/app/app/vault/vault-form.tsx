import { Field, FormCard, Select, TextArea, TextInput } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { VAULT_STATUSES } from "./labels";
import type { VaultRow } from "./actions";

export default function VaultForm({
  action,
  document,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  document?: VaultRow | null;
  submitLabel: string;
}) {
  return (
    <FormCard backHref="/app/vault" backLabel="Vault">
      <form action={action} className="space-y-4">
        <Field label="Document name">
          <TextInput
            name="name"
            required
            defaultValue={document?.name ?? ""}
            placeholder="e.g. Articles of Organization, W-9"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <TextInput
              name="category"
              defaultValue={document?.category ?? ""}
              placeholder="e.g. legal, tax, insurance"
            />
          </Field>
          <Field label="Status">
            <Select
              name="status"
              defaultValue={document?.status ?? "need"}
            >
              {VAULT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Expiry date" hint="Leave blank when it never expires">
          <TextInput
            name="expiry_date"
            type="date"
            defaultValue={document?.expiry_date ?? ""}
          />
        </Field>

        <Field label="Notes">
          <TextArea
            name="notes"
            defaultValue={document?.notes ?? ""}
            placeholder="Where the original lives, renewal steps..."
          />
        </Field>

        <SubmitButton label={submitLabel} />
      </form>
    </FormCard>
  );
}
