"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { STAGES, stageLabel, type StageValue } from "../stages";

/* ---------- Shared types ---------- */

export type PlannedKind =
  | "stage"
  | "deadline"
  | "milestone_add"
  | "milestone_complete"
  | "invoice_add"
  | "note_add"
  | "quote_add";

export type PlannedItem = {
  kind: PlannedKind;
  summary: string;
  payload: Record<string, string | number | null>;
};

export type ParseResult = {
  planned: PlannedItem[];
  unparsed: string[];
};

async function requireBusinessId(): Promise<string> {
  const businessId = await getBusinessId();
  if (!businessId) redirect("/app");
  return businessId;
}

/* ---------- Parsing helpers ---------- */

const STAGE_PATTERNS: { value: StageValue; match: string[] }[] = STAGES.map(
  (s) => ({
    value: s.value,
    match: [s.label.toLowerCase(), s.value.replace(/_/g, " ")],
  })
);

function parseStage(text: string): StageValue | null {
  const lower = text.toLowerCase();
  for (const p of STAGE_PATTERNS) {
    for (const m of p.match) {
      if (m && lower.includes(m)) return p.value;
    }
  }
  return null;
}

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function thisOrNextYear(month: number, day: number): Date {
  const now = new Date();
  let d = new Date(now.getFullYear(), month, day);
  if (d.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
    d = new Date(now.getFullYear() + 1, month, day);
  }
  return d;
}

