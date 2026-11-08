import Link from "next/link";

const FEATURES = [
  {
    title: "Track every contract",
    body: "Follow each pursuit from watching to closeout, with milestones, invoices, and past performance in one place.",
  },
  {
    title: "Find real opportunities",
    body: "Daily scans of SAM.gov and official public sources, matched to your profile, NAICS codes, and service area.",
  },
  {
    title: "Stay bid ready",
    body: "Registrations, certifications, renewals, and deadline reminders, with a Guide that walks you through each step.",
  },
  {
    title: "Bid with confidence",
    body: "Proposal workbench, margin calculator, and compliance guardrails built for small business owners.",
  },
];

const JOURNEY = [
  "Complete your profile",
  "Get your EIN and UEI",
  "Activate your SAM registration",
  "Track your first bid",
  "Win your first award",
  "Close out and record past performance",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ivory text-ink">
      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="glass mx-4 mt-4 rounded-2xl px-5 py-3 flex items-center justify-between">
          <span className="font-display text-xl font-semibold text-forest">
            Contract Hub
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-forest hover:text-forest-light"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="btn-glass btn-primary-glass px-5 py-2 text-sm"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-dark">
          For small business owners
        </p>
        <h1 className="font-display mt-4 text-4xl sm:text-5xl font-semibold leading-tight text-forest">
          Win government contracts with confidence
        </h1>
        <p className="mt-5 text-lg text-ink-soft">
          Contract Hub tracks your contracts before, during, and after award,
          scans official sources for new opportunities every day, and guides
          you from your first registration to your first win.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="btn-glass btn-primary-glass px-8 py-3 text-base w-full sm:w-auto text-center"
          >
            Start free today
          </Link>
          <Link
            href="/login"
            className="btn-glass glass px-8 py-3 text-base text-forest w-full sm:w-auto text-center"
          >
            Sign in
          </Link>
        </div>
        <hr className="rule-brass mx-auto mt-12 max-w-xs" />
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-lux p-6">
              <h2 className="font-display text-xl font-semibold text-forest">
                {f.title}
              </h2>
              <p className="mt-2 text-ink-soft">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Journey */}
      <section className="mx-auto max-w-3xl px-6 pb-12">
        <div className="glass-brass rounded-3xl p-8">
          <h2 className="font-display text-2xl font-semibold text-forest text-center">
            The Bid Ready Journey
          </h2>
          <p className="mt-2 text-center text-ink-soft">
            Earn badges as you complete each milestone, from profile to
            closeout.
          </p>
          <ol className="mt-6 space-y-3">
            {JOURNEY.map((step, i) => (
              <li key={step} className="flex items-center gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-semibold text-ivory">
                  {i + 1}
                </span>
                <span className="font-medium text-ink">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-3xl px-6 pb-16 text-center">
        <h2 className="font-display text-2xl font-semibold text-forest">
          Free for now
        </h2>
        <p className="mt-3 text-ink-soft">
          Contract Hub is free while it is being built with early owners.
          Every feature is unlocked and there is no credit card required. A
          Pro tier is coming later.
        </p>
        <Link
          href="/signup"
          className="btn-glass btn-primary-glass mt-6 inline-block px-8 py-3"
        >
          Create your free account
        </Link>
      </section>

      <footer className="border-t border-ink/10 px-6 py-8 text-center text-sm text-ink-faint">
        <p className="font-display text-lg font-semibold text-forest">
          Contract Hub
        </p>
        <p className="mt-1">
          General information only, not legal advice. Never enter government
          portal passwords here.
        </p>
        <p className="mt-3">
          <Link
            href="/privacy"
            className="font-semibold text-forest hover:text-forest-light"
          >
            Privacy Policy
          </Link>
        </p>
      </footer>
    </main>
  );
}
