"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

async function requireBusinessId(): Promise<string> {
  const businessId = await getBusinessId();
  if (!businessId) redirect("/app");
  return businessId;
}

async function requireContract(
  contractId: string,
  businessId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contracts")
    .select("id")
    .eq("id", contractId)
    .eq("business_id", businessId)
    .maybeSingle();
  return Boolean(data);
}

function revalidate(contractId: string) {
  revalidatePath(`/app/contracts/${contractId}`);
  revalidatePath("/app/contracts");
  revalidatePath("/app/rewards");
}

/* ---------- Milestones ---------- */

export async function addMilestone(contractId: string, formData: FormData) {
  const businessId = await requireBusinessId();
  if (!(await requireContract(contractId, businessId))) return;
  const supabase = await createClient();

  const title = str(formData.get("title"));
  if (!title) return;
  const dueDate = str(formData.get("due_date"));

  await supabase.from("milestones").insert({
    business_id: businessId,
    contract_id: contractId,
    title,
    due_date: dueDate ?? null,
    notes: str(formData.get("notes")),
    completed: false,
  });

  revalidate(contractId);
}

export async function toggleMilestone(
  milestoneId: string,
  contractId: string,
  completed: boolean
) {
  const businessId = await requireBusinessId();
  if (!(await requireContract(contractId, businessId))) return;
  const supabase = await createClient();

  await supabase
    .from("milestones")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", milestoneId)
    .eq("contract_id", contractId)
    .eq("business_id", businessId);

  revalidate(contractId);
}

export async function deleteMilestone(milestoneId: string, contractId: string) {
  const businessId = await requireBusinessId();
  if (!(await requireContract(contractId, businessId))) return;
  const supabase = await createClient();

  await supabase
    .from("milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("contract_id", contractId)
    .eq("business_id", businessId);

  revalidate(contractId);
}

/* ---------- Invoices ---------- */

const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue"] as const;

export async function addInvoice(contractId: string, formData: FormData) {
  const businessId = await requireBusinessId();
  if (!(await requireContract(contractId, businessId))) return;
  const supabase = await createClient();

  const amountRaw = str(formData.get("amount"));
  const amount = amountRaw === null ? NaN : Number(amountRaw);
  if (Number.isNaN(amount) || amount <= 0) return;

  const statusRaw = str(formData.get("status")) ?? "draft";
  const status = INVOICE_STATUSES.includes(
    statusRaw as (typeof INVOICE_STATUSES)[number]
  )
    ? statusRaw
    : "draft";
  const issuedDate = str(formData.get("issued_date"));
  const dueDate = str(formData.get("due_date"));

  // Auto-number like Talk to update does: INV-#### per business.
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
    status,
    issued_date: issuedDate ?? new Date().toISOString().slice(0, 10),
    due_date: dueDate ?? null,
    notes: str(formData.get("notes")),
    paid_at: status === "paid" ? new Date().toISOString() : null,
  });

  revalidate(contractId);
}

export async function setInvoiceStatus(
  invoiceId: string,
  contractId: string,
  status: string
) {
  if (
    !INVOICE_STATUSES.includes(status as (typeof INVOICE_STATUSES)[number])
  )
    return;
  const businessId = await requireBusinessId();
  if (!(await requireContract(contractId, businessId))) return;
  const supabase = await createClient();

  await supabase
    .from("invoices")
    .update({
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", invoiceId)
    .eq("contract_id", contractId)
    .eq("business_id", businessId);

  revalidate(contractId);
}

export async function deleteInvoice(invoiceId: string, contractId: string) {
  const businessId = await requireBusinessId();
  if (!(await requireContract(contractId, businessId))) return;
  const supabase = await createClient();

  await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("contract_id", contractId)
    .eq("business_id", businessId);

  revalidate(contractId);
}
