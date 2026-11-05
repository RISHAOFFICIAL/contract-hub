import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import {
  DeadlinePill,
  EmptyState,
  Field,
  PageHeader,
  Select,
  TextArea,
  TextInput,
  formatDate,
  formatMoney,
} from "@/components/ui";
import { DeleteButton, SubmitButton } from "@/components/ui-client";
import { stageLabel, stagePillClass } from "../../stages";
import {
  addComplianceItem,
  addSupplierQuote,
  buildDraftFromData,
  deleteComplianceItem,
  deleteProposalVersion,
  deleteSupplierQuote,
  saveProposalSections,
  saveProposalVersion,
  seedComplianceItems,
  setComplianceStatus,
  updateComplianceItem,
  updateSupplierQuote,
} from "./actions";
import {
  COMPLIANCE_STATUSES,
  PROPOSAL_SECTION_TITLES,
  complianceStatusLabel,
  complianceStatusPillClass,
} from "./workbench-lib";
import {
  AnalyzerPanel,
  ChecklistToggle,
  GuardrailsCard,
  MarginCalculator,
  type QuoteOption,
} from "./workbench-client";

type ComplianceItem = {
  id: string;
  requirement: string;
  category: string;
  status: string;
  notes: string | null;
};

type ProposalSection = {
  id: string;
  title: string;
  body: string | null;
};

type ProposalVersion = {
  id: string;
  version_number: number;
  snapshot: Record<string, string>;
  created_at: string | null;
};

type Quote = {
  id: string;
  supplier_id: string | null;
  unit_price: number | null;
  quantity: number | null;
  shipping: number | null;
  total_landed: number | null;
  notes: string | null;
  suppliers: { name: string }[] | null;
};

type Supplier = { id: string; name: string };

function SectionCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="card-lux space-y-4 p-6">
      <h2 className="font-display text-xl font-semibold text-forest">{title}</h2>
      {children}
    </section>
  );
}