/** Parses common date formats from free text. Returns null when nothing found. */
function parseDate(text: string): Date | null {
  const lower = text.toLowerCase();

  if (/\btoday\b/.test(lower)) return new Date();
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (/\bnext week\b/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  }

  // MM/DD/YYYY or MM-DD-YYYY
  let m = lower.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = new Date(year, Number(m[1]) - 1, Number(m[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // MM/DD or MM-DD (this year or next)
  m = lower.match(/\b(\d{1,2})[/-](\d{1,2})\b/);
  if (m) return thisOrNextYear(Number(m[1]) - 1, Number(m[2]));

  // YYYY-MM-DD
  m = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Month D, YYYY or Month D
  m = lower.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/
  );
  if (m) {
    const month = MONTHS[m[1]];
    const day = Number(m[2]);
    if (m[3]) {
      const d = new Date(Number(m[3]), month, day);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return thisOrNextYear(month, day);
  }

  return null;
}

function parseMoney(text: string): number | null {
  const m = text.replace(/,/g, "").match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isNaN(n) ? null : n;
}

function stripKeyword(clause: string, keyword: string): string {
  return clause.replace(new RegExp(`\\b${keyword}\\b`, "i"), "").trim();
}

/* ---------- parseUpdate: plan only, never applies ---------- */

export async function parseUpdate(
  contractId: string,
  text: string
): Promise<ParseResult> {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  const trimmed = (text ?? "").trim();
  if (!trimmed) return { planned: [], unparsed: [] };

  // Load contract context for matching milestones and suppliers.
  const [{ data: milestones }, { data: suppliers }] = await Promise.all([
    supabase
      .from("milestones")
      .select("id, title")
      .eq("business_id", businessId)
      .eq("contract_id", contractId),
    supabase
      .from("suppliers")
      .select("id, name")
      .eq("business_id", businessId),
  ]);

  const clauses = trimmed
    .split(/\s+and then\s+|\s+then\s+|;\s*|\s+and\s+/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const planned: PlannedItem[] = [];
  const unparsed: string[] = [];

  for (const clause of clauses) {
    const lower = clause.toLowerCase();
    const item = parseClause(clause, lower, milestones ?? [], suppliers ?? []);
    if (item) planned.push(item);
    else unparsed.push(clause);
  }

  return { planned, unparsed };
}

function parseClause(
  clause: string,
  lower: string,
  milestones: { id: string; title: string | null }[],
  suppliers: { id: string; name: string | null }[]
): PlannedItem | null {
  // 1. Stage change: "move to X" / "mark as X" / stage names
  if (/\b(move to|mark as|set (to|stage)|change (to|stage))\b/.test(lower)) {
    const stage = parseStage(clause);
    if (stage)
      return {
        kind: "stage",
        summary: `Move stage to ${stageLabel(stage)}`,
        payload: { stage },
      };
    return null;
  }
  if (
    STAGE_PATTERNS.some((p) => p.match.some((m) => m && lower.includes(m))) &&
    !/\b(add|complete|deadline|note|invoice|quote|milestone)\b/.test(lower)
  ) {
    const stage = parseStage(clause);
    if (stage)
      return {
        kind: "stage",
        summary: `Move stage to ${stageLabel(stage)}`,
        payload: { stage },
      };
  }

  // 2. Deadline change
  if (/\bdeadline\b/.test(lower)) {
    const date = parseDate(clause);
    if (date)
      return {
        kind: "deadline",
        summary: `Set deadline to ${date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`,
        payload: { deadline: date.toISOString() },
      };
    return null;
  }

  // 3. Complete milestone
  if (/\bcomplete\b.*\bmilestone\b|\bmark\b.*\bmilestone\b.*\bdone\b/.test(lower)) {
    const needle = stripKeyword(stripKeyword(clause, "complete"), "milestone")
      .replace(/\bmark\b/gi, "")
      .replace(/\bdone\b/gi, "")
      .trim()
      .toLowerCase();
    const found = milestones.find(
      (ms) =>
        ms.title && needle && ms.title.toLowerCase().includes(needle)
    );
    if (found)
      return {
        kind: "milestone_complete",
        summary: `Mark milestone "${found.title}" complete`,
        payload: { milestone_id: found.id, title: found.title },
      };
    return null;
  }

  // 4. Add milestone
  if (/\badd\b.*\bmilestone\b|\bnew milestone\b/.test(lower)) {
    let title = stripKeyword(clause, "add").replace(/\bmilestone\b/i, "").trim();
    const due = parseDate(clause);
    if (due) title = title.replace(/\bdue\b.*/i, "").trim();
    if (!title) return null;
    return {
      kind: "milestone_add",
      summary: due
        ? `Add milestone "${title}" due ${due.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`
        : `Add milestone "${title}"`,
      payload: {
        title,
        due_date: due ? due.toISOString() : null,
      },
    };
  }

  // 5. Add invoice
  if (/\b(invoice|bill)\b/.test(lower)) {
    const amount = parseMoney(clause);
    if (amount === null) return null;
    return {
      kind: "invoice_add",
      summary: `Create invoice draft for $${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      payload: { amount },
    };
  }

  // 6. Add note
  if (/\b(add|leave)\b.*\bnote\b/.test(lower)) {
    const note = stripKeyword(clause, "add")
      .replace(/\bnote(s)?\b/i, "")
      .trim();
    if (!note) return null;
    return {
      kind: "note_add",
      summary: `Add note: "${note.length > 60 ? note.slice(0, 60) + "..." : note}"`,
      payload: { text: note },
    };
  }

  // 7. Add supplier quote
  if (/\bquote\b/.test(lower)) {
    const supplier = suppliers.find(
      (s) => s.name && lower.includes(s.name.toLowerCase())
    );
    const unitPrice = parseMoney(
      clause.replace(/\$?/g, "").match(/(?:unit|each|per)\s*\$?([\d,]+(?:\.\d{1,2})?)/i)?.[1] ?? ""
    );
    const qtyMatch = lower.match(/(?:qty|quantity|x)\s*(\d+)/);
    const shipMatch = lower
      .replace(/,/g, "")
      .match(/shipping\s*\$?(\d+(?:\.\d{1,2})?)/);
    const totalMatch = lower
      .replace(/,/g, "")
      .match(/total\s*\$?(\d+(?:\.\d{1,2})?)/);
    const quantity = qtyMatch ? Number(qtyMatch[1]) : null;
    const shipping = shipMatch ? Number(shipMatch[1]) : null;
    let total = totalMatch ? Number(totalMatch[1]) : null;
    if (total === null && unitPrice !== null && quantity !== null) {
      total = unitPrice * quantity + (shipping ?? 0);
    }
    if (!supplier) return null;
    return {
      kind: "quote_add",
      summary: `Add supplier quote from ${supplier.name}${
        total !== null
          ? ` (landed $${total.toLocaleString("en-US", { maximumFractionDigits: 2 })})`
          : ""
      }`,
      payload: {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        unit_price: unitPrice,
        quantity,
        shipping,
        total_landed: total,
      },
    };
  }

  return null;
}

/* ---------- applyUpdate: applies the confirmed plan ---------- */

export async function applyUpdate(
  contractId: string,
  planned: PlannedItem[]
): Promise<{ applied: string[] }> {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  // Verify the contract belongs to this business.
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, notes")
    .eq("id", contractId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!contract) redirect("/app/contracts");

  const applied: string[] = [];

  for (const item of planned) {
    switch (item.kind) {
      case "stage": {
        const stage = String(item.payload.stage ?? "");
        if (STAGES.some((s) => s.value === stage)) {
          await supabase
            .from("contracts")
            .update({ stage })
            .eq("id", contractId)
            .eq("business_id", businessId);
          applied.push(`Stage moved to ${stageLabel(stage)}`);
        }
        break;
      }
      case "deadline": {
        const deadline = String(item.payload.deadline ?? "");
        if (deadline) {
          await supabase
            .from("contracts")
            .update({ deadline })
            .eq("id", contractId)
            .eq("business_id", businessId);
          applied.push("Deadline updated");
        }
        break;
      }
      case "milestone_add": {
        const title = String(item.payload.title ?? "").trim();
        if (title) {
          await supabase.from("milestones").insert({
            business_id: businessId,
            contract_id: contractId,
            title,
            due_date: item.payload.due_date
              ? String(item.payload.due_date)
              : null,
            completed: false,
          });
          applied.push(`Milestone added: ${title}`);
        }
        break;
      }
      case "milestone_complete": {
        const milestoneId = String(item.payload.milestone_id ?? "");
        if (milestoneId) {
          await supabase
            .from("milestones")
            .update({
              completed: true,
              completed_at: new Date().toISOString(),
            })
            .eq("id", milestoneId)
            .eq("business_id", businessId);
          applied.push(`Milestone completed: ${item.payload.title ?? ""}`);
        }
        break;
      }
      case "invoice_add": {
        const amount = Number(item.payload.amount ?? 0);
        if (amount > 0) {
          const { count } = await supabase
            .from("invoices")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId);
          const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;
          await supabase.from("invoices").insert({
            business_id: businessId,
            contract_id: contractId,
            invoice_number: invoiceNumber,
            amount,
            status: "draft",
            notes: "Created from Talk to update.",
          });
          applied.push(`Invoice draft ${invoiceNumber} created`);
        }
        break;
      }
      case "note_add": {
        const text = String(item.payload.text ?? "").trim();
        if (text) {
          const existing = (contract.notes ?? "").trim();
          const updated = existing ? `${existing}\n${text}` : text;
          await supabase
            .from("contracts")
            .update({ notes: updated })
            .eq("id", contractId)
            .eq("business_id", businessId);
          applied.push("Note added");
        }
        break;
      }
      case "quote_add": {
        const supplierId = String(item.payload.supplier_id ?? "");
        if (supplierId) {
          await supabase.from("supplier_quotes").insert({
            business_id: businessId,
            contract_id: contractId,
            supplier_id: supplierId,
            unit_price:
              item.payload.unit_price !== null
                ? Number(item.payload.unit_price)
                : null,
            quantity:
              item.payload.quantity !== null
                ? Number(item.payload.quantity)
                : null,
            shipping:
              item.payload.shipping !== null
                ? Number(item.payload.shipping)
                : null,
            total_landed:
              item.payload.total_landed !== null
                ? Number(item.payload.total_landed)
                : null,
            notes: "Created from Talk to update.",
          });
          applied.push(`Quote added from ${item.payload.supplier_name ?? "supplier"}`);
        }
        break;
      }
    }
  }

  revalidatePath(`/app/contracts/${contractId}`);
  revalidatePath("/app/contracts");
  return { applied };
}
