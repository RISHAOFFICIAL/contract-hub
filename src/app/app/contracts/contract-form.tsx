import { Field, FormCard, Select, TextArea, TextInput } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { STAGES, type ContractRow } from "./stages";
import { toDateTimeLocal } from "@/components/ui";

export default function ContractForm({
  action,
  contract,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  contract?: ContractRow | null;
  submitLabel: string;
}) {
  return (
    <FormCard backHref={contract ? `/app/contracts/${contract.id}` : "/app/contracts"} backLabel="Contracts">
      <form action={action} className="space-y-4">
        <Field label="Title">
          <TextInput
            name="title"
            required
            defaultValue={contract?.title ?? ""}
            placeholder="e.g. Janitorial services, Building 4"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Buyer">
            <TextInput
              name="buyer"
              defaultValue={contract?.buyer ?? ""}
              placeholder="Agency or company"
            />
          </Field>
          <Field label="Buyer type">
            <TextInput
              name="buyer_type"
              defaultValue={contract?.buyer_type ?? ""}
              placeholder="Federal, state, prime..."
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Stage">
            <Select name="stage" defaultValue={contract?.stage ?? "watching"}>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Contract value (USD)">
            <TextInput
              name="contract_value"
              type="number"
              min="0"
              step="0.01"
              defaultValue={contract?.contract_value?.toString() ?? ""}
              placeholder="50000"
            />
          </Field>
        </div>

        <Field label="Deadline" hint="Bid due date and time">
          <TextInput
            name="deadline"
            type="datetime-local"
            defaultValue={toDateTimeLocal(contract?.deadline)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Solicitation number">
            <TextInput
              name="solicitation_number"
              defaultValue={contract?.solicitation_number ?? ""}
              placeholder="e.g. 36C10X26Q0012"
            />
          </Field>
          <Field label="NAICS">
            <TextInput
              name="naics"
              defaultValue={contract?.naics ?? ""}
              placeholder="e.g. 561720"
            />
          </Field>
        </div>

        <Field label="Set aside">
          <TextInput
            name="set_aside"
            defaultValue={contract?.set_aside ?? ""}
            placeholder="e.g. SDVOSB, 8(a), HUBZone"
          />
        </Field>

        <Field label="Source URL">
          <TextInput
            name="source_url"
            type="url"
            defaultValue={contract?.source_url ?? ""}
            placeholder="https://sam.gov/..."
          />
        </Field>

        <Field label="Description">
          <TextArea
            name="description"
            defaultValue={contract?.description ?? ""}
            placeholder="What is this opportunity about?"
          />
        </Field>

        <Field label="Notes">
          <TextArea
            name="notes"
            defaultValue={contract?.notes ?? ""}
            placeholder="Strategy notes, questions for the buyer..."
          />
        </Field>

        <SubmitButton label={submitLabel} />
      </form>
    </FormCard>
  );
}