function ComplianceItemCard({
  item,
  contractId,
}: {
  item: ComplianceItem;
  contractId: string;
}) {
  return (
    <article className="rounded-2xl border border-ink/10 bg-white/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{item.requirement}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`pill ${complianceStatusPillClass(item.status)}`}
            >
              {complianceStatusLabel(item.status)}
            </span>
            {item.category === "submission" && (
              <span className="pill pill-muted">Checklist</span>
            )}
          </div>
        </div>
        <DeleteButton
          action={deleteComplianceItem.bind(null, item.id, contractId)}
          confirmText="Remove this compliance item?"
        />
      </div>
      {item.notes && (
        <p className="mt-2 text-sm italic text-ink-soft">{item.notes}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {COMPLIANCE_STATUSES.map((s) => (
          <form
            key={s.value}
            action={setComplianceStatus.bind(null, item.id, contractId, s.value)}
          >
            <button
              type="submit"
              disabled={item.status === s.value}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                item.status === s.value
                  ? "bg-forest text-white"
                  : "bg-ivory text-ink-soft"
              } disabled:opacity-70`}
            >
              {s.label}
            </button>
          </form>
        ))}
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-brass-dark">
          Edit
        </summary>
        <form
          action={updateComplianceItem.bind(null, item.id, contractId)}
          className="mt-2 space-y-3"
        >
          <Field label="Requirement">
            <TextInput name="requirement" defaultValue={item.requirement} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category">
              <Select name="category" defaultValue={item.category}>
                <option value="compliance">Compliance</option>
                <option value="submission">Submission checklist</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={item.status}>
                {COMPLIANCE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <TextArea name="notes" defaultValue={item.notes ?? ""} rows={2} />
          </Field>
          <SubmitButton label="Save changes" />
        </form>
      </details>
    </article>
  );
}

export default async function WorkbenchPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();
  const businessId = await getBusinessId();
  if (!businessId) notFound();
  const contractId = params.id;

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, title, stage, deadline, solicitation_number")
    .eq("id", contractId)
    .eq("business_id", businessId)
    .single();
  if (!contract) notFound();

  const [itemsRes, sectionsRes, versionsRes, quotesRes, suppliersRes] =
    await Promise.all([
      supabase
        .from("compliance_items")
        .select("id, requirement, category, status, notes")
        .eq("business_id", businessId)
        .eq("contract_id", contractId)
        .order("created_at", { ascending: true }),
      supabase
        .from("proposal_sections")
        .select("id, title, body")
        .eq("business_id", businessId)
        .eq("contract_id", contractId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("proposal_versions")
        .select("id, version_number, snapshot, created_at")
        .eq("business_id", businessId)
        .eq("contract_id", contractId)
        .order("version_number", { ascending: false }),
      supabase
        .from("supplier_quotes")
        .select(
          "id, supplier_id, unit_price, quantity, shipping, total_landed, notes, suppliers(name)"
        )
        .eq("business_id", businessId)
        .eq("contract_id", contractId)
        .order("created_at", { ascending: true }),
      supabase
        .from("suppliers")
        .select("id, name")
        .eq("business_id", businessId)
        .order("name", { ascending: true }),
    ]);

  const items = (itemsRes.data ?? []) as ComplianceItem[];
  const sections = (sectionsRes.data ?? []) as ProposalSection[];
  const versions = (versionsRes.data ?? []) as ProposalVersion[];
  const quotes = (quotesRes.data ?? []) as Quote[];
  const suppliers = (suppliersRes.data ?? []) as Supplier[];

  const catFilter =
    typeof searchParams.cat === "string" ? searchParams.cat : "all";
  const visibleItems =
    catFilter === "all"
      ? items
      : items.filter((i) => i.category === catFilter);
  const checklistItems = items.filter((i) => i.category === "submission");

  const sectionBodies = new Map(sections.map((s) => [s.title, s.body ?? ""]));

  const viewingVersionNum =
    typeof searchParams.version === "string"
      ? Number(searchParams.version)
      : null;
  const viewingVersion =
    viewingVersionNum !== null
      ? versions.find((v) => v.version_number === viewingVersionNum) ?? null
      : null;

  const quoteOptions: QuoteOption[] = quotes.map((q) => ({
    id: q.id,
    supplierName: q.suppliers?.[0]?.name ?? "Unnamed supplier",
    totalLanded: Number(q.total_landed ?? 0),
  }));

  const wbBase = `/app/contracts/${contractId}/workbench`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Proposal Workbench"
        eyebrow={contract.title}
        action={
          <Link
            href={`/app/contracts/${contractId}`}
            className="btn-glass glass shrink-0 px-4 py-2 text-sm font-semibold text-forest"
          >
            Contract detail
          </Link>
        }
      />

      <div className="card-lux flex flex-wrap items-center gap-2 p-4">
        <span className={`pill ${stagePillClass(contract.stage)}`}>
          {stageLabel(contract.stage)}
        </span>
        <DeadlinePill dateStr={contract.deadline} />
        {contract.solicitation_number && (
          <span className="text-xs text-ink-faint">
            Solicitation {contract.solicitation_number}
          </span>
        )}
      </div>

      {/* (a) Compliance matrix */}
      <SectionCard id="compliance" title="Compliance Matrix">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: "all", label: "All" },
            { value: "compliance", label: "Compliance" },
            { value: "submission", label: "Submission checklist" },
          ].map((f) => (
            <Link
              key={f.value}
              href={
                f.value === "all" ? wbBase : `${wbBase}?cat=${f.value}`
              }
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                catFilter === f.value
                  ? "bg-forest text-white"
                  : "bg-ivory text-ink-soft"
              }`}
            >
              {f.label}
            </Link>
          ))}
          <div className="ml-auto">
            <form action={seedComplianceItems.bind(null, contractId)}>
              <button
                type="submit"
                disabled={items.length > 0}
                className="btn-glass glass px-4 py-2 text-xs font-semibold text-forest disabled:opacity-50"
              >
                Seed starter items
              </button>
            </form>
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <EmptyState
            title="No compliance items yet"
            body="Seed the 8 starter items, or add your own. Starter items are marked as items to verify against the official solicitation."
          />
        ) : (
          <div className="space-y-3">
            {visibleItems.map((item) => (
              <ComplianceItemCard
                key={item.id}
                item={item}
                contractId={contractId}
              />
            ))}
          </div>
        )}

        <details className="rounded-2xl border border-ink/10 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-forest">
            Add compliance item
          </summary>
          <form
            action={addComplianceItem.bind(null, contractId)}
            className="mt-3 space-y-3"
          >
            <Field label="Requirement">
              <TextInput
                name="requirement"
                placeholder="e.g. Certificate of Insurance"
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category">
                <Select name="category" defaultValue="compliance">
                  <option value="compliance">Compliance</option>
                  <option value="submission">Submission checklist</option>
                </Select>
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue="pending">
                  {COMPLIANCE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Notes">
              <TextArea name="notes" rows={2} />
            </Field>
            <SubmitButton label="Add item" />
          </form>
        </details>
      </SectionCard>

      {/* (b) Solicitation analyzer */}
      <SectionCard id="analyzer" title="Solicitation Analyzer">
        <p className="text-sm text-ink-soft">
          Paste solicitation text to pull out draft dates, forms, and terms.
          Everything below is a suggestion, not a fact: verify each value
          against the official solicitation before relying on it.
        </p>
        <AnalyzerPanel contractId={contractId} />
      </SectionCard>

      {/* (c) Proposal builder */}
      <SectionCard id="proposal" title="Proposal Builder">
        {viewingVersion ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">
                Viewing version {viewingVersion.version_number}
                {viewingVersion.created_at && (
                  <span className="ml-2 font-normal text-ink-faint">
                    saved {formatDate(viewingVersion.created_at)}
                  </span>
                )}
              </p>
              <Link
                href={wbBase}
                className="btn-glass glass px-4 py-2 text-xs font-semibold text-forest"
              >
                Back to editor
              </Link>
            </div>
            {PROPOSAL_SECTION_TITLES.map((title) => (
              <div
                key={title}
                className="rounded-2xl border border-ink/10 bg-white/60 p-4"
              >
                <h3 className="font-display text-base font-semibold text-forest">
                  {title}
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
                  {viewingVersion.snapshot?.[title] || "No content in this version."}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <>
            <form action={saveProposalSections.bind(null, contractId)} className="space-y-4">
              {PROPOSAL_SECTION_TITLES.map((title) => (
                <Field key={title} label={title}>
                  <TextArea
                    name={`section_${title}`}
                    defaultValue={sectionBodies.get(title) ?? ""}
                    rows={6}
                    placeholder={`Write the ${title.toLowerCase()} here...`}
                  />
                </Field>
              ))}
              <div className="flex flex-wrap gap-2">
                <SubmitButton label="Save sections" />
                <button
                  type="submit"
                  formAction={buildDraftFromData.bind(null, contractId)}
                  className="btn-glass glass px-6 py-3 text-sm font-semibold text-forest"
                >
                  Build draft from my data
                </button>
                <button
                  type="submit"
                  formAction={saveProposalVersion.bind(null, contractId)}
                  className="btn-glass glass px-6 py-3 text-sm font-semibold text-forest"
                >
                  Save version
                </button>
              </div>
            </form>

            <div className="border-t border-ink/10 pt-4">
              <p className="mb-2 text-sm font-semibold text-ink">
                Saved versions
              </p>
              {versions.length === 0 ? (
                <p className="text-sm text-ink-faint">
                  No versions yet. Save a version to snapshot your proposal as
                  it stands today.
                </p>
              ) : (
                <ul className="space-y-2">
                  {versions.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-ivory px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          Version {v.version_number}
                        </p>
                        {v.created_at && (
                          <p className="text-xs text-ink-faint">
                            Saved {formatDate(v.created_at)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`${wbBase}?version=${v.version_number}#proposal`}
                          className="rounded-xl bg-forest px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          View
                        </Link>
                        <DeleteButton
                          action={deleteProposalVersion.bind(null, v.id, contractId)}
                          confirmText={`Delete version ${v.version_number}?`}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </SectionCard>

      {/* (d) Supplier quotes */}
      <SectionCard id="quotes" title="Supplier Quotes">
        {quotes.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            body="Add supplier quotes to compare landed costs and feed the margin calculator."
          />
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => (
              <article
                key={q.id}
                className="rounded-2xl border border-ink/10 bg-white/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">
                      {q.suppliers?.[0]?.name ?? "Unnamed supplier"}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {formatMoney(q.unit_price)} x{" "}
                      {Number(q.quantity ?? 0).toLocaleString()} +{" "}
                      {formatMoney(q.shipping)} shipping
                    </p>
                    <p className="mt-1 text-sm font-semibold text-forest">
                      Landed cost: {formatMoney(q.total_landed)}
                    </p>
                  </div>
                  <DeleteButton
                    action={deleteSupplierQuote.bind(null, q.id, contractId)}
                    confirmText="Delete this quote?"
                  />
                </div>
                {q.notes && (
                  <p className="mt-2 text-sm italic text-ink-soft">{q.notes}</p>
                )}
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-brass-dark">
                    Edit
                  </summary>
                  <form
                    action={updateSupplierQuote.bind(null, q.id, contractId)}
                    className="mt-2 space-y-3"
                  >
                    <Field label="Supplier">
                      <Select
                        name="supplier_id"
                        defaultValue={q.supplier_id ?? ""}
                      >
                        <option value="">No supplier</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Unit price ($)">
                        <TextInput
                          name="unit_price"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={q.unit_price ?? ""}
                        />
                      </Field>
                      <Field label="Quantity">
                        <TextInput
                          name="quantity"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={q.quantity ?? ""}
                        />
                      </Field>
                      <Field label="Shipping ($)">
                        <TextInput
                          name="shipping"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={q.shipping ?? ""}
                        />
                      </Field>
                    </div>
                    <Field label="Notes">
                      <TextArea
                        name="notes"
                        defaultValue={q.notes ?? ""}
                        rows={2}
                      />
                    </Field>
                    <SubmitButton label="Save quote" />
                  </form>
                </details>
              </article>
            ))}
          </div>
        )}

        <details className="rounded-2xl border border-ink/10 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-forest">
            Add supplier quote
          </summary>
          <form
            action={addSupplierQuote.bind(null, contractId)}
            className="mt-3 space-y-3"
          >
            <Field label="Supplier">
              <Select name="supplier_id" defaultValue="">
                <option value="">Choose a supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Unit price ($)">
                <TextInput
                  name="unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </Field>
              <Field label="Quantity">
                <TextInput
                  name="quantity"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                />
              </Field>
              <Field label="Shipping ($)">
                <TextInput
                  name="shipping"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </Field>
            </div>
            <p className="text-xs text-ink-faint">
              Total landed cost is computed automatically as (unit price x
              quantity) + shipping.
            </p>
            <Field label="Notes">
              <TextArea name="notes" rows={2} />
            </Field>
            <SubmitButton label="Add quote" />
          </form>
        </details>
      </SectionCard>

      {/* (e) Margin calculator */}
      <SectionCard id="margin" title="Margin Calculator">
        <p className="text-sm text-ink-soft">
          Quick check: enter your bid price and pick a quote (or enter cost
          manually) to see gross profit and margin.
        </p>
        <MarginCalculator quotes={quoteOptions} />
      </SectionCard>

      {/* (f) Submission checklist */}
      <SectionCard id="checklist" title="Submission Checklist">
        {checklistItems.length === 0 ? (
          <EmptyState
            title="Checklist is empty"
            body="Add checklist items to track everything that must go in the envelope: forms, copies, signatures, packaging."
          />
        ) : (
          <ul className="space-y-2">
            {checklistItems.map((item) => (
              <li key={item.id}>
                <ChecklistToggle
                  itemId={item.id}
                  contractId={contractId}
                  checked={item.status === "met"}
                  label={item.requirement}
                />
              </li>
            ))}
          </ul>
        )}
        <form
          action={addComplianceItem.bind(null, contractId)}
          className="flex gap-2"
        >
          <input type="hidden" name="category" value="submission" />
          <TextInput
            name="requirement"
            placeholder="Add checklist item, e.g. Signed cover letter"
            required
            aria-label="New checklist item"
          />
          <button
            type="submit"
            className="btn-glass btn-primary-glass shrink-0 px-5 py-2.5 text-sm"
          >
            Add
          </button>
        </form>
      </SectionCard>

      {/* (3) Guardrails */}
      <SectionCard id="guardrails" title="Guardrails">
        <GuardrailsCard />
      </SectionCard>

      <div className="pb-8">
        <Link
          href={`/app/contracts/${contractId}`}
          className="text-sm font-semibold text-brass-dark"
        >
          {"<"} Back to contract
        </Link>
      </div>
    </div>
  );
}
