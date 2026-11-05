"use client";

import { useState } from "react";

interface QuizOption {
  id: string;
  question: string;
  program: string;
  blurb: string;
}

const OPTIONS: QuizOption[] = [
  {
    id: "wosb",
    question: "Is your business at least 51% owned and controlled by women?",
    program: "WOSB / EDWOSB",
    blurb:
      "The Woman-Owned Small Business program (and the economically disadvantaged EDWOSB track) opens federal set-aside contracts for woman-owned firms.",
  },
  {
    id: "hubzone",
    question:
      "Is your business located in a HUBZone, or do at least 35% of your employees live in one?",
    program: "HUBZone",
    blurb:
      "The HUBZone program gives bidding advantages to firms in historically underutilized business zones. Check your address on the SBA HUBZone map.",
  },
  {
    id: "dbe",
    question:
      "Do you want state, local, or transportation contracts (roads, transit, airports)?",
    program: "DBE / MBE",
    blurb:
      "Disadvantaged Business Enterprise (transportation work) and Minority Business Enterprise (state and corporate supplier diversity) programs fit firms pursuing state and local work.",
  },
];

export function CertQuiz() {
  const [yes, setYes] = useState<Record<string, boolean>>({});

  const toggle = (id: string, value: boolean) =>
    setYes((prev) => ({ ...prev, [id]: value }));

  const matches = OPTIONS.filter((o) => yes[o.id]);
  const answered = OPTIONS.filter((o) => yes[o.id] !== undefined);

  return (
    <div className="space-y-4">
      {OPTIONS.map((o) => (
        <div key={o.id} className="glass rounded-2xl p-4">
          <p className="text-sm font-semibold text-ink">{o.question}</p>
          <div className="mt-2 flex gap-2">
            {(["yes", "no"] as const).map((v) => {
              const active = yes[o.id] === (v === "yes");
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggle(o.id, v === "yes")}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                    active
                      ? "bg-forest text-ivory"
                      : "glass text-forest hover:brightness-95"
                  }`}
                >
                  {v === "yes" ? "Yes" : "No"}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {answered.length === 3 && (
        <div className="glass-brass rounded-2xl p-5">
          {matches.length > 0 ? (
            <>
              <h3 className="font-display text-lg font-semibold text-forest">
                Programs worth a look
              </h3>
              <ul className="mt-2 space-y-2">
                {matches.map((m) => (
                  <li key={m.id}>
                    <p className="text-sm font-semibold text-forest">
                      {m.program}
                    </p>
                    <p className="text-sm text-ink-soft">{m.blurb}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-ink">
              None of these three fit right now. That is fine. Many firms win
              contracts with no certification at all, and you can revisit this
              quiz any time.
            </p>
          )}
          <p className="mt-3 text-xs text-ink-faint">
            General information, not legal advice.
          </p>
          <a
            href="/app/certifications"
            className="btn-glass btn-primary-glass mt-3 inline-block px-5 py-2 text-sm"
          >
            Track a certification
          </a>
        </div>
      )}
    </div>
  );
}
