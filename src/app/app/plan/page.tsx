import Link from "next/link";
import { getPlanAccess, FREE_CONTRACT_LIMIT, TRIAL_DAYS } from "@/lib/billing";
import { openBillingPortal, startCheckout } from "./actions";

const FREE_FEATURES = [
  "Search SAM.gov, Detroit Bonfire, and MITN",
  `Track up to ${FREE_CONTRACT_LIMIT} contracts through the full pipeline`,
  "Deadline, renewal, and amendment alerts",
  "Registrations and certifications trackers",
  "Proposal workbench with compliance matrix",
  "Margin calculator and compliance guardrails",
  "Guide with Business Foundations lessons",
  "Bid Ready Journey badges",
  "Capability statement generator",
  "Supplier bench and quote comparison",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited contract tracking",
  "Alerts when new matching contracts post",
  "Saved searches with daily scans",
  "Document vault with file uploads",
];

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: { billing?: string };
}) {
  const access = await getPlanAccess();
  const notice = searchParams.billing ?? null;

  const planLabel = access.isGrandfathered
    ? "Early access"
    : access.plan === "pro"
      ? "Pro"
      : "Free";

  const trialEnds = formatDate(access.trialEndsAt);
  const periodEnds = formatDate(access.currentPeriodEnd);
  const isTrialing = access.subscriptionStatus === "trialing";

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-dark">
          Contract Hub
        </p>
        <h1 className="font-display text-3xl font-semibold text-forest">
          Your plan
        </h1>
      </header>

      {notice === "success" && (
        <p className="rounded-2xl bg-forest-tint px-4 py-3 text-sm font-semibold text-forest">
          Welcome to Pro. Your {TRIAL_DAYS}-day free trial started. Your card
          is not charged until the trial ends.
        </p>
      )}
      {notice === "cancelled" && (
        <p className="rounded-2xl bg-brass-pale px-4 py-3 text-sm text-ink-soft">
          Checkout was cancelled. Nothing was charged and your plan did not
          change.
        </p>
      )}
      {notice === "error" && (
        <p className="rounded-2xl bg-brass-pale px-4 py-3 text-sm text-ink-soft">
          Something went wrong starting checkout. Please try again, and if it
          keeps failing, contact support.
        </p>
      )}

      {/* Current plan */}
      <section className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-forest">
            {planLabel}
          </h2>
          <span className="pill pill-active">Current plan</span>
        </div>

        {access.isGrandfathered ? (
          <p className="mt-2 text-ink-soft">
            You joined Contract Hub before the paid plans launched, so you
            keep full Pro access for free as an early member. Nothing to pay,
            nothing to do.
          </p>
        ) : access.plan === "pro" ? (
          <div className="mt-2 space-y-2 text-ink-soft">
            <p>
              {isTrialing
                ? `Your free trial runs through ${trialEnds ?? "the end of your trial"}. Your card is charged when the trial ends unless you cancel.`
                : `Your Pro subscription renews on ${periodEnds ?? "your next billing date"}.`}
            </p>
            <form action={openBillingPortal}>
              <button
                type="submit"
                className="btn-glass glass px-5 py-2.5 text-sm font-semibold text-forest"
              >
                Manage billing
              </button>
            </form>
            <p className="text-xs text-ink-faint">
              Manage billing opens Stripe, where you can update your card,
              switch between monthly and annual, or cancel.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-ink-soft">
            You are tracking {access.contractCount} of {FREE_CONTRACT_LIMIT}{" "}
            contracts on Free. Upgrade to Pro for unlimited tracking, alerts
            on new matches, saved searches, and the document vault.
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm text-ink">
              <span
                aria-hidden
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-tint text-xs font-bold text-forest"
              >
                ✓
              </span>
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* Pro */}
      {!access.isPro && (
        <section className="card-lux p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-forest">
              Pro
            </h2>
            <span className="pill pill-active">$24 a month</span>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            Pro is $24 a month, or $240 a year (two months free). Start with
            a {TRIAL_DAYS}-day free trial. Your card is collected at checkout
            and charged when the trial ends unless you cancel. Cancel anytime
            from Manage billing.
          </p>
          <ul className="mt-4 space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-ink">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-tint text-xs font-bold text-forest"
                >
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-faint">
            File uploads in the document vault arrive with the next release.
            The vault checklist works today.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <form action={startCheckout}>
              <input type="hidden" name="period" value="monthly" />
              <button
                type="submit"
                className="btn-glass btn-primary-glass w-full px-6 py-3"
              >
                Start free trial, $24 a month
              </button>
            </form>
            <form action={startCheckout}>
              <input type="hidden" name="period" value="annual" />
              <button
                type="submit"
                className="btn-glass glass w-full px-6 py-3 text-sm font-semibold text-forest"
              >
                Start free trial, $240 a year
              </button>
            </form>
          </div>
        </section>
      )}

      {access.isPro && !access.isGrandfathered && (
        <section className="card-lux p-6">
          <h2 className="font-display text-xl font-semibold text-forest">
            Pro features
          </h2>
          <ul className="mt-4 space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-ink">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-tint text-xs font-bold text-forest"
                >
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-faint">
            File uploads in the document vault arrive with the next release.
            The vault checklist works today.
          </p>
        </section>
      )}

      <Link
        href="/app"
        className="btn-glass glass block px-6 py-3 text-center text-sm font-semibold text-forest"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
