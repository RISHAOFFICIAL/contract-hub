import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Contract Hub",
  description:
    "How Contract Hub collects, uses, and protects your information.",
};

const SECTIONS = [
  {
    title: "What we collect",
    body: [
      "Account information: your email address and a password if you sign in with email, or your name and email address from Google if you sign in with Google.",
      "Business profile information you enter: business name, contact details, city and state, NAICS codes, and product and service lines. This is what opportunity scans are matched against.",
      "Contract and business data you enter: contracts, registrations, certifications, suppliers, contacts, milestones, invoices, saved searches, and notes. This is your business information, and you control it.",
    ],
  },
  {
    title: "What we never ask for",
    body: [
      "Contract Hub never asks for your government portal passwords, banking logins, card numbers, or full EINs. Never enter those here. Your SAM.gov, state, and local portal accounts stay yours, and you sign in to them separately.",
    ],
  },
  {
    title: "How we use your information",
    body: [
      "Your account and profile keep you signed in and make the app work for your business.",
      "Your profile keywords and NAICS codes are used to match daily opportunity scans to your business. Scans read public listings from SAM.gov, Detroit Bonfire, and MITN, and only your own business sees its results.",
      "We do not sell your data. We do not share your business information with other businesses, advertisers, or data brokers.",
    ],
  },
  {
    title: "Sign-in and cookies",
    body: [
      "We use a session cookie to keep you signed in. It is required for the app to work and is removed when you sign out. We do not use advertising cookies or third party trackers.",
    ],
  },
  {
    title: "Your data and your choices",
    body: [
      "You can edit or delete the information you entered at any time from inside the app. To delete your account and all of its data, email us at hghmgmtgroup@gmail.com from the email address on your account and ask us to delete it. We will confirm once it is done.",
      "If you have a question about your data, email hghmgmtgroup@gmail.com.",
    ],
  },
  {
    title: "Changes to this policy",
    body: [
      "If this policy changes, the updated version will be posted here with a new date. Continued use of Contract Hub after a change means you accept the updated policy.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-ivory text-ink">
      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="glass mx-4 mt-4 rounded-2xl px-5 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-xl font-semibold text-forest"
          >
            Contract Hub
          </Link>
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

      {/* Policy */}
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-dark">
          Last updated November 7, 2026
        </p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-tight text-forest">
          Privacy Policy
        </h1>
        <p className="mt-5 text-lg text-ink-soft">
          Contract Hub helps small business owners track government contracts
          and find new opportunities. This policy explains what information
          we collect, how we use it, and what we never ask for.
        </p>
        <hr className="rule-brass mx-auto mt-10 max-w-xs" />

        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <div key={s.title} className="card-lux p-6">
              <h2 className="font-display text-xl font-semibold text-forest">
                {s.title}
              </h2>
              {s.body.map((p) => (
                <p key={p.slice(0, 32)} className="mt-2 text-ink-soft">
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-ink-faint">
          Questions about this policy? Email{" "}
          <a
            href="mailto:hghmgmtgroup@gmail.com"
            className="font-semibold text-forest hover:text-forest-light"
          >
            hghmgmtgroup@gmail.com
          </a>
          .
        </p>
        <p className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-forest hover:text-forest-light"
          >
            Back to Contract Hub
          </Link>
        </p>
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
