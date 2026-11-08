import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import {
  EmptyState,
  Field,
  FormCard,
  PageHeader,
  TextArea,
  TextInput,
} from "@/components/ui";
import { saveProfile } from "./actions";

type BusinessRow = {
  legal_name: string | null;
  dba: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  service_area: string | null;
  website: string | null;
  naics_codes: string[] | null;
  product_lines: string[] | null;
  service_lines: string[] | null;
  certifications_summary: string | null;
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: { saved?: string; error?: string };
}) {
  const supabase = await createClient();
  const businessId = await getBusinessId();

  if (!businessId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Business profile" />
        <EmptyState
          title="Sign in to edit your profile"
          body="Your business profile personalizes scans, readiness, and Guide advice. Sign in first."
          ctaHref="/login"
          ctaLabel="Sign in"
        />
      </div>
    );
  }

  const { data } = await supabase
    .from("businesses")
    .select(
      "legal_name, dba, email, phone, city, state, country, service_area, website, naics_codes, product_lines, service_lines, certifications_summary"
    )
    .eq("id", businessId)
    .single();

  const business = (data ?? {}) as BusinessRow;
  const join = (v: string[] | null) => (v ?? []).join(", ");
  const saved = searchParams?.saved === "1";
  const error = searchParams?.error;

  return (
    <div className="space-y-5">
      <PageHeader title="Business profile" />

      {saved && (
        <div className="rounded-2xl bg-forest/10 p-4">
          <p className="text-sm font-semibold text-forest">
            Profile saved.
          </p>
          <p className="mt-1 text-sm text-ink">
            Your readiness meter, Guide advice, and opportunity matches now
            use these details.
          </p>
        </div>
      )}

      {error === "name" && (
        <div className="rounded-2xl bg-[#8c3b2e]/10 p-4">
          <p className="text-sm font-semibold text-[#8c3b2e]">
            Add your legal business name before saving.
          </p>
        </div>
      )}

      {error === "email" && (
        <div className="rounded-2xl bg-[#8c3b2e]/10 p-4">
          <p className="text-sm font-semibold text-[#8c3b2e]">
            That email address does not look right. Check it and try again.
          </p>
        </div>
      )}

      <FormCard backHref="/app" backLabel="Back to dashboard">
        <p className="text-sm text-ink-soft">
          Everything here drives Contract Hub: your readiness meter, your
          Guide advice, and which opportunities match you. Keep it current.
        </p>

        <form action={saveProfile} className="space-y-5">
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-forest">
              Business identity
            </h2>
            <Field label="Legal business name">
              <TextInput
                name="legal_name"
                required
                maxLength={200}
                defaultValue={business.legal_name ?? ""}
                placeholder="Your LLC or registered business name"
                autoComplete="organization"
              />
            </Field>
            <Field label="DBA (doing business as)" hint="Optional. The name you trade under, if it differs from your legal name.">
              <TextInput
                name="dba"
                maxLength={200}
                defaultValue={business.dba ?? ""}
                placeholder="Trading name, if any"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact email">
                <TextInput
                  name="email"
                  type="email"
                  maxLength={200}
                  defaultValue={business.email ?? ""}
                  placeholder="you@yourbusiness.com"
                  autoComplete="email"
                />
              </Field>
              <Field label="Phone">
                <TextInput
                  name="phone"
                  type="tel"
                  maxLength={50}
                  defaultValue={business.phone ?? ""}
                  placeholder="(555) 555-5555"
                  autoComplete="tel"
                />
              </Field>
            </div>
            <Field label="Website" hint="Optional. We add https:// if you leave it off.">
              <TextInput
                name="website"
                type="text"
                inputMode="url"
                maxLength={300}
                defaultValue={business.website ?? ""}
                placeholder="yourbusiness.com"
                autoComplete="url"
              />
            </Field>
          </div>

          <div className="space-y-4 border-t border-ink/10 pt-5">
            <h2 className="font-display text-lg font-semibold text-forest">
              Location
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City">
                <TextInput
                  name="city"
                  maxLength={100}
                  defaultValue={business.city ?? ""}
                  placeholder="Detroit"
                  autoComplete="address-level2"
                />
              </Field>
              <Field label="State">
                <TextInput
                  name="state"
                  maxLength={100}
                  defaultValue={business.state ?? ""}
                  placeholder="MI"
                  autoComplete="address-level1"
                />
              </Field>
              <Field label="Country">
                <TextInput
                  name="country"
                  maxLength={100}
                  defaultValue={business.country ?? "United States"}
                  autoComplete="country-name"
                />
              </Field>
            </div>
            <Field label="Service area" hint="Where you work, for example Detroit metro or statewide Michigan.">
              <TextInput
                name="service_area"
                maxLength={200}
                defaultValue={business.service_area ?? ""}
                placeholder="Detroit metro"
              />
            </Field>
          </div>

          <div className="space-y-4 border-t border-ink/10 pt-5">
            <h2 className="font-display text-lg font-semibold text-forest">
              What you sell
            </h2>
            <p className="text-sm text-ink-soft">
              These fields drive your opportunity matches. List the products,
              services, and NAICS codes you actually sell so scans score real
              fits.
            </p>
            <Field label="NAICS codes" hint="Separate with commas, for example 561720, 423850. Codes are 2 to 6 digits.">
              <TextInput
                name="naics_codes"
                maxLength={500}
                defaultValue={join(business.naics_codes)}
                placeholder="561720, 423850"
                autoComplete="off"
              />
            </Field>
            <Field label="Product lines" hint="Separate with commas, for example janitorial supplies, paper products.">
              <TextInput
                name="product_lines"
                maxLength={1000}
                defaultValue={join(business.product_lines)}
                placeholder="Janitorial supplies, paper products"
                autoComplete="off"
              />
            </Field>
            <Field label="Service lines" hint="Separate with commas, for example commercial cleaning, floor care.">
              <TextInput
                name="service_lines"
                maxLength={1000}
                defaultValue={join(business.service_lines)}
                placeholder="Commercial cleaning, floor care"
                autoComplete="off"
              />
            </Field>
            <Field label="Certifications summary" hint="Optional. A short note on certifications you hold or are working toward.">
              <TextArea
                name="certifications_summary"
                maxLength={1000}
                defaultValue={business.certifications_summary ?? ""}
                placeholder="WOSB certified, HUBZone application in progress"
              />
            </Field>
          </div>

          <button
            type="submit"
            className="btn-glass btn-primary-glass w-full px-6 py-3 text-sm"
          >
            Save profile
          </button>
        </form>
      </FormCard>
    </div>
  );
}
