import { Field, FormCard, Select, TextArea, TextInput } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { PROGRAMS, CERT_STATUSES, type CertificationRow } from "./labels";

export default function CertificationForm({
  action,
  certification,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  certification?: CertificationRow | null;
  submitLabel: string;
}) {
  return (
    <FormCard backHref="/app/certifications" backLabel="Certifications">
      <form action={action} className="space-y-4">
        <Field label="Name">
          <TextInput
            name="name"
            required
            defaultValue={certification?.name ?? ""}
            placeholder="e.g. SBA HUBZone certification"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Program">
            <Select
              name="program"
              defaultValue={certification?.program ?? "other"}
            >
              {PROGRAMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select
              name="status"
              defaultValue={certification?.status ?? "not_started"}
            >
              {CERT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Applied date">
            <TextInput
              name="applied_date"
              type="date"
              defaultValue={certification?.applied_date ?? ""}
            />
          </Field>
          <Field label="Approved date">
            <TextInput
              name="approved_date"
              type="date"
              defaultValue={certification?.approved_date ?? ""}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Expiry date">
            <TextInput
              name="expiry_date"
              type="date"
              defaultValue={certification?.expiry_date ?? ""}
            />
          </Field>
          <Field label="Certificate number">
            <TextInput
              name="cert_number"
              defaultValue={certification?.cert_number ?? ""}
            />
          </Field>
        </div>

        <Field label="Notes">
          <TextArea
            name="notes"
            defaultValue={certification?.notes ?? ""}
            placeholder="Application portal, documents submitted, reviewer..."
          />
        </Field>

        <SubmitButton label={submitLabel} />
      </form>
    </FormCard>
  );
}
