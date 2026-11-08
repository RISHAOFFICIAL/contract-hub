import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { getPlanAccess } from "@/lib/billing";
import {
  AddButton,
  EmptyState,
  PageHeader,
  formatDate,
} from "@/components/ui";
import { DeleteButton } from "@/components/ui-client";
import {
  deleteSavedSearch,
  runSavedSearch,
  toggleSavedSearch,
} from "./actions";
import {
  frequencyLabel,
  levelLabel,
  typeLabel,
  type SavedSearchRow,
} from "./labels";

function SearchCard({ search }: { search: SavedSearchRow }) {
  const lastRun = search.last_run_at
    ? formatDate(search.last_run_at)
    : "Never run";
  return (
    <article className="card-lux space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-forest">
            {search.name}
          </h3>
          {search.keywords && (
            <p className="mt-0.5 truncate text-sm text-ink-soft">
              {search.keywords}
            </p>
          )}
        </div>
        <span
          className={`pill shrink-0 ${
            search.is_active ? "pill-active" : "pill-muted"
          }`}
        >
          {search.is_active ? "Active" : "Paused"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        <span className="pill pill-muted">
          {frequencyLabel(search.frequency)}
        </span>
        {search.levels.map((l) => (
          <span key={l} className="pill pill-muted">
            {levelLabel(l)}
          </span>
        ))}
        {search.types.map((t) => (
          <span key={t} className="pill pill-muted">
            {typeLabel(t)}
          </span>
        ))}
        {[search.city, search.state].filter(Boolean).join(", ") && (
          <span className="pill pill-muted">
            {[search.city, search.state].filter(Boolean).join(", ")}
          </span>
        )}
      </div>

      <p className="text-xs text-ink-faint">Last run: {lastRun}</p>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <form action={runSavedSearch.bind(null, search.id)}>
          <button
            type="submit"
            className="btn-glass btn-primary-glass px-4 py-2 text-sm"
          >
            Run
          </button>
        </form>
        <form action={toggleSavedSearch.bind(null, search.id, !search.is_active)}>
          <button
            type="submit"
            className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
          >
            {search.is_active ? "Pause" : "Resume"}
          </button>
        </form>
        <Link
          href={`/app/saved-searches/${search.id}/edit`}
          className="text-sm font-semibold text-brass-dark"
        >
          Edit
        </Link>
        <DeleteButton
          action={deleteSavedSearch.bind(null, search.id)}
          label="Delete"
          confirmText="Delete this saved search? Scan history stays, but it will no longer run."
        />
      </div>
    </article>
  );
}

export default async function SavedSearchesPage({
  searchParams,
}: {
  searchParams: { pro?: string };
}) {
  const businessId = await getBusinessId();
  const supabase = await createClient();
  const access = await getPlanAccess();

  const { data } = businessId
    ? await supabase
        .from("saved_searches")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
    : { data: [] };
  const searches = (data ?? []) as SavedSearchRow[];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Saved searches"
        action={
          access.isPro ? (
            <AddButton href="/app/saved-searches/new" label="New search" />
          ) : (
            <Link
              href="/app/plan"
              className="btn-glass btn-primary-glass shrink-0 px-5 py-2.5 text-sm"
            >
              Upgrade to Pro
            </Link>
          )
        }
      />

      {searchParams.pro === "required" && (
        <p className="rounded-2xl bg-brass-pale px-4 py-3 text-sm text-ink">
          Saved searches are a Pro feature. One-off keyword scans stay free
          on the Opportunities page.{" "}
          <Link href="/app/plan" className="font-semibold text-forest underline">
            Upgrade to Pro
          </Link>{" "}
          to save searches that run every day.
        </p>
      )}

      {!access.isPro && searches.length === 0 && (
        <p className="rounded-2xl bg-ivory px-4 py-3 text-sm text-ink-soft">
          Saved searches are a Pro feature. On Free, run one-off keyword
          scans from the Opportunities page instead.
        </p>
      )}
      {searches.length === 0 ? (
        <EmptyState
          title="No saved searches yet"
          body="Save a keyword recipe and the Hub will scan SAM.gov for you on schedule. Each run lands new matches in your opportunities inbox."
          ctaHref={access.isPro ? "/app/saved-searches/new" : "/app/plan"}
          ctaLabel={
            access.isPro ? "Create your first search" : "Upgrade to Pro"
          }
        />
      ) : (
        <div className="space-y-4">
          {searches.map((s) => (
            <SearchCard key={s.id} search={s} />
          ))}
        </div>
      )}
    </div>
  );
}
