import { Field, FormCard, Select, TextInput } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import {
  FREQUENCY_OPTIONS,
  LEVEL_OPTIONS,
  TYPE_OPTIONS,
  type SavedSearchRow,
} from "./labels";

export default function SavedSearchForm({
  action,
  search,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  search?: SavedSearchRow | null;
  submitLabel: string;
}) {
  return (
    <FormCard backHref="/app/saved-searches" backLabel="Saved searches">
      <form action={action} className="space-y-4">
        <Field label="Name">
          <TextInput
            name="name"
            required
            defaultValue={search?.name ?? ""}
            placeholder="e.g. Janitorial bids, Detroit"
          />
        </Field>

        <Field
          label="Keywords"
          hint="These go to SAM.gov and also feed the match scoring."
        >
          <TextInput
            name="keywords"
            defaultValue={search?.keywords ?? ""}
            placeholder="e.g. janitorial services"
          />
        </Field>

        <Field label="Levels">
          <div className="flex flex-wrap gap-2">
            {LEVEL_OPTIONS.map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="levels"
                  value={o.value}
                  defaultChecked={search?.levels?.includes(o.value) ?? false}
                  className="accent-[#2f4a3c]"
                />
                {o.label}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Opportunity types">
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="types"
                  value={o.value}
                  defaultChecked={search?.types?.includes(o.value) ?? false}
                  className="accent-[#2f4a3c]"
                />
                {o.label}
              </label>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="State">
            <TextInput
              name="state"
              defaultValue={search?.state ?? ""}
              placeholder="MI"
              maxLength={2}
            />
          </Field>
          <Field label="City">
            <TextInput
              name="city"
              defaultValue={search?.city ?? ""}
              placeholder="Detroit"
            />
          </Field>
        </div>

        <Field
          label="Set asides"
          hint="Comma separated, e.g. Small business, WOSB"
        >
          <TextInput
            name="set_asides"
            defaultValue={search?.set_asides?.join(", ") ?? ""}
            placeholder="Small business"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Frequency">
            <Select
              name="frequency"
              defaultValue={search?.frequency ?? "daily"}
            >
              {FREQUENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Active">
            <label className="flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={search?.is_active ?? true}
                className="accent-[#2f4a3c]"
              />
              Run on schedule
            </label>
          </Field>
        </div>

        <SubmitButton label={submitLabel} />
      </form>
    </FormCard>
  );
}
