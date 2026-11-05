import {
  Field,
  TextInput,
  TextArea,
  Select,
  FormCard,
} from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { AD_CATEGORIES, AD_PACKAGES } from "./ads-data";
import type { AdRow } from "./page";

export default function AdForm({
  ad,
  action,
  submitLabel,
}: {
  ad?: AdRow | null;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}) {
  return (
    <FormCard backHref="/app/ads?tab=my" backLabel="My ads">
      <h1 className="font-display text-2xl font-semibold text-forest">
        {ad ? "Edit ad" : "Create ad"}
      </h1>
      <form action={action} className="space-y-4">
        <Field label="Headline">
          <TextInput
            name="headline"
            defaultValue={ad?.headline ?? ""}
            required
            maxLength={120}
            placeholder="What do you offer?"
          />
        </Field>
        <Field label="Body">
          <TextArea
            name="body"
            defaultValue={ad?.body ?? ""}
            placeholder="Two or three sentences about your offer."
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select name="category" defaultValue={ad?.category ?? "Other"}>
              {AD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Package">
            <Select name="package" defaultValue={ad?.package ?? "starter"}>
              {AD_PACKAGES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} - ${p.price} per 30 days
                </option>
              ))}
            </Select>
          </Field>
          <Field label="State">
            <TextInput
              name="state"
              defaultValue={ad?.state ?? ""}
              placeholder="e.g. MI"
              maxLength={2}
            />
          </Field>
          <Field label="City">
            <TextInput
              name="city"
              defaultValue={ad?.city ?? ""}
              placeholder="e.g. Detroit"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button text">
            <TextInput
              name="cta_text"
              defaultValue={ad?.cta_text ?? ""}
              placeholder="e.g. Learn more"
            />
          </Field>
          <Field label="Button link">
            <TextInput
              name="cta_url"
              defaultValue={ad?.cta_url ?? ""}
              placeholder="https://example.com"
              inputMode="url"
            />
          </Field>
        </div>
        <p className="text-xs text-ink-faint">
          Package payments connect at launch. No card collected.
        </p>
        <SubmitButton label={submitLabel} />
      </form>
    </FormCard>
  );
}
