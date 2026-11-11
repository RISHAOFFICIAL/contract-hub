import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import {
  AddButton,
  DeadlinePill,
  EmptyState,
  PageHeader,
  TextInput,
  formatDate,
  formatDateTime,
} from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import {
  dismissOpportunity,
  scanAllActive,
  scanWithKeywords,
  trackOpportunity,
} from "./actions";

const TYPE_LABELS: Record<string, string> = {
  active_bid: "Active bid",
  upcoming: "Upcoming",
  rfi: "RFI",
  sources_sought: "Sources sought",
  presolicitation: "Presolicitation",
};

type OpportunityRow = {
  id: string;
  title: string;
  buyer: string | null;
  source_name: string | null;
  source_url: string | null;
  type: string;
  posted_date: string | null;
  deadline: string | null;
  naics: string | null;
  set_aside: string | null;
  match_reason: string | null;
  match_score: number | null;
  solicitation_number: string | null;
};

function OpportunityCard({ opp }: { opp: OpportunityRow }) {
  return (
    <article className="card-lux space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-forest">
            {opp.title}
          </h3>
          {opp.buyer && (
            <p className="mt-0.5 text-sm text-ink-soft">{opp.buyer}</p>
          )}
        </div>
        {opp.match_score != null && (
          <span className="pill pill-active shrink-0">
            {opp.match_score}/100
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="pill pill-muted">
          {TYPE_LABELS[opp.type] ?? opp.type}
        </span>
        {opp.source_name && (
          <span className="pill pill-muted">{opp.source_name}</span>
        )}
        <DeadlinePill dateStr={opp.deadline} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {opp.naics && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              NAICS
            </dt>
            <dd className="text-ink">{opp.naics}</dd>
          </div>
        )}
        {opp.set_aside && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              Set aside
            </dt>
            <dd className="text-ink">{opp.set_aside}</dd>
          </div>
        )}
        {opp.solicitation_number && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              Solicitation
            </dt>
            <dd className="text-ink">{opp.solicitation_number}</dd>
          </div>
        )}
        {opp.posted_date && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              Posted
            </dt>
            <dd className="text-ink">{formatDate(opp.posted_date)}</dd>
          </div>
        )}
      </dl>

      {opp.match_reason && (
        <p className="text-xs text-ink-soft">
          <span className="font-semibold">Why it matched:</span>{" "}
          {opp.match_reason}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <form action={trackOpportunity.bind(null, opp.id)}>
          <button
            type="submit"
            className="btn-glass btn-primary-glass px-4 py-2 text-sm"
          >
            Track this
          </button>
        </form>
        <form action={dismissOpportunity.bind(null, opp.id)}>
          <button
            type="submit"
            className="btn-glass glass px-4 py-2 text-sm font-semibold text-ink-soft"
          >
            Dismiss
          </button>
        </form>
        {opp.source_url && (
          <Link
            href={opp.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-brass-dark"
          >
            View source
          </Link>
        )}
      </div>
    </article>
  );
}

type FilteredOut = { title: string; reason: string };

function ScanSummary({ row }: { row: {
  run_at: string;
  found_count: number;
  filtered_count: number;
  added_count: number;
  per_source: Record<string, { filteredOut?: FilteredOut[] } | null>;
  saved_search_id: string | null;
} }) {
  const filteredOut: FilteredOut[] =
    row.per_source?.["SAM.gov"]?.filteredOut ?? [];
  return (
    <section className="glass rounded-3xl p-5">
      <h2 className="font-display text-lg font-semibold text-forest">
        Last scan
      </h2>
      <p className="text-xs text-ink-faint">
        {formatDateTime(row.run_at)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span className="pill pill-muted">Found {row.found_count}</span>
        <span className="pill pill-warn">Filtered {row.filtered_count}</span>
        <span className="pill pill-active">Added {row.added_count}</span>
      </div>
      {row.found_count === 0 && (
        <p className="mt-3 text-sm text-ink-soft">
          The scan returned nothing this time. SAM.gov sometimes needs an API
          key, or no matches posted in the last 30 days for your keywords.
        </p>
      )}
      {filteredOut.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink">
            Filtered out this run
          </p>
          <ul className="mt-2 space-y-2">
            {filteredOut.slice(0, 20).map((f, i) => (
              <li key={i} className="text-xs text-ink-soft">
                <span className="font-semibold text-ink">{f.title}</span>
                <br />
                {f.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default async function OpportunitiesPage() {
  const businessId = await getBusinessId();
  const supabase = await createClient();

  const { data: opps } = businessId
    ? await supabase
        .from("opportunities")
        .select("*")
        .eq("business_id", businessId)
        .eq("status", "new")
        .order("match_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
    : { data: [] };

  const { count: activeSearchCount } = businessId
    ? await supabase
        .from("saved_searches")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("is_active", true)
    : { count: 0 };

  const { data: lastScan } = businessId
    ? await supabase
        .from("scan_history")
        .select(
          "run_at, found_count, filtered_count, added_count, per_source, saved_search_id"
        )
        .eq("business_id", businessId)
        .order("run_at", { ascending: false })
        .limit(1)
        .single()
    : { data: null };

  const newOpps = (opps ?? []) as OpportunityRow[];
  const hasActiveSearches = activeSearchCount ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Opportunities"
        action={
          hasActiveSearches > 0 ? (
            <form action={scanAllActive}>
              <button
                type="submit"
                className="btn-glass btn-primary-glass shrink-0 px-5 py-2.5 text-sm"
              >
                Scan now
              </button>
            </form>
          ) : (
            <AddButton href="/app/saved-searches/new" label="New search" />
          )
        }
      />

      <p className="rounded-xl bg-ivory px-4 py-3 text-sm text-ink-soft">
        Scans cover SAM.gov, Detroit Bonfire, and MITN. Michigan SIGMA
        cannot be scanned automatically, check it by hand with Guest
        Access:{" "}
        <a
          href="https://sigma.michigan.gov/PRDVSS1X1/Advantage4"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brass-dark underline"
        >
          sigma.michigan.gov
        </a>
        .
      </p>

      {hasActiveSearches === 0 && (
        <section className="card-lux space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold text-forest">
            Try a keyword scan
          </h2>
          <p className="text-sm text-ink-soft">
            No saved searches yet. Run a one time scan now, or save a search
            for daily runs.
          </p>
          <form action={scanWithKeywords} className="flex items-start gap-2">
            <div className="flex-1">
              <TextInput
                name="keywords"
                required
                placeholder="e.g. janitorial services"
                aria-label="Keywords to scan"
              />
            </div>
            <div className="shrink-0">
              <SubmitButton label="Scan" pendingLabel="Scanning..." />
            </div>
          </form>
        </section>
      )}

      <h2 className="font-display text-xl font-semibold text-forest">
        New matches
      </h2>
      {newOpps.length === 0 ? (
        <EmptyState
          title="No new matches"
          body="Run a scan to pull fresh listings from SAM.gov, Detroit Bonfire, and MITN. Matches that score 40 or higher land here."
          ctaHref={hasActiveSearches > 0 ? undefined : "/app/saved-searches/new"}
          ctaLabel={
            hasActiveSearches > 0 ? undefined : "Create a saved search"
          }
        />
      ) : (
        <div className="space-y-4">
          {newOpps.map((opp) => (
            <OpportunityCard key={opp.id} opp={opp} />
          ))}
        </div>
      )}

      {lastScan && <ScanSummary row={lastScan} />}
    </div>
  );
}
