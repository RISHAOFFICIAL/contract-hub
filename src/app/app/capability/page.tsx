import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { dedupeStrings } from "@/lib/dedupe";
import { EmptyState, formatMoney } from "@/components/ui";
import { PrintButton } from "./print-button";
import { certStatusLabel } from "../certifications/labels";

function BrassRule() {
  return <hr className="border-t-2 border-brass/70" />;
}

function CapSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-brass-dark">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default async function CapabilityPage() {
  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) notFound();

  const [bizRes, certRes, contractRes] = await Promise.all([
    supabase
      .from("businesses")
      .select(
        "legal_name, dba, email, phone, city, state, country, service_area, website, naics_codes, product_lines, service_lines, certifications_summary"
      )
      .eq("id", businessId)
      .single(),
    supabase
      .from("certifications")
      .select("name, program, status")
      .eq("business_id", businessId)
      .in("status", ["approved", "in_progress"])
      .order("status", { ascending: true }),
    supabase
      .from("contracts")
      .select("title, buyer, contract_value")
      .eq("business_id", businessId)
      .in("stage", ["completed", "closed_out"])
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const b = (bizRes.data ?? {}) as {
    legal_name: string | null;
    dba: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    service_area: string | null;
    website: string | null;
    naics_codes: string[] | null;
    product_lines: string[] | null;
    service_lines: string[] | null;
    certifications_summary: string | null;
  };

  const profileBlank = !b.legal_name && !b.dba;

  const certs = (certRes.data ?? []) as {
    name: string;
    program: string | null;
    status: string;
  }[];

  const past = (contractRes.data ?? []) as {
    title: string;
    buyer: string | null;
    contract_value: number | null;
  }[];

  const competencies = dedupeStrings([
    ...(b.product_lines ?? []),
    ...(b.service_lines ?? []),
  ]);
  const location = [b.city, b.state].filter(Boolean).join(", ");
  const contactBits = [b.email, b.phone, b.website].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 pt-2 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-dark">
            Contract Hub
          </p>
          <h1 className="font-display text-3xl font-semibold text-forest">
            Capability Statement
          </h1>
        </div>
        <PrintButton />
      </div>

      {profileBlank ? (
        <EmptyState
          title="Your business profile is blank"
          body="Complete your business profile first: legal name, contact details, NAICS codes, and what you sell. Then this page renders your one-page capability statement."
        />
      ) : (
        <div className="card-lux space-y-6 p-8 print:shadow-none">
          {/* Header */}
          <div className="text-center">
            <h1 className="font-display text-3xl font-semibold text-forest">
              {b.legal_name ?? b.dba}
            </h1>
            {b.dba && b.legal_name && (
              <p className="mt-1 text-sm text-ink-soft">DBA {b.dba}</p>
            )}
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-brass-dark">
              Capability Statement
            </p>
          </div>

          <BrassRule />

          {/* Contact */}
          <CapSection title="Contact">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink">
              {location && <span>{location}</span>}
              {b.country && <span>{b.country}</span>}
              {contactBits.map((c) => (
                <span key={c as string}>{c as string}</span>
              ))}
            </div>
          </CapSection>

          {/* Core competencies */}
          {competencies.length > 0 && (
            <>
              <BrassRule />
              <CapSection title="Core Competencies">
                <ul className="grid gap-1 sm:grid-cols-2">
                  {competencies.map((c, i) => (
                    <li key={i} className="text-sm text-ink">
                      <span className="mr-2 text-brass">{"\u25AA"}</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </CapSection>
            </>
          )}

          {/* NAICS */}
          {(b.naics_codes ?? []).length > 0 && (
            <>
              <BrassRule />
              <CapSection title="NAICS Codes">
                <p className="text-sm text-ink">
                  {(b.naics_codes ?? []).join(", ")}
                </p>
              </CapSection>
            </>
          )}

          {/* Certifications */}
          {certs.length > 0 && (
            <>
              <BrassRule />
              <CapSection title="Certifications">
                <ul className="space-y-1">
                  {certs.map((c, i) => (
                    <li key={i} className="text-sm text-ink">
                      <span className="font-semibold">{c.name}</span>
                      {c.program && (
                        <span className="text-ink-soft"> ({c.program})</span>
                      )}
                      <span className="ml-2 text-xs uppercase tracking-wide text-brass-dark">
                        {certStatusLabel(c.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CapSection>
            </>
          )}

          {/* Past performance */}
          {past.length > 0 && (
            <>
              <BrassRule />
              <CapSection title="Past Performance">
                <ul className="space-y-2">
                  {past.map((p, i) => (
                    <li key={i} className="text-sm text-ink">
                      <span className="font-semibold">{p.title}</span>
                      {p.buyer && (
                        <span className="text-ink-soft">, {p.buyer}</span>
                      )}
                      {p.contract_value !== null && (
                        <span className="ml-2 font-semibold text-forest">
                          {formatMoney(p.contract_value)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CapSection>
            </>
          )}

          {/* Differentiators */}
          {(b.service_area || b.certifications_summary) && (
            <>
              <BrassRule />
              <CapSection title="Differentiators">
                {b.service_area && (
                  <p className="text-sm text-ink">
                    <span className="font-semibold">Service area:</span>{" "}
                    {b.service_area}
                  </p>
                )}
                {b.certifications_summary && (
                  <p className="mt-1 text-sm text-ink">
                    {b.certifications_summary}
                  </p>
                )}
              </CapSection>
            </>
          )}

          <BrassRule />
          <p className="text-center text-xs text-ink-faint">
            Prepared with Contract Hub. Verify all details before distributing.
          </p>
        </div>
      )}

      <style>{`@media print { body { background: white; } }`}</style>
    </div>
  );
}
