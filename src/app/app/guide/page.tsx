import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { getGuideContext, getTopBlocker } from "@/lib/guide";
import { LESSONS, getLessonProgress } from "@/lib/foundations";
import { EmptyState, PageHeader } from "@/components/ui";
import { ChatPanel } from "./ChatPanel";
import { CertQuiz } from "./CertQuiz";
import { toggleLessonAction } from "./actions";

const SAM_RENEWAL_STEPS = [
  "Sign in to sam.gov with your Login.gov account.",
  "Open your entity registration from the dashboard.",
  "Review every section: core data, assertions, reps and certs, and points of contact.",
  "Update anything that changed, such as address, NAICS codes, contacts, or banking details.",
  "Submit the renewal and confirm the new expiry date on screen.",
  "Record the new expiry date in Contract Hub so the Guide can warn you before it lapses again.",
];

export default async function GuidePage() {
  const supabase = await createClient();
  const businessId = await getBusinessId();

  if (!businessId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Guide" />
        <EmptyState
          title="Sign in to use the Guide"
          body="The Guide personalizes its advice from your business data. Sign in first."
        />
      </div>
    );
  }

  const ctx = await getGuideContext(supabase, businessId);
  const blocker = getTopBlocker(ctx);
  const progress = await getLessonProgress(supabase, businessId);
  const doneCount = LESSONS.filter((l) => progress[l.key]).length;
  const pct = Math.round((doneCount / LESSONS.length) * 100);

  const hasSamActive = ctx.registrations.some(
    (r) => r.name.toLowerCase().includes("sam") && r.status === "active"
  );
  const hasBid = ctx.contracts.some((c) =>
    ["submitted", "awarded", "in_progress", "completed", "closed_out"].includes(
      c.stage
    )
  );

  const roadmap = [
    {
      label: "Complete your business profile",
      href: "/app/profile",
      done: !!ctx.profile.legalName,
    },
    {
      label: "Get your EIN",
      href: "/app/guide#foundations",
      done: !!progress["ein"],
    },
    {
      label: "Get your UEI and register on SAM.gov",
      href: "/app/registrations",
      done: hasSamActive || !!progress["uei_sam"],
    },
    {
      label: "Get a DUNS number and open a business bank account",
      href: "/app/guide#foundations",
      done: !!progress["duns_bank"],
    },
    {
      label: "Open your first net-30 accounts",
      href: "/app/guide#foundations",
      done: !!progress["net30"],
    },
    {
      label: "Track your registrations",
      href: "/app/registrations",
      done: ctx.registrations.length > 0,
    },
    {
      label: "Run your first opportunity scan",
      href: "/app/opportunities",
      done: ctx.scansRun > 0,
    },
    { label: "Submit your first bid", href: "/app/contracts", done: hasBid },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Guide" />

      {/* Your Guide says */}
      <section aria-label="Your Guide says" className="glass-brass rounded-3xl p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-dark">
          Your Guide says
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-forest">
          {blocker.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink">
          {blocker.body}
        </p>
        <Link
          href={blocker.href}
          className="btn-glass btn-primary-glass mt-4 inline-block px-6 py-2.5 text-sm"
        >
          {blocker.hrefLabel}
        </Link>
      </section>

      {/* Ask the Guide */}
      <section aria-label="Ask the Guide">
        <h2 className="font-display text-xl font-semibold text-forest">
          Ask the Guide
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Answers are built from your live business data in Contract Hub.
        </p>
        <div className="mt-4">
          <ChatPanel />
        </div>
      </section>

      {/* Business Foundations */}
      <section id="foundations" aria-label="Business Foundations">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-forest">
            Business Foundations
          </h2>
          <p className="text-sm font-semibold text-ink-soft">
            {doneCount} of {LESSONS.length} lessons complete
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-2 rounded-full bg-brass transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-4 space-y-3">
          {LESSONS.map((lesson) => {
            const done = !!progress[lesson.key];
            return (
              <details
                key={lesson.key}
                className="card-lux rounded-3xl p-5"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                  <span>
                    <span className="font-display text-lg font-semibold text-forest">
                      {lesson.title}
                    </span>
                    <span className="mt-1 block text-sm text-ink-soft">
                      {lesson.summary}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      done
                        ? "bg-forest text-ivory"
                        : "glass text-forest"
                    }`}
                  >
                    {done ? "Completed" : "Open"}
                  </span>
                </summary>

                <div className="mt-4 space-y-4 border-t border-ink/10 pt-4">
                  <ol className="space-y-2">
                    {lesson.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-ink">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/10 text-xs font-bold text-forest">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>

                  {lesson.links.length > 0 && (
                    <ul className="space-y-1">
                      {lesson.links.map((l) => (
                        <li key={l.href}>
                          <a
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-brass-dark underline underline-offset-2"
                          >
                            {l.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="text-xs text-ink-faint">
                    Done means: {lesson.checkKey}
                  </p>

                  <form action={toggleLessonAction}>
                    <input type="hidden" name="key" value={lesson.key} />
                    <input
                      type="hidden"
                      name="completed"
                      value={done ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className={`btn-glass px-5 py-2 text-sm ${
                        done
                          ? "glass text-forest"
                          : "btn-primary-glass"
                      }`}
                    >
                      {done ? "Mark not complete" : "Mark complete"}
                    </button>
                  </form>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* Walkthroughs */}
      <section aria-label="Walkthroughs">
        <h2 className="font-display text-xl font-semibold text-forest">
          Walkthroughs
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {/* Bid ready roadmap */}
          <div className="card-lux rounded-3xl p-5">
            <h3 className="font-display text-lg font-semibold text-forest">
              Get bid ready
            </h3>
            <p className="mt-1 text-xs text-ink-faint">
              Your roadmap, checked against your data.
            </p>
            <ol className="mt-3 space-y-2">
              {roadmap.map((s, i) => (
                <li key={s.label}>
                  <Link
                    href={s.href}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        s.done
                          ? "bg-forest text-ivory"
                          : "bg-ink/10 text-ink-faint"
                      }`}
                    >
                      {s.done ? "✓" : i + 1}
                    </span>
                    <span
                      className={
                        s.done ? "text-ink-faint line-through" : "text-ink"
                      }
                    >
                      {s.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          {/* Certification finder */}
          <div className="card-lux rounded-3xl p-5">
            <h3 className="font-display text-lg font-semibold text-forest">
              Certification Finder
            </h3>
            <p className="mt-1 text-xs text-ink-faint">
              Three questions, no answers saved.
            </p>
            <div className="mt-3">
              <CertQuiz />
            </div>
          </div>

          {/* SAM renewal */}
          <div className="card-lux rounded-3xl p-5">
            <h3 className="font-display text-lg font-semibold text-forest">
              SAM renewal walkthrough
            </h3>
            <ol className="mt-3 space-y-2">
              {SAM_RENEWAL_STEPS.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/10 text-xs font-bold text-forest">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-2xl bg-[#8c3b2e]/10 p-4">
              <p className="text-sm font-semibold text-[#8c3b2e]">
                Renewal is free.
              </p>
              <p className="mt-1 text-xs text-ink">
                Never pay a service to renew SAM for you. Do it yourself at
                sam.gov.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
