import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import {
  PageHeader,
  AddButton,
  EmptyState,
  TextInput,
  Select,
  Field,
  daysUntil,
  formatDate,
} from "@/components/ui";
import { DeleteButton } from "@/components/ui-client";
import {
  deleteAd,
  duplicateAd,
  submitForReview,
  approveToLive,
  pauseAd,
  resumeAd,
  reportAd,
} from "./actions";
import { AD_CATEGORIES, packageLabel, packagePrice } from "./ads-data";
import ReportAdButton from "./report-ad-button";

export type AdRow = {
  id: string;
  headline: string | null;
  body: string | null;
  category: string | null;
  state: string | null;
  city: string | null;
  cta_text: string | null;
  cta_url: string | null;
  package: string | null;
  status: string | null;
  starts_at: string | null;
  ends_at: string | null;
  click_count: number | null;
  report_count: number | null;
};

function statusPill(status: string | null): string {
  switch (status) {
    case "live":
      return "pill-active";
    case "pending_review":
      return "pill-warn";
    case "paused":
      return "pill-muted";
    case "draft":
      return "pill-muted";
    default:
      return "pill-muted";
  }
}

function statusLabel(status: string | null): string {
  switch (status) {
    case "pending_review":
      return "In review";
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : "";
  }
}

const TABS = [
  { value: "browse", label: "Browse Ads" },
  { value: "my", label: "My Ads" },
];

