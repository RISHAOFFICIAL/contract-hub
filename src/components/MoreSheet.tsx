"use client";

import Link from "next/link";

type Section = { name: string; detail: string; href?: string };

const SECTIONS: Section[] = [
  { name: "Registrations", detail: "SAM.gov, state, county, and city portals", href: "/app/registrations" },
  { name: "Certifications", detail: "WOSB, HUBZone, DBE, MBE, and local programs", href: "/app/certifications" },
  { name: "Vault", detail: "Document checklist for bids and filings", href: "/app/vault" },
  { name: "Suppliers", detail: "Your private supplier bench", href: "/app/suppliers" },
  { name: "Contacts", detail: "Buyers, primes, and partners", href: "/app/contacts" },
  { name: "Capability Statement", detail: "Generate a print ready one pager", href: "/app/capability" },
  { name: "Saved Searches", detail: "Your daily scan recipes", href: "/app/saved-searches" },
  { name: "Alerts", detail: "New matches, deadlines, renewals", href: "/app/alerts" },
  { name: "Rewards", detail: "Your Bid Ready Journey badges", href: "/app/rewards" },
  { name: "Team", detail: "Invite owners, admins, members, viewers", href: "/app/team" },
  { name: "Plan", detail: "Your current plan", href: "/app/plan" },
  { name: "Ads", detail: "Promote your business in the Hub", href: "/app/ads" },
  { name: "Profile", detail: "Business details, NAICS, service area" },
  { name: "Security", detail: "Sign in, sessions, and data controls" },
];

export default function MoreSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-ivory-soft px-5 pb-10 pt-4">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/15" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-forest">
            More
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
          >
            Close
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {SECTIONS.map((s) =>
            s.href ? (
              <li key={s.name}>
                <Link
                  href={s.href}
                  onClick={onClose}
                  className="card-lux flex w-full items-center justify-between px-5 py-4"
                >
                  <div>
                    <p className="font-semibold text-ink">{s.name}</p>
                    <p className="text-sm text-ink-faint">{s.detail}</p>
                  </div>
                  <span className="pill pill-active">Open</span>
                </Link>
              </li>
            ) : (
              <li
                key={s.name}
                className="card-lux flex items-center justify-between px-5 py-4"
              >
                <div>
                  <p className="font-semibold text-ink">{s.name}</p>
                  <p className="text-sm text-ink-faint">{s.detail}</p>
                </div>
                <span className="pill pill-muted">Soon</span>
              </li>
            )
          )}
        </ul>
      </div>
    </div>
  );
}
