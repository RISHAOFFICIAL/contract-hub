import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import {
  BADGES,
  evaluateBadges,
  getEarnedBadges,
  formatEarnedDate,
} from "@/lib/rewards";
import { PageHeader, formatDate } from "@/components/ui";

export default async function RewardsPage() {
  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) notFound();

  // Visiting this page awards any pending badges first.
  const newlyEarned = await evaluateBadges(supabase, businessId);
  const earned = await getEarnedBadges(supabase, businessId);

  const newBadges = BADGES.filter((b) => newlyEarned.includes(b.key));
  const earnedCount = BADGES.filter((b) => earned.has(b.key)).length;
  const pct = Math.round((earnedCount / BADGES.length) * 100);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Your Bid Ready Journey"
        action={
          <Link
            href="/app"
            className="btn-glass glass shrink-0 px-4 py-2 text-sm font-semibold text-forest"
          >
            Dashboard
          </Link>
        }
      />

      {newBadges.length > 0 && (
        <section className="glass-brass rounded-3xl p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-dark">
            Celebration
          </p>
          <h2 className="font-display mt-1 text-2xl font-semibold text-forest">
            {newBadges.length === 1
              ? "New badge earned"
              : `${newBadges.length} new badges earned`}
          </h2>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {newBadges.map((b) => (
              <li
                key={b.key}
                className="pill pill-active px-4 py-1.5 text-sm font-semibold"
              >
                {b.title}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-ink-soft">{formatEarnedDate()}</p>
        </section>
      )}

      <section className="card-lux p-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-ink">
            {earnedCount} of {BADGES.length} badges
          </p>
          <p className="text-sm font-semibold text-brass-dark">{pct}%</p>
        </div>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full bg-ink/10"
          role="progressbar"
          aria-valuenow={earnedCount}
          aria-valuemin={0}
          aria-valuemax={BADGES.length}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-brass to-brass-dark transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BADGES.map((badge) => {
          const earnedAt = earned.get(badge.key);
          const isEarned = earnedAt !== undefined;
          return (
            <div
              key={badge.key}
              className={
                isEarned
                  ? "glass-brass rounded-3xl p-5"
                  : "rounded-3xl border border-ink/10 bg-ivory-soft/60 p-5 opacity-70"
              }
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-forest">
                  {badge.title}
                </h3>
                {isEarned ? (
                  <span className="pill pill-active shrink-0">Earned</span>
                ) : (
                  <span className="pill pill-muted shrink-0">Locked</span>
                )}
              </div>
              <p className="mt-1.5 text-sm text-ink-soft">
                {badge.description}
              </p>
              {isEarned && earnedAt && (
                <p className="mt-2 text-xs font-semibold text-brass-dark">
                  Earned {formatDate(earnedAt)}
                </p>
              )}
            </div>
          );
        })}
      </section>

      <p className="text-center text-xs text-ink-faint">
        Badges are in-app recognition of your progress.
      </p>
    </div>
  );
}
