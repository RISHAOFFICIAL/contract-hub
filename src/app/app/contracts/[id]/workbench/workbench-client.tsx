"use client";

import { useState } from "react";
import {
  analyzeSolicitationText,
  saveFormsToCompliance,
  setChecklistStatus,
} from "./actions";
import { DRAFT_LABEL, type AnalysisResult, type DraftField } from "@/lib/analyzer";
import { Field, TextArea, TextInput } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";

const DRAFT_STYLE =
  "rounded-lg border border-brass/40 bg-brass-pale px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-brass-dark";

function DraftRow({
  label,
  field,
  onChange,
}: {
  label: string;
  field: DraftField;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className={DRAFT_STYLE}>Draft, verify</span>
      </div>
      <TextInput
        value={field.value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Not found in pasted text"
      />
      {field.context && (
        <p className="text-xs italic text-ink-faint">{field.context}</p>
      )}
    </div>
  );
}

export function AnalyzerPanel({ contractId }: { contractId: string }) {
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [forms, setForms] = useState<string[]>([]);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function runAnalysis() {
    if (!text.trim()) return;
    setAnalyzing(true);
    try {
      const r = await analyzeSolicitationText(text);
      setResult(r);
      setForms(r.requiredForms.map((f) => f.form));
      setFields({
        responseDeadline: r.responseDeadline.value ?? "",
        questionsDeadline: r.questionsDeadline.value ?? "",
        preBidDate: r.preBidDate.value ?? "",
        naics: r.naics.value ?? "",
        setAside: r.setAside.value ?? "",
        evaluationFactors: r.evaluationFactors.value ?? "",
        periodOfPerformance: r.periodOfPerformance.value ?? "",
      });
    } finally {
      setAnalyzing(false);
    }
  }

  const setField = (key: string, value: string) =>
    setFields((f) => ({ ...f, [key]: value }));

  const fieldDraft = (key: string): DraftField => ({
    value: fields[key] ?? "",
    context:
      result && key in result
        ? (result[key as keyof AnalysisResult] as DraftField).context
        : null,
  });

  const hasExtraction =
    result &&
    (Object.keys(fields).some((k) => fields[k]) || forms.length > 0);

  return (
    <div className="space-y-4">
      <Field label="Paste solicitation text">
        <TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder="Paste the solicitation (deadlines, forms, evaluation factors, NAICS, set-aside, period of performance)..."
        />
      </Field>
      <button
        type="button"
        onClick={runAnalysis}
        disabled={analyzing || !text.trim()}
        className="btn-glass btn-primary-glass px-6 py-2.5 text-sm disabled:opacity-60"
      >
        {analyzing ? "Analyzing..." : "Analyze"}
      </button>

      {result && (
        <div className="space-y-4 rounded-2xl border border-ink/10 bg-white/60 p-4">
          <p className="text-xs font-semibold text-ink-faint">{DRAFT_LABEL}.</p>

          {!hasExtraction && (
            <p className="text-sm text-ink-soft">
              Nothing matched the known patterns. Try pasting more of the
              solicitation, especially the sections with dates, required
              forms, and evaluation language.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <DraftRow
              label="Response deadline"
              field={fieldDraft("responseDeadline")}
              onChange={(v) => setField("responseDeadline", v)}
            />
            <DraftRow
              label="Questions deadline"
              field={fieldDraft("questionsDeadline")}
              onChange={(v) => setField("questionsDeadline", v)}
            />
            <DraftRow
              label="Pre-bid / site visit date"
              field={fieldDraft("preBidDate")}
              onChange={(v) => setField("preBidDate", v)}
            />
            <DraftRow
              label="NAICS"
              field={fieldDraft("naics")}
              onChange={(v) => setField("naics", v)}
            />
          </div>

          <DraftRow
            label="Set-aside"
            field={fieldDraft("setAside")}
            onChange={(v) => setField("setAside", v)}
          />
          <DraftRow
            label="Evaluation factors"
            field={fieldDraft("evaluationFactors")}
            onChange={(v) => setField("evaluationFactors", v)}
          />
          <DraftRow
            label="Period of performance"
            field={fieldDraft("periodOfPerformance")}
            onChange={(v) => setField("periodOfPerformance", v)}
          />

          {forms.length > 0 && (
            <form
              action={saveFormsToCompliance.bind(null, contractId)}
              className="space-y-2 border-t border-ink/10 pt-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  Required forms found
                </p>
                <span className={DRAFT_STYLE}>Draft, verify</span>
              </div>
              {forms.map((form, i) => (
                <div key={i} className="flex items-center gap-2">
                  <TextInput
                    name="forms"
                    value={form}
                    onChange={(e) =>
                      setForms((fs) =>
                        fs.map((f, j) => (j === i ? e.target.value : f))
                      )
                    }
                    aria-label={`Form ${i + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForms((fs) => fs.filter((_, j) => j !== i))
                    }
                    className="shrink-0 text-sm font-semibold text-[#8c3b2e]"
                    aria-label={`Remove ${form}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <SubmitButton label="Save to compliance matrix" />
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Submission checklist ---------------- */

export function ChecklistToggle({
  itemId,
  contractId,
  checked,
  label,
}: {
  itemId: string;
  contractId: string;
  checked: boolean;
  label: string;
}) {
  return (
    <form action={setChecklistStatus.bind(null, itemId, contractId)}>
      <input
        type="hidden"
        name="status"
        value={checked ? "pending" : "met"}
      />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-ivory px-4 py-3">
        <input
          type="checkbox"
          defaultChecked={checked}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="mt-1 h-4 w-4 shrink-0 accent-[#1E3A2B]"
        />
        <span
          className={`text-sm ${
            checked ? "text-ink-faint line-through" : "text-ink"
          }`}
        >
          {label}
        </span>
      </label>
    </form>
  );
}

/* ---------------- Margin calculator ---------------- */

export type QuoteOption = {
  id: string;
  supplierName: string;
  totalLanded: number;
};

export function MarginCalculator({ quotes }: { quotes: QuoteOption[] }) {
  const [bidPrice, setBidPrice] = useState("");
  const [mode, setMode] = useState<"quote" | "manual">("quote");
  const [quoteId, setQuoteId] = useState("");
  const [manualCost, setManualCost] = useState("");

  const price = Number(bidPrice);
  const cost =
    mode === "quote"
      ? Number(
          quotes.find((q) => q.id === quoteId)?.totalLanded ?? NaN
        )
      : Number(manualCost);

  const valid = bidPrice.trim() !== "" && price > 0 && Number.isFinite(cost);
  const profit = valid ? price - cost : null;
  const marginPct = valid ? (profit! / price) * 100 : null;

  let verdict: { label: string; cls: string; explain: string } | null = null;
  if (marginPct !== null) {
    if (marginPct >= 10)
      verdict = {
        label: "Healthy",
        cls: "pill-active",
        explain: `At a ${marginPct.toFixed(1)}% margin you keep about $${profit!.toLocaleString("en-US", { maximumFractionDigits: 2 })} on a $${price.toLocaleString("en-US", { maximumFractionDigits: 2 })} bid after product cost.`,
      };
    else if (marginPct >= 0)
      verdict = {
        label: "Thin margin",
        cls: "pill-warn",
        explain: `A ${marginPct.toFixed(1)}% margin leaves little room for surprises. Consider trimming costs or raising the bid before committing.`,
      };
    else
      verdict = {
        label: "Losing money",
        cls: "pill-bad",
        explain: `This bid would lose about $${Math.abs(profit!).toLocaleString("en-US", { maximumFractionDigits: 2 })} per unit. Do not submit at this price unless the strategy intentionally accepts a loss.`,
      };
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bid price ($)">
          <TextInput
            type="number"
            min="0"
            step="0.01"
            value={bidPrice}
            onChange={(e) => setBidPrice(e.target.value)}
            placeholder="e.g. 25000"
          />
        </Field>
        <Field label="Product cost basis">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("quote")}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                mode === "quote"
                  ? "bg-forest text-white"
                  : "bg-ivory text-ink-soft"
              }`}
            >
              From a quote
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                mode === "manual"
                  ? "bg-forest text-white"
                  : "bg-ivory text-ink-soft"
              }`}
            >
              Manual cost
            </button>
          </div>
        </Field>
      </div>

      {mode === "quote" ? (
        quotes.length > 0 ? (
          <Field label="Select quote">
            <select
              value={quoteId}
              onChange={(e) => setQuoteId(e.target.value)}
              className="w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink focus:border-brass focus:outline-none"
            >
              <option value="">Choose a quote...</option>
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.supplierName} - landed $
                  {q.totalLanded.toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <p className="text-sm text-ink-faint">
            No supplier quotes yet. Add one below, or switch to manual cost.
          </p>
        )
      ) : (
        <Field label="Product cost ($)">
          <TextInput
            type="number"
            min="0"
            step="0.01"
            value={manualCost}
            onChange={(e) => setManualCost(e.target.value)}
            placeholder="e.g. 18000"
          />
        </Field>
      )}

      {valid && verdict && (
        <div className="rounded-2xl border border-ink/10 bg-white/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              Gross profit: $
              {profit!.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              <span className="ml-2 text-ink-faint">
                ({marginPct!.toFixed(1)}% margin)
              </span>
            </p>
            <span className={`pill ${verdict.cls}`}>{verdict.label}</span>
          </div>
          <p className="mt-2 text-sm text-ink-soft">{verdict.explain}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Compliance guardrails ---------------- */

export function GuardrailsCard() {
  const [selfPerformed, setSelfPerformed] = useState("");
  const [checks, setChecks] = useState([false, false, false]);

  const pct = Number(selfPerformed);
  const pctValid = selfPerformed.trim() !== "" && Number.isFinite(pct);

  const toggle = (i: number) =>
    setChecks((c) => c.map((v, j) => (j === i ? !v : v)));

  const nmrItems = [
    "We will supply products from domestic small business manufacturers, or we qualify for a waiver.",
    "We will not simply pass through another supplier's product as our own.",
    "We have checked the SBA nonmanufacturer rule waiver list if needed.",
  ];

  return (
    <div className="space-y-5">
      {/* Limitations on subcontracting */}
      <div>
        <p className="text-sm font-semibold text-ink">
          Limitations on subcontracting
        </p>
        <div className="mt-2 max-w-xs">
          <Field label="Our self-performed %">
            <TextInput
              type="number"
              min="0"
              max="100"
              step="1"
              value={selfPerformed}
              onChange={(e) => setSelfPerformed(e.target.value)}
              placeholder="e.g. 60"
            />
          </Field>
        </div>
        {pctValid && pct < 50 && (
          <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Set-aside contracts generally require the prime to self-perform
            about 50% of the work (FAR 52.219-14). Verify the clause in your
            solicitation.
          </p>
        )}
        {pctValid && pct >= 50 && (
          <p className="mt-2 rounded-xl bg-forest-tint px-4 py-3 text-sm font-medium text-forest">
            Meets the typical 50% self-performance bar.
          </p>
        )}
      </div>

      {/* Nonmanufacturer rule */}
      <div>
        <p className="text-sm font-semibold text-ink">
          Nonmanufacturer rule checklist
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          Informational only. Confirm each point against your solicitation.
        </p>
        <ul className="mt-2 space-y-2">
          {nmrItems.map((item, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-ivory px-4 py-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={() => toggle(i)}
                  className="mt-1 h-4 w-4 accent-[#1E3A2B]"
                />
                <span>{item}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Cert truthfulness */}
      <p className="rounded-xl bg-ivory px-4 py-3 text-sm text-ink-soft">
        <span className="font-semibold text-ink">Certification truthfulness:</span>{" "}
        Only claim certifications you hold. Misrepresenting size or status can
        void an award.
      </p>

      <p className="text-xs italic text-ink-faint">
        General information, not legal advice.
      </p>
    </div>
  );
}
