import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const FREE_FEATURES = [
  "Unlimited contracts, pursuits, and pipeline tracking",
  "Daily opportunity scans matched to your profile",
  "Deadline, renewal, and amendment alerts",
  "Registrations and certifications trackers",
  "Proposal workbench with compliance matrix",
  "Margin calculator and compliance guardrails",
  "Guide chatbot with Business Foundations lessons",
  "Bid Ready Journey badges",
  "Capability statement generator",
  "Supplier bench and quote comparison",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Priority scan depth across more sources",
  "Team seats with roles",
  "Advanced reporting and exports",
];

export default async function PlanPage() {
  const supabase = await createClient();
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, plan, legal_name")
    .order("created_at", { ascending: true })
    .limit(1);

  const plan = (businesses?.[0]?.plan as string | undefined) ?? "free";

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

      {/* Current plan */}
      <section className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-forest">
            Free
          </h2>
          <span className="pill pill-active">Current plan</span>
        </div>
        <p className="mt-2 text-ink-soft">
          Contract Hub is free for now. Every feature is unlocked, no credit
          card required{plan === "pro" ? ", including your Pro access" : ""}.
        </p>
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

      {/* Pro, coming later */}
      <section className="card-lux p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-forest">
            Pro
          </h2>
          <span className="pill pill-muted">Coming later</span>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          A paid Pro tier is on the roadmap for when Contract Hub leaves its
          free period. There is no checkout yet and nothing to pay today.
        </p>
        <ul className="mt-4 space-y-2">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm text-ink-faint">
              <span
                aria-hidden
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ivory-deep text-xs font-bold text-ink-faint"
              >
                ✓
              </span>
              {f}
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled
          className="btn-glass mt-5 w-full cursor-not-allowed bg-ivory-deep px-6 py-3 text-ink-faint"
        >
          Coming later
        </button>
      </section>

      <Link
        href="/app"
        className="btn-glass glass block px-6 py-3 text-center text-sm font-semibold text-forest"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
