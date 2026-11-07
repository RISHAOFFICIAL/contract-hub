import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import {
  DeadlinePill,
  Field,
  formatDate,
  formatMoney,
  PageHeader,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui";
import { DeleteButton, SubmitButton } from "@/components/ui-client";
import { deleteContract } from "../actions";
import {
  addInvoice,
  addMilestone,
  deleteInvoice,
  deleteMilestone,
  setInvoiceStatus,
  toggleMilestone,
} from "./milestones-invoices-actions";
import { StageMoveButtons } from "../contract-card";
import { stageLabel, stagePillClass, type ContractRow } from "../stages";
import TalkToUpdate from "./talk-to-update";

type MilestoneRow = {
  id: string;
  title: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  amount: number | string | null;
  issued_date: string | null;
  due_date: string | null;
  status: string | null;
  paid_at: string | null;
  notes: string | null;
};

function invoicePillClass(status: string | null): string {
  if (status === "paid") return "pill-active";
  if (status === "sent") return "pill-warn";
  if (status === "overdue") return "pill-bad";
  return "pill-muted";
}

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

  const [{ data: milestoneRows }, { data: invoiceRows }] = await Promise.all([
    supabase
      .from("milestones")
      .select("id, title, due_date, completed, completed_at, notes")
      .eq("business_id", businessId)
      .eq("contract_id", contract.id)
      .order("completed", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, amount, issued_date, due_date, status, paid_at, notes"
      )
      .eq("business_id", businessId)
      .eq("contract_id", contract.id)
      .order("created_at", { ascending: false }),
  ]);

  const milestones = (milestoneRows ?? []) as MilestoneRow[];
  const invoices = (invoiceRows ?? []) as InvoiceRow[];

  const value = formatMoney(contract.contract_value);
  const deadline = formatDate(contract.deadline);
  const milestonesDone = milestones.filter((m) => m.completed).length;
  const invoicesPaidTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const invoicesOutstandingTotal = invoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

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

      {/* Milestones */}
      <section className="glass rounded-3xl p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-forest">
            Milestones
          </h2>
          <span className="text-sm text-ink-faint">
            {milestonesDone} of {milestones.length} complete
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-faint">
          Delivery milestones for this contract. Milestones added with Talk to
          update show up here too.
        </p>

        {milestones.length === 0 ? (
          <p className="mt-4 rounded-xl bg-ivory px-4 py-3 text-sm text-ink-soft">
            No milestones yet. Add the first one below.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {milestones.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-ivory px-4 py-3"
              >
                <form
                  action={toggleMilestone.bind(
                    null,
                    m.id,
                    contract.id,
                    !m.completed
                  )}
                >
                  <button
                    type="submit"
                    className="btn-glass glass shrink-0 px-3 py-1.5 text-xs font-semibold text-forest"
                  >
                    {m.completed ? "Reopen" : "Mark complete"}
                  </button>
                </form>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold text-ink ${
                      m.completed ? "line-through opacity-60" : ""
                    }`}
                  >
                    {m.title}
                  </p>
                  {m.notes && (
                    <p className="mt-0.5 whitespace-pre-wrap text-xs text-ink-soft">
                      {m.notes}
                    </p>
                  )}
                </div>
                {m.completed ? (
                  <span className="pill pill-active">Done</span>
                ) : (
                  <DeadlinePill dateStr={m.due_date} />
                )}
                {m.due_date && (
                  <span className="text-xs text-ink-faint">
                    Due {formatDate(m.due_date)}
                  </span>
                )}
                <DeleteButton
                  action={deleteMilestone.bind(null, m.id, contract.id)}
                  confirmText="Delete this milestone? This cannot be undone."
                />
              </li>
            ))}
          </ul>
        )}

        <form
          action={addMilestone.bind(null, contract.id)}
          className="mt-5 space-y-3 border-t border-ink/10 pt-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Milestone title">
              <TextInput
                name="title"
                required
                placeholder="e.g. Deliver first shipment"
              />
            </Field>
            <Field label="Due date">
              <TextInput name="due_date" type="date" />
            </Field>
          </div>
          <Field label="Notes (optional)">
            <TextArea
              name="notes"
              rows={2}
              placeholder="What counts as done for this milestone?"
            />
          </Field>
          <SubmitButton label="Add milestone" />
        </form>
      </section>

      {/* Invoices */}
      <section className="glass rounded-3xl p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-forest">
            Invoices
          </h2>
          <span className="text-sm text-ink-faint">
            Paid {formatMoney(invoicesPaidTotal) ?? "$0"} · Outstanding{" "}
            {formatMoney(invoicesOutstandingTotal) ?? "$0"}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-faint">
          Invoices for this contract. Invoice drafts created with Talk to
          update show up here too. Marking an invoice paid counts toward the
          First invoice paid badge.
        </p>

        {invoices.length === 0 ? (
          <p className="mt-4 rounded-xl bg-ivory px-4 py-3 text-sm text-ink-soft">
            No invoices yet. Add the first one below.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-ivory px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {inv.invoice_number ?? "Invoice"} ·{" "}
                    {formatMoney(inv.amount) ?? "No amount"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {inv.issued_date
                      ? `Issued ${formatDate(inv.issued_date)}`
                      : "Not issued yet"}
                    {inv.due_date ? ` · Due ${formatDate(inv.due_date)}` : ""}
                    {inv.paid_at ? ` · Paid ${formatDate(inv.paid_at)}` : ""}
                  </p>
                  {inv.notes && (
                    <p className="mt-0.5 whitespace-pre-wrap text-xs text-ink-soft">
                      {inv.notes}
                    </p>
                  )}
                </div>
                <span className={`pill ${invoicePillClass(inv.status)}`}>
                  {(inv.status ?? "draft").toUpperCase()}
                </span>
                {inv.status === "draft" && (
                  <form
                    action={setInvoiceStatus.bind(
                      null,
                      inv.id,
                      contract.id,
                      "sent"
                    )}
                  >
                    <button
                      type="submit"
                      className="btn-glass glass shrink-0 px-3 py-1.5 text-xs font-semibold text-forest"
                    >
                      Mark sent
                    </button>
                  </form>
                )}
                {inv.status !== "paid" && (
                  <form
                    action={setInvoiceStatus.bind(
                      null,
                      inv.id,
                      contract.id,
                      "paid"
                    )}
                  >
                    <button
                      type="submit"
                      className="btn-glass btn-primary-glass shrink-0 px-3 py-1.5 text-xs"
                    >
                      Mark paid
                    </button>
                  </form>
                )}
                <DeleteButton
                  action={deleteInvoice.bind(null, inv.id, contract.id)}
                  confirmText="Delete this invoice? This cannot be undone."
                />
              </li>
            ))}
          </ul>
        )}

        <form
          action={addInvoice.bind(null, contract.id)}
          className="mt-5 space-y-3 border-t border-ink/10 pt-4"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Amount">
              <TextInput
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 2500"
              />
            </Field>
            <Field label="Issued date">
              <TextInput name="issued_date" type="date" />
            </Field>
            <Field label="Due date">
              <TextInput name="due_date" type="date" />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status">
              <Select name="status" defaultValue="draft">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </Select>
            </Field>
            <Field label="Notes (optional)">
              <TextInput
                name="notes"
                placeholder="e.g. First delivery, 50 percent"
              />
            </Field>
          </div>
          <p className="text-xs text-ink-faint">
            Invoice numbers are assigned automatically (INV-0001, INV-0002,
            and so on).
          </p>
          <SubmitButton label="Add invoice" />
        </form>
      </section>
    </div>
  );
}
