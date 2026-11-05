import { Field, FormCard, Select, TextArea, TextInput } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { LEVELS, REG_STATUSES, type RegistrationRow } from "./labels";

export default function RegistrationForm({
  action,
  registration,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  registration?: RegistrationRow | null;
  submitLabel: string;
}) {
  return (
    <FormCard
      backHref="/app/registrations"
      backLabel="Registrations"
    >
      <form action={action} className="space-y-4">
        <Field label="Name">
          <TextInput
            name="name"
            required
            defaultValue={registration?.name ?? ""}
            placeholder="e.g. SAM.gov, Michigan SIGMA"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Level">
            <Select name="level" defaultValue={registration?.level ?? "federal"}>
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select
              name="status"
              defaultValue={registration?.status ?? "not_started"}
            >
              {REG_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Registration number">
            <TextInput
              name="registration_number"
              defaultValue={registration?.registration_number ?? ""}
            />
          </Field>
          <Field label="UEI">
            <TextInput
              name="uei"
              defaultValue={registration?.uei ?? ""}
              placeholder="Unique Entity ID"
            />
          </Field>
        </div>

        <Field label="CAGE code">
          <TextInput
            name="cage"
            defaultValue={registration?.cage ?? ""}
            placeholder="Commercial and Government Entity code"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Issued date">
            <TextInput
              name="issued_date"
              type="date"
              defaultValue={registration?.issued_date ?? ""}
            />
          </Field>
          <Field label="Expiry date">
            <TextInput
              name="expiry_date"
              type="date"
              defaultValue={registration?.expiry_date ?? ""}
            />
          </Field>
        </div>

        <Field label="Notes">
          <TextArea
            name="notes"
            defaultValue={registration?.notes ?? ""}
            placeholder="Login portal, renewal steps, contacts..."
          />
        </Field>

        <SubmitButton label={submitLabel} />
      </form>
    </FormCard>
  );
}
