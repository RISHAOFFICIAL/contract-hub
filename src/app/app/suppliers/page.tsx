import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { AddButton, EmptyState, PageHeader } from "@/components/ui";
import { DeleteButton } from "@/components/ui-client";
import { deleteSupplier, setOutreachStatus } from "./actions";
import {
  nextOutreachStatus,
  outreachLabel,
  outreachPillClass,
  type SupplierRow,
} from "./labels";

function SupplierCard({ supplier }: { supplier: SupplierRow }) {
  const next = nextOutreachStatus(supplier.outreach_status);
  const declined = supplier.outreach_status === "declined";
  const categories = supplier.categories ?? [];

  return (
    <article className="card-lux space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-forest">
            {supplier.name}
          </p>
          {supplier.contact_name && (
            <p className="mt-0.5 text-sm text-ink-soft">
              {supplier.contact_name}
            </p>
          )}
        </div>
        <span
          className={`pill shrink-0 ${outreachPillClass(supplier.outreach_status)}`}
        >
          {outreachLabel(supplier.outreach_status)}
        </span>
      </div>

      {(supplier.email || supplier.phone) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {supplier.email && (
            <a
              href={`mailto:${supplier.email}`}
              className="font-medium text-brass-dark underline"
            >
              {supplier.email}
            </a>
          )}
          {supplier.phone && (
            <a
              href={`tel:${supplier.phone}`}
              className="font-medium text-brass-dark underline"
            >
              {supplier.phone}
            </a>
          )}
        </div>
      )}

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <span key={c} className="pill pill-muted">
              {c}
            </span>
          ))}
        </div>
      )}

      {supplier.notes && (
        <p className="whitespace-pre-wrap text-sm text-ink-soft">
          {supplier.notes}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
        {next && (
          <form
            action={setOutreachStatus.bind(null, supplier.id, next.value)}
          >
            <button
              type="submit"
              className="btn-glass btn-primary-glass px-4 py-2 text-sm"
            >
              Mark {next.label.toLowerCase()}
            </button>
          </form>
        )}
        {!declined && supplier.outreach_status !== "active" && (
          <form action={setOutreachStatus.bind(null, supplier.id, "declined")}>
            <button
              type="submit"
              className="btn-glass glass px-4 py-2 text-sm font-semibold text-[#8c3b2e]"
            >
              Decline
            </button>
          </form>
        )}
        {declined && (
          <form
            action={setOutreachStatus.bind(null, supplier.id, "to_contact")}
          >
            <button
              type="submit"
              className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
            >
              Reopen
            </button>
          </form>
        )}
        <Link
          href={`/app/suppliers/${supplier.id}/edit`}
          className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
        >
          Edit
        </Link>
        <DeleteButton
          action={deleteSupplier.bind(null, supplier.id)}
          confirmText={`Delete ${supplier.name}? This cannot be undone.`}
        />
      </div>
    </article>
  );
}

export default async function SuppliersPage() {
  const supabase = await createClient();
  const businessId = await getBusinessId();

  let suppliers: SupplierRow[] = [];
  if (businessId) {
    const { data } = await supabase
      .from("suppliers")
      .select(
        "id, name, contact_name, email, phone, categories, outreach_status, notes"
      )
      .eq("business_id", businessId)
      .order("name", { ascending: true });
    suppliers = (data ?? []) as SupplierRow[];
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers"
        action={<AddButton href="/app/suppliers/new" label="+ New supplier" />}
      />

      {suppliers.length === 0 ? (
        <EmptyState
          title="No suppliers on the bench yet"
          body="When a bid needs subcontractors or materials, a ready supplier bench wins you time. Add the vendors you trust, and track outreach as it moves."
          ctaHref="/app/suppliers/new"
          ctaLabel="Add your first supplier"
        />
      ) : (
        <div className="space-y-4">
          {suppliers.map((s) => (
            <SupplierCard key={s.id} supplier={s} />
          ))}
        </div>
      )}
    </div>
  );
}
