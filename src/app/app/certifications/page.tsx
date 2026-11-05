import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import {
  AddButton,
  EmptyState,
  ExpiryPill,
  PageHeader,
  formatDate,
} from "@/components/ui";
import { DeleteButton } from "@/components/ui-client";
import { deleteCertification } from "./actions";
import {
  programLabel,
  certStatusLabel,
  certStatusPillClass,
  type CertificationRow,
} from "./labels";

function CertificationCard({
  certification,
}: {
  certification: CertificationRow;
}) {
  const applied = formatDate(certification.applied_date);
  const approved = formatDate(certification.approved_date);
  const expiry = formatDate(certification.expiry_date);

  return (
    <article className="card-lux space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-forest">
            {certification.name}
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {programLabel(certification.program)}
          </p>
        </div>
        <span
          className={`pill shrink-0 ${certStatusPillClass(certification.status)}`}
        >
          {certStatusLabel(certification.status)}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {applied && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              Applied
            </dt>
            <dd className="text-ink">{applied}</dd>
          </div>
        )}
        {approved && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              Approved
            </dt>
            <dd className="text-ink">{approved}</dd>
          </div>
        )}
        {certification.cert_number && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              Cert. number
            </dt>
            <dd className="text-ink">{certification.cert_number}</dd>
          </div>
        )}
        {certification.expiry_date && (
          <div className="col-span-2 flex items-center gap-2">
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              Expires {expiry}
            </dt>
            <dd>
              <ExpiryPill dateStr={certification.expiry_date} />
            </dd>
          </div>
        )}
      </dl>

      {certification.notes && (
        <p className="whitespace-pre-wrap text-sm text-ink-soft">
          {certification.notes}
        </p>
      )}

      <div className="flex gap-2 border-t border-ink/10 pt-3">
        <Link
          href={`/app/certifications/${certification.id}/edit`}
          className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
        >
          Edit
        </Link>
        <DeleteButton
          action={deleteCertification.bind(null, certification.id)}
          confirmText={`Delete the ${certification.name} certification? This cannot be undone.`}
        />
      </div>
    </article>
  );
}

export default async function CertificationsPage() {
  const supabase = await createClient();
  const businessId = await getBusinessId();

  let certifications: CertificationRow[] = [];
  if (businessId) {
    const { data } = await supabase
      .from("certifications")
      .select(
        "id, name, program, status, applied_date, approved_date, expiry_date, cert_number, notes"
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    certifications = (data ?? []) as CertificationRow[];
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Certifications"
        action={
          <AddButton href="/app/certifications/new" label="+ New certification" />
        }
      />

      {certifications.length === 0 ? (
        <EmptyState
          title="No certifications tracked yet"
          body="Set aside contracts go to certified businesses. Track each program you are pursuing, from application to approval and renewal."
          ctaHref="/app/certifications/new"
          ctaLabel="Track your first certification"
        />
      ) : (
        <div className="space-y-4">
          {certifications.map((c) => (
            <CertificationCard key={c.id} certification={c} />
          ))}
        </div>
      )}
    </div>
  );
}