export default async function AdsPage({
  searchParams,
}: {
  searchParams: { tab?: string; category?: string; state?: string; city?: string; q?: string };
}) {
  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) notFound();

  const tab = searchParams.tab === "my" ? "my" : "browse";

  const { data: ads } = await supabase
    .from("ads")
    .select(
      "id, headline, body, category, state, city, cta_text, cta_url, package, status, starts_at, ends_at, click_count, report_count"
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  const allAds = (ads ?? []) as AdRow[];

  if (tab === "browse") {
    const liveAds = allAds.filter((a) => a.status === "live");
    const fCategory = searchParams.category ?? "";
    const fState = (searchParams.state ?? "").trim();
    const fCity = (searchParams.city ?? "").trim();
    const fQ = (searchParams.q ?? "").trim().toLowerCase();

    const filtered = liveAds.filter((a) => {
      if (fCategory && a.category !== fCategory) return false;
      if (fState && (a.state ?? "").toLowerCase() !== fState.toLowerCase())
        return false;
      if (fCity && (a.city ?? "").toLowerCase() !== fCity.toLowerCase())
        return false;
      if (
        fQ &&
        !`${a.headline ?? ""} ${a.body ?? ""}`.toLowerCase().includes(fQ)
      )
        return false;
      return true;
    });

    return (
      <div className="space-y-5">
        <PageHeader
          title="Ads in the Hub"
          action={<AddButton href="/app/ads/new" label="Create ad" />}
        />
        <Tabs active="browse" />

        <form
          method="get"
          className="glass grid gap-3 rounded-3xl p-5 sm:grid-cols-4"
        >
          <input type="hidden" name="tab" value="browse" />
          <Field label="Keyword">
            <TextInput name="q" defaultValue={searchParams.q ?? ""} placeholder="Search ads" />
          </Field>
          <Field label="Category">
            <Select name="category" defaultValue={fCategory}>
              <option value="">All categories</option>
              {AD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="State">
            <TextInput name="state" defaultValue={fState} placeholder="e.g. MI" />
          </Field>
          <Field label="City">
            <TextInput name="city" defaultValue={fCity} placeholder="e.g. Detroit" />
          </Field>
          <div className="sm:col-span-4">
            <button
              type="submit"
              className="btn-glass glass px-5 py-2.5 text-sm font-semibold text-forest"
            >
              Filter
            </button>
          </div>
        </form>

        <p className="text-xs text-ink-faint">
          Showing your live ads as they would appear to other businesses in
          the Hub.
        </p>

        {filtered.length === 0 ? (
          <EmptyState
            title="No live ads to show"
            body="You have no live ads matching these filters. Create an ad and approve it to live to see it here."
            ctaHref="/app/ads/new"
            ctaLabel="Create an ad"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((ad) => (
              <div key={ad.id} className="card-lux p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brass-dark">
                  Sponsored
                </p>
                <h3 className="font-display mt-1 text-lg font-semibold text-forest">
                  {ad.headline}
                </h3>
                {ad.body && (
                  <p className="mt-1 text-sm text-ink-soft">{ad.body}</p>
                )}
                <p className="mt-2 text-xs text-ink-faint">
                  {[ad.category, ad.city, ad.state]
                    .filter(Boolean)
                    .join(" • ")}{" "}
                  • {packageLabel(ad.package)} package
                </p>
                {ad.cta_text && ad.cta_url && (
                  <a
                    href={`/api/ads/click/${ad.id}`}
                    className="btn-glass btn-primary-glass mt-4 inline-block px-5 py-2.5 text-sm"
                  >
                    {ad.cta_text}
                  </a>
                )}
                <ReportAdButton
                  action={reportAd.bind(null, ad.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // My Ads tab
  return (
    <div className="space-y-5">
      <PageHeader
        title="Ads in the Hub"
        action={<AddButton href="/app/ads/new" label="Create ad" />}
      />
      <Tabs active="my" />

      <p className="text-sm text-ink-soft">
        Package payments connect at launch. No card collected.
      </p>

      {allAds.length === 0 ? (
        <EmptyState
          title="No ads yet"
          body="Promote your business to other owners in the Hub. Choose a package, write your ad, and approve it to live."
          ctaHref="/app/ads/new"
          ctaLabel="Create your first ad"
        />
      ) : (
        <div className="space-y-3">
          {allAds.map((ad) => {
            const days = daysUntil(ad.ends_at);
            const price = packagePrice(ad.package);
            return (
              <div key={ad.id} className="card-lux space-y-3 p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-forest">
                      {ad.headline}
                    </h3>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {[ad.category, ad.city, ad.state]
                        .filter(Boolean)
                        .join(" • ")}{" "}
                      • {packageLabel(ad.package)}
                      {price !== null && ` ($${price}/30 days)`}
                    </p>
                  </div>
                  <span className={`pill ${statusPill(ad.status)}`}>
                    {statusLabel(ad.status)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                  {ad.status === "live" && ad.ends_at && (
                    <span>
                      {days !== null && days >= 0
                        ? `${days} days remaining`
                        : "Ended"}{" "}
                      ({formatDate(ad.ends_at)})
                    </span>
                  )}
                  <span>{ad.click_count ?? 0} clicks</span>
                  <span>{ad.report_count ?? 0} reports</span>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-3">
                  <Link
                    href={`/app/ads/${ad.id}/edit`}
                    className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
                  >
                    Edit
                  </Link>
                  <form action={duplicateAd.bind(null, ad.id)}>
                    <button
                      type="submit"
                      className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
                    >
                      Duplicate
                    </button>
                  </form>
                  {ad.status === "draft" && (
                    <form action={submitForReview.bind(null, ad.id)}>
                      <button
                        type="submit"
                        className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
                      >
                        Submit for review
                      </button>
                    </form>
                  )}
                  {(ad.status === "draft" ||
                    ad.status === "pending_review" ||
                    ad.status === "paused") && (
                    <form action={approveToLive.bind(null, ad.id)}>
                      <button
                        type="submit"
                        className="btn-glass btn-primary-glass px-4 py-2 text-sm"
                      >
                        Approve to live
                      </button>
                    </form>
                  )}
                  {ad.status === "live" && (
                    <form action={pauseAd.bind(null, ad.id)}>
                      <button
                        type="submit"
                        className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
                      >
                        Pause
                      </button>
                    </form>
                  )}
                  {ad.status === "paused" && (
                    <form action={resumeAd.bind(null, ad.id)}>
                      <button
                        type="submit"
                        className="btn-glass btn-primary-glass px-4 py-2 text-sm"
                      >
                        Resume
                      </button>
                    </form>
                  )}
                  <DeleteButton
                    action={deleteAd.bind(null, ad.id)}
                    confirmText="Delete this ad? This cannot be undone."
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tabs({ active }: { active: "browse" | "my" }) {
  return (
    <div className="glass inline-flex rounded-2xl p-1">
      {TABS.map((t) => (
        <Link
          key={t.value}
          href={`/app/ads?tab=${t.value}`}
          className={`rounded-xl px-5 py-2 text-sm font-semibold ${
            active === t.value
              ? "btn-primary-glass btn-glass"
              : "text-ink-soft"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
