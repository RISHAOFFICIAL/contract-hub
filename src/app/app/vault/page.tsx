import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { getPlanAccess } from "@/lib/billing";
import {
  AddButton,
  EmptyState,
  ExpiryPill,
  PageHeader,
  formatDate,
} from "@/components/ui";
import { DeleteButton } from "@/components/ui-client";
import { deleteVaultDocument, setVaultStatus, type VaultRow } from "./actions";
import { vaultStatusPillClass, vaultStatusLabel } from "./labels";

function VaultCard({ document }: { document: VaultRow }) {
  const expiry = formatDate(document.expiry_date);

  // Toggle target: have <-> need, expired -> have
  const toggleTarget =
    document.status === "have"
      ? "need"
      : document.status === "need"
        ? "have"
        : "have";
  const toggleLabel =
    document.status === "have" ? "Mark needed" : "Mark as have";

  return (
    <article className="card-lux space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-forest">
            {document.name}
          </p>
          {document.category && (
            <p className="mt-0.5 text-sm text-ink-soft">{document.category}</p>
          )}
        </div>
        <span
          className={`pill shrink-0 ${vaultStatusPillClass(document.status)}`}
        >
          {vaultStatusLabel(document.status)}
        </span>
      </div>

      {document.expiry_date && (
        <div className="flex items-center gap-2 text-sm">
          <ExpiryPill dateStr={document.expiry_date} warnDays={60} />
          <span className="text-xs text-ink-faint">Expires {expiry}</span>
        </div>
      )}

      {document.notes && (
        <p className="whitespace-pre-wrap text-sm text-ink-soft">
          {document.notes}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-3">
        <form action={setVaultStatus.bind(null, document.id, toggleTarget)}>
          <button
            type="submit"
            className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
          >
            {toggleLabel}
          </button>
        </form>
        {document.status === "have" && (
          <form action={setVaultStatus.bind(null, document.id, "expired")}>
            <button
              type="submit"
              className="btn-glass glass px-4 py-2 text-sm font-semibold text-[#8c3b2e]"
            >
              Mark expired
            </button>
          </form>
        )}
        <Link
          href={`/app/vault/${document.id}/edit`}
          className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
        >
          Edit
        </Link>
        <DeleteButton
          action={deleteVaultDocument.bind(null, document.id)}
          confirmText={`Remove ${document.name} from the checklist? This cannot be undone.`}
        />
      </div>
    </article>
  );
}

const GROUPS = [
  { value: "need", title: "Need", body: "Documents to gather before your next bid." },
  { value: "have", title: "Have", body: "Documents on file and ready to attach." },
  { value: "expired", title: "Expired", body: "Renew these before they block a bid." },
];

export default async function VaultPage() {
  const supabase = await createClient();
  const businessId = await getBusinessId();
  const access = await getPlanAccess();

  let documents: VaultRow[] = [];
  if (businessId) {
    const { data } = await supabase
      .from("vault_documents")
      .select("id, name, category, status, expiry_date, notes")
      .eq("business_id", businessId)
      .order("name", { ascending: true });
    documents = (data ?? []) as VaultRow[];
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vault"
        action={<AddButton href="/app/vault/new" label="+ New document" />}
      />

      <p className="rounded-2xl bg-brass-pale px-4 py-3 text-sm text-ink-soft">
        File uploads arrive in a later phase; this is your checklist for now.
        {access.isPro ? (
          " Pro members will be able to upload files here when uploads launch."
        ) : (
          <>
            {" "}
            File uploads are a Pro feature.{" "}
            <Link
              href="/app/plan"
              className="font-semibold text-forest underline"
            >
              Upgrade to Pro
            </Link>{" "}
            to upload files when uploads launch.
          </>
        )}
      </p>

      {documents.length === 0 ? (
        <EmptyState
          title="Your vault is empty"
          body="Bids ask for the same documents again and again: your W-9, insurance certificates, articles of organization. List them here so nothing is missing at deadline time."
          ctaHref="/app/vault/new"
          ctaLabel="Start the checklist"
        />
      ) : (
        <div className="space-y-6">
          {GROUPS.map((group) => {
            const items = documents.filter((d) => d.status === group.value);
            if (items.length === 0) return null;
            return (
              <section key={group.value} className="space-y-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-forest">
                    {group.title}{" "}
                    <span className="text-sm font-sans font-semibold text-ink-faint">
                      ({items.length})
                    </span>
                  </h2>
                  <p className="text-sm text-ink-faint">{group.body}</p>
                </div>
                <div className="space-y-4">
                  {items.map((d) => (
                    <VaultCard key={d.id} document={d} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
