import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import {
  AddButton,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import ContractCard from "./contract-card";
import { STAGES, stageLabel, type ContractRow } from "./stages";

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: { stage?: string };
}) {
  const supabase = await createClient();
  const businessId = await getBusinessId();

  const activeStage = searchParams.stage ?? "all";
  const stageFilter = STAGES.some((s) => s.value === activeStage)
    ? activeStage
    : "all";

  let contracts: ContractRow[] = [];
  const counts: Record<string, number> = {};

  if (businessId) {
    let query = supabase
      .from("contracts")
      .select(
        "id, title, buyer, buyer_type, stage, contract_value, deadline, solicitation_number, source_url, naics, set_aside, description, notes"
      )
      .eq("business_id", businessId)
      .order("deadline", { ascending: true, nullsFirst: false });

    if (stageFilter !== "all") query = query.eq("stage", stageFilter);

    const { data } = await query;
    contracts = (data ?? []) as ContractRow[];

    const { data: allStages } = await supabase
      .from("contracts")
      .select("stage")
      .eq("business_id", businessId);
    for (const row of allStages ?? []) {
      counts[row.stage] = (counts[row.stage] ?? 0) + 1;
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contracts"
        action={<AddButton href="/app/contracts/new" label="+ New contract" />}
      />

      {/* Stage filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/app/contracts"
          className={`pill ${stageFilter === "all" ? "pill-active" : "pill-muted"}`}
        >
          All ({total})
        </Link>
        {STAGES.map((s) => (
          <Link
            key={s.value}
            href={`/app/contracts?stage=${s.value}`}
            className={`pill ${stageFilter === s.value ? "pill-active" : "pill-muted"}`}
          >
            {s.label} ({counts[s.value] ?? 0})
          </Link>
        ))}
      </div>

      {contracts.length === 0 ? (
        <EmptyState
          title={
            stageFilter === "all"
              ? "No contracts tracked yet"
              : `No contracts in ${stageLabel(stageFilter)}`
          }
          body={
            stageFilter === "all"
              ? "Track a pursuit from the moment you spot it. The Hub follows it from watching all the way to closeout."
              : "Move contracts through the pipeline with the stage buttons, or track a new one."
          }
          ctaHref="/app/contracts/new"
          ctaLabel="Track your first contract"
        />
      ) : (
        <div className="space-y-4">
          {contracts.map((c) => (
            <ContractCard key={c.id} contract={c} />
          ))}
        </div>
      )}
    </div>
  );
}
