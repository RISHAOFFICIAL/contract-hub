import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import {
  AddButton,
  EmptyState,
  ExpiryPill,
  PageHeader,
  daysUntil,
  formatDate,
} from "@/components/ui";
import { DeleteButton } from "@/components/ui-client";
import { deleteRegistration } from "./actions";
import {
  levelLabel,
  regStatusLabel,
  regStatusPillClass,
  type RegistrationRow,
} from "./labels";

function RegistrationCard({
  registration,
}: {
  registration: RegistrationRow;
}) {
  const expiry = formatDate(registration.expiry_date);
  const reminders = registration.renewal_reminder_days ?? [];

  return (
    <article className="card-lux space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-forest">
            {registration.name}
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {levelLabel(registration.level)} registration
          </p>
        </div>
        <span
          className={`pill shrink-0 ${regStatusPillClass(registration.status)}`}
        >
          {regStatusLabel(registration.status)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ExpiryPill dateStr={registration.expiry_date} />
        {expiry && (
          <span className="text-xs text-ink-faint">Expires {expiry}</span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {registration.uei && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              UEI
            </dt>
            <dd className="text-ink">{registration.uei}</dd>
          </div>
        )}
        {registration.cage && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              CAGE
            </dt>
            <dd className="text-ink">{registration.cage}</dd>
          </div>
        )}
        {registration.registration_number && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              Reg. number
            </dt>
            <dd className="text-ink">{registration.registration_number}</dd>
          </div>
        )}
        {reminders.length > 0 && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              Renewal reminders
            </dt>
            <dd className="text-ink">{reminders.join(", ")} days before</dd>
          </div>
        )}
      </dl>

      {registration.notes && (
        <p className="whitespace-pre-wrap text-sm text-ink-soft">
          {registration.notes}
        </p>
      )}

      <div className="flex gap-2 border-t border-ink/10 pt-3">
        <Link
          href={`/app/registrations/${registration.id}/edit`}
          className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
        >
          Edit
        </Link>
        <DeleteButton
          action={deleteRegistration.bind(null, registration.id)}
          confirmText={`Delete the ${registration.name} registration? This cannot be undone.`}
        />
      </div>
    </article>
  );
}

export default async function RegistrationsPage() {
  const supabase = await createClient();
  const businessId = await getBusinessId();

  let registrations: RegistrationRow[] = [];
  if (businessId) {
    const { data } = await supabase
      .from("registrations")
      .select(
        "id, name, level, status, registration_number, uei, cage, issued_date, expiry_date, renewal_reminder_days, notes"
      )
      .eq("business_id", businessId)
      .order("expiry_date", { ascending: true, nullsFirst: false });
    registrations = (data ?? []) as RegistrationRow[];
  }

  // Needs attention: expired/inactive status, or expiry within 90 days / past due
  const needsAttention = registrations.filter((r) => {
    if (r.status === "expired" || r.status === "inactive") return true;
    const days = daysUntil(r.expiry_date);
    return days !== null && days <= 90;
  });
  const attentionIds = new Set(needsAttention.map((r) => r.id));
  const rest = registrations.filter((r) => !attentionIds.has(r.id));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Registrations"
        action={
          <AddButton href="/app/registrations/new" label="+ New registration" />
        }
      />

      {registrations.length === 0 ? (
        <EmptyState
          title="No registrations tracked yet"
          body="Most bids require an active registration, like SAM.gov for federal work or your state vendor portal. Track each one here and the Hub watches the renewal dates."
          ctaHref="/app/registrations/new"
          ctaLabel="Track your first registration"
        />
      ) : (
        <>
          {needsAttention.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-[#8c3b2e]">
                Needs attention
              </h2>
              <div className="space-y-4">
                {needsAttention.map((r) => (
                  <RegistrationCard key={r.id} registration={r} />
                ))}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section className="space-y-3">
              {needsAttention.length > 0 && (
                <h2 className="font-display text-lg font-semibold text-forest">
                  All clear
                </h2>
              )}
              <div className="space-y-4">
                {rest.map((r) => (
                  <RegistrationCard key={r.id} registration={r} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
