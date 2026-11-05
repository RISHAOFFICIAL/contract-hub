import Link from "next/link";
import {
  DeadlinePill,
  formatDate,
  formatMoney,
} from "@/components/ui";
import { moveContractStage } from "./actions";
import { STAGES, stageLabel, stagePillClass, type ContractRow } from "./stages";

export function StageMoveButtons({ contract }: { contract: ContractRow }) {
  const idx = STAGES.findIndex((s) => s.value === contract.stage);
  const prev = idx > 0 ? STAGES[idx - 1] : null;
  // "Lost" is a terminal branch, never an automatic advance target.
  const next =
    idx >= 0 && idx < STAGES.length - 1 && STAGES[idx + 1].value !== "lost"
      ? STAGES[idx + 1]
      : null;

  return (
    <div className="flex gap-2">
      {prev && (
        <form action={moveContractStage.bind(null, contract.id, prev.value)}>
          <button
            type="submit"
            className="btn-glass glass px-3 py-1.5 text-xs font-semibold text-forest"
          >
            {"<"} {prev.label}
          </button>
        </form>
      )}
      {next && (
        <form action={moveContractStage.bind(null, contract.id, next.value)}>
          <button
            type="submit"
            className="btn-glass btn-primary-glass px-3 py-1.5 text-xs"
          >
            {next.label} {">"}
          </button>
        </form>
      )}
      {contract.stage !== "lost" && (
        <form action={moveContractStage.bind(null, contract.id, "lost")}>
          <button
            type="submit"
            className="btn-glass glass px-3 py-1.5 text-xs font-semibold text-[#8c3b2e]"
          >
            Mark lost
          </button>
        </form>
      )}
    </div>
  );
}

export default function ContractCard({ contract }: { contract: ContractRow }) {
  const value = formatMoney(contract.contract_value);
  const deadline = formatDate(contract.deadline);

  return (
    <article className="card-lux space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/app/contracts/${contract.id}`}
            className="font-display text-lg font-semibold text-forest hover:underline"
          >
            {contract.title}
          </Link>
          {contract.buyer && (
            <p className="mt-0.5 truncate text-sm text-ink-soft">
              {contract.buyer}
              {contract.buyer_type ? ` (${contract.buyer_type})` : ""}
            </p>
          )}
        </div>
        <span className={`pill shrink-0 ${stagePillClass(contract.stage)}`}>
          {stageLabel(contract.stage)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <DeadlinePill dateStr={contract.deadline} />
        {deadline && (
          <span className="text-xs text-ink-faint">Due {deadline}</span>
        )}
        {value && (
          <span className="pill pill-muted font-semibold">{value}</span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {contract.solicitation_number && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              Solicitation
            </dt>
            <dd className="text-ink">{contract.solicitation_number}</dd>
          </div>
        )}
        {contract.naics && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              NAICS
            </dt>
            <dd className="text-ink">{contract.naics}</dd>
          </div>
        )}
        {contract.set_aside && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              Set aside
            </dt>
            <dd className="text-ink">{contract.set_aside}</dd>
          </div>
        )}
        {contract.source_url && (
          <div>
            <dt className="font-semibold uppercase tracking-wide text-ink-faint">
              Source
            </dt>
            <dd>
              <a
                href={contract.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brass-dark underline"
              >
                View listing
              </a>
            </dd>
          </div>
        )}
      </dl>

      <div className="border-t border-ink/10 pt-3">
        <StageMoveButtons contract={contract} />
      </div>
    </article>
  );
}
