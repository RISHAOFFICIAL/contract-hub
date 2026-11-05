import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import {
  DeadlinePill,
  formatDate,
  formatMoney,
  PageHeader,
} from "@/components/ui";
import { DeleteButton } from "@/components/ui-client";
import { deleteContract } from "../actions";
import { StageMoveButtons } from "../contract-card";
import { stageLabel, stagePillClass, type ContractRow } from "../stages";
import TalkToUpdate from "./talk-to-update";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="rounded-xl bg-ivory px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-ink">{value}</p>
    </div>
  );
}

export default async function ContractDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) notFound();

  const { data } = await supabase
    .from("contracts")
    .select(
      "id, title, buyer, buyer_type, stage, contract_value, deadline, solicitation_number, source_url, naics, set_aside, description, notes"
    )
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  if (!data) notFound();
  const contract = data as ContractRow;

  const value = formatMoney(contract.contract_value);
  const deadline = formatDate(contract.deadline);

  return (
    <div className="space-y-5">
      <PageHeader
        title={contract.title}
        action={
          <Link
            href="/app/contracts"
            className="btn-glass glass shrink-0 px-4 py-2 text-sm font-semibold text-forest"
          >
            All contracts
          </Link>
        }
      />

      <section className="card-lux space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`pill ${stagePillClass(contract.stage)}`}>
            {stageLabel(contract.stage)}
          </span>
          <DeadlinePill dateStr={contract.deadline} />
          {deadline && (
            <span className="text-xs text-ink-faint">Due {deadline}</span>
          )}
          {value && (
            <span className="pill pill-muted font-semibold">{value}</span>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <DetailRow label="Buyer" value={contract.buyer} />
          <DetailRow label="Buyer type" value={contract.buyer_type} />
          <DetailRow
            label="Solicitation number"
            value={contract.solicitation_number}
          />
          <DetailRow label="NAICS" value={contract.naics} />
          <DetailRow label="Set aside" value={contract.set_aside} />
          {contract.source_url && (
            <div className="rounded-xl bg-ivory px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Source
              </p>
              <a
                href={contract.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 block break-all text-sm font-semibold text-brass-dark underline"
              >
                {contract.source_url}
              </a>
            </div>
          )}
        </div>

        {contract.description && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Description
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
              {contract.description}
            </p>
          </div>
        )}

        {contract.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
              {contract.notes}
            </p>
          </div>
        )}

        <div className="border-t border-ink/10 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Move stage
          </p>
          <StageMoveButtons contract={contract} />
        </div>

        <div className="flex gap-2 border-t border-ink/10 pt-4">
          <Link
            href={`/app/contracts/${contract.id}/edit`}
            className="btn-glass glass px-4 py-2 text-sm font-semibold text-forest"
          >
            Edit
          </Link>
          <DeleteButton
            action={deleteContract.bind(null, contract.id)}
            confirmText="Delete this contract and its history? This cannot be undone."
          />
        </div>
      </section>

      {/* Workbench: live */}
      <section className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-forest">
              Proposal Workbench
            </h2>
            <p className="mt-1 text-sm text-ink-faint">
              Compliance matrix, solicitation analyzer, proposal builder,
              supplier quotes, margin calculator, submission checklist, and
              guardrails for this bid.
            </p>
          </div>
          <Link
            href={`/app/contracts/${contract.id}/workbench`}
            className="btn-glass btn-primary-glass shrink-0 px-5 py-2.5 text-sm"
          >
            Open workbench
          </Link>
        </div>
      </section>

      {/* Talk to update */}
      <section className="glass rounded-3xl p-6">
        <h2 className="font-display text-lg font-semibold text-forest">
          Talk to update
        </h2>
        <p className="mt-1 text-sm text-ink-faint">
          Speak or type what changed and review the plan before anything is
          applied.
        </p>
        <div className="mt-4">
          <TalkToUpdate contractId={contract.id} />
        </div>
      </section>

      {/* Later phases */}
      {["Milestones", "Invoices"].map((section) => (
        <section key={section} className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-semibold text-forest">
            {section}
          </h2>
          <p className="mt-1 text-sm text-ink-faint">
            Coming in a later phase. Delivery milestones and invoicing arrive
            next.
          </p>
        </section>
      ))}
    </div>
  );
}
