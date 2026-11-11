"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";
import { analyzeSolicitation, type AnalysisResult } from "@/lib/analyzer";
import { dedupeStrings } from "@/lib/dedupe";
import {
  PROPOSAL_SECTION_TITLES,
  SEEDER_NOTE,
  STARTER_COMPLIANCE_ITEMS,
} from "./workbench-lib";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

function num(v: FormDataEntryValue | null): number {
  const n = Number((v ?? "").toString().trim());
  return Number.isFinite(n) ? n : 0;
}

async function requireBusinessId(): Promise<string> {
  const businessId = await getBusinessId();
  if (!businessId) redirect("/app");
  return businessId;
}

function wbPath(contractId: string): string {
  return `/app/contracts/${contractId}/workbench`;
}

/* ---------------- Solicitation analyzer (pure logic in src/lib/analyzer.ts) ---------------- */

export async function analyzeSolicitationText(
  text: string
): Promise<AnalysisResult> {
  return analyzeSolicitation(text);
}

/* ---------------- Compliance matrix ---------------- */

export async function addComplianceItem(contractId: string, formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();
  const requirement = str(formData.get("requirement"));
  if (!requirement) return;

  await supabase.from("compliance_items").insert({
    business_id: businessId,
    contract_id: contractId,
    requirement,
    category: str(formData.get("category")) ?? "compliance",
    status: str(formData.get("status")) ?? "pending",
    notes: str(formData.get("notes")),
  });

  revalidatePath(wbPath(contractId));
}

export async function updateComplianceItem(
  itemId: string,
  contractId: string,
  formData: FormData
) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("compliance_items")
    .update({
      requirement: str(formData.get("requirement")),
      category: str(formData.get("category")) ?? "compliance",
      status: str(formData.get("status")) ?? "pending",
      notes: str(formData.get("notes")),
    })
    .eq("id", itemId)
    .eq("contract_id", contractId)
    .eq("business_id", businessId);

  revalidatePath(wbPath(contractId));
}

export async function setComplianceStatus(
  itemId: string,
  contractId: string,
  status: string
) {
  if (!["pending", "met", "waived"].includes(status)) return;
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("compliance_items")
    .update({ status })
    .eq("id", itemId)
    .eq("contract_id", contractId)
    .eq("business_id", businessId);

  revalidatePath(wbPath(contractId));
}

export async function deleteComplianceItem(itemId: string, contractId: string) {  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("compliance_items")
    .delete()
    .eq("id", itemId)
    .eq("contract_id", contractId)
    .eq("business_id", businessId);

  revalidatePath(wbPath(contractId));
}

/** Toggle a submission checklist item between met and pending. */
export async function setChecklistStatus(
  itemId: string,
  contractId: string,
  formData: FormData
) {
  const status = str(formData.get("status"));
  if (status !== "met" && status !== "pending") return;
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("compliance_items")
    .update({ status })
    .eq("id", itemId)
    .eq("contract_id", contractId)
    .eq("business_id", businessId)
    .eq("category", "submission");

  revalidatePath(wbPath(contractId));
}

/** Inserts the 8 starter items only when the contract has no compliance items yet. */
export async function seedComplianceItems(contractId: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  const { count } = await supabase
    .from("compliance_items")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("contract_id", contractId);

  if (count && count > 0) return;

  await supabase.from("compliance_items").insert(
    STARTER_COMPLIANCE_ITEMS.map((requirement) => ({
      business_id: businessId,
      contract_id: contractId,
      requirement,
      category: "compliance",
      status: "pending",
      notes: SEEDER_NOTE,
    }))
  );

  revalidatePath(wbPath(contractId));
}

/** Adds extracted forms from the analyzer as compliance items. */
export async function saveFormsToCompliance(
  contractId: string,
  formData: FormData
) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  const forms = formData
    .getAll("forms")
    .map((f) => f.toString().trim())
    .filter((f) => f !== "");
  if (forms.length === 0) return;

  await supabase.from("compliance_items").insert(
    forms.map((requirement) => ({
      business_id: businessId,
      contract_id: contractId,
      requirement,
      category: "compliance",
      status: "pending",
      notes: "Draft from solicitation analysis. Verify against the official solicitation.",
    }))
  );

  revalidatePath(wbPath(contractId));
}

/* ---------------- Proposal builder ---------------- */

type ProposalSectionRow = {
  id: string;
  title: string;
  body: string | null;
};

/** Saves all edited sections (upsert by title). */
export async function saveProposalSections(
  contractId: string,
  formData: FormData
) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("proposal_sections")
    .select("id, title")
    .eq("business_id", businessId)
    .eq("contract_id", contractId);

  const existingMap = new Map<string, string>(
    (existing ?? []).map((r: { id: string; title: string }) => [r.title, r.id])
  );

  for (const title of PROPOSAL_SECTION_TITLES) {
    const body = str(formData.get(`section_${title}`)) ?? "";
    const id = existingMap.get(title);
    if (id) {
      await supabase
        .from("proposal_sections")
        .update({ body })
        .eq("id", id)
        .eq("business_id", businessId);
    } else {
      await supabase.from("proposal_sections").insert({
        business_id: businessId,
        contract_id: contractId,
        title,
        body,
        sort_order: PROPOSAL_SECTION_TITLES.indexOf(title),
      });
    }
  }

  revalidatePath(wbPath(contractId));
}

/** Pre-fills Company Overview, Past Performance, and Certifications from business data. */
export async function buildDraftFromData(contractId: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select(
      "legal_name, dba, email, phone, city, state, website, naics_codes, product_lines, service_lines, certifications_summary"
    )
    .eq("id", businessId)
    .single();

  const { data: pastContracts } = await supabase
    .from("contracts")
    .select("title, buyer, contract_value")
    .eq("business_id", businessId)
    .in("stage", ["completed", "closed_out"])
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: certs } = await supabase
    .from("certifications")
    .select("name, program, status")
    .eq("business_id", businessId)
    .eq("status", "approved");

  const b = (business ?? {}) as Record<string, unknown>;
  const legalName = (b.legal_name as string) || "Our company";
  const dba = b.dba as string | null;
  const cityState = [b.city as string, b.state as string]
    .filter(Boolean)
    .join(", ");
  const productLines = (b.product_lines as string[]) ?? [];
  const serviceLines = (b.service_lines as string[]) ?? [];
  const naicsCodes = (b.naics_codes as string[]) ?? [];

  const lines: string[] = [];
  lines.push(
    `${legalName}${dba ? ` (DBA ${dba})` : ""}${
      cityState ? ` is based in ${cityState}` : ""
    }.`
  );
  const offerings = dedupeStrings([...productLines, ...serviceLines]);
  if (offerings.length > 0) {
    lines.push(`We provide: ${offerings.join("; ")}.`);
  }
  if (naicsCodes.length > 0) {
    lines.push(`Primary NAICS codes: ${naicsCodes.join(", ")}.`);
  }
  const overview = lines.join(" ");

  const pastLines = (pastContracts ?? []).map(
    (c: { title: string; buyer: string | null; contract_value: number | null }) =>
      `- ${c.title}${c.buyer ? `, ${c.buyer}` : ""}${
        c.contract_value ? ` ($${Number(c.contract_value).toLocaleString()})` : ""
      }`
  );
  const pastPerformance =
    pastLines.length > 0
      ? `Selected past performance:\n${pastLines.join("\n")}`
      : "No completed contracts on record yet. Add past work here.";

  const certLines = (certs ?? []).map(
    (c: { name: string; program: string | null }) =>
      `- ${c.name}${c.program ? ` (${c.program})` : ""}`
  );
  const certSection =
    certLines.length > 0
      ? `Certifications held:\n${certLines.join("\n")}\n\nOnly claim certifications you hold. Misrepresenting size or status can void an award.`
      : "No approved certifications on record yet. List certifications here only if you hold them. Misrepresenting size or status can void an award.";

  const drafts: Record<string, string> = {
    "Company Overview": overview,
    "Past Performance": pastPerformance,
    "Certifications and Compliance": certSection,
  };

  const { data: existing } = await supabase
    .from("proposal_sections")
    .select("id, title")
    .eq("business_id", businessId)
    .eq("contract_id", contractId);
  const existingMap = new Map<string, string>(
    (existing ?? []).map((r: { id: string; title: string }) => [r.title, r.id])
  );

  for (const title of Object.keys(drafts)) {
    const body = drafts[title];
    const id = existingMap.get(title);
    if (id) {
      await supabase
        .from("proposal_sections")
        .update({ body })
        .eq("id", id)
        .eq("business_id", businessId);
    } else {
      await supabase.from("proposal_sections").insert({
        business_id: businessId,
        contract_id: contractId,
        title,
        body,
        sort_order: PROPOSAL_SECTION_TITLES.indexOf(title as (typeof PROPOSAL_SECTION_TITLES)[number]),
      });
    }
  }

  revalidatePath(wbPath(contractId));
}

/** Snapshots all current sections into a new numbered version. */
export async function saveProposalVersion(contractId: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  const { data: sections } = await supabase
    .from("proposal_sections")
    .select("id, title, body")
    .eq("business_id", businessId)
    .eq("contract_id", contractId)
    .order("sort_order", { ascending: true });

  const { data: latest } = await supabase
    .from("proposal_versions")
    .select("version_number")
    .eq("business_id", businessId)
    .eq("contract_id", contractId)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextNumber = ((latest?.[0]?.version_number as number) ?? 0) + 1;

  const snapshot: Record<string, string> = {};
  for (const s of (sections ?? []) as ProposalSectionRow[]) {
    snapshot[s.title] = s.body ?? "";
  }

  await supabase.from("proposal_versions").insert({
    business_id: businessId,
    contract_id: contractId,
    version_number: nextNumber,
    snapshot,
  });

  revalidatePath(wbPath(contractId));
}

export async function deleteProposalVersion(
  versionId: string,
  contractId: string
) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("proposal_versions")
    .delete()
    .eq("id", versionId)
    .eq("contract_id", contractId)
    .eq("business_id", businessId);

  revalidatePath(wbPath(contractId));
}

/* ---------------- Supplier quotes ---------------- */

export async function addSupplierQuote(contractId: string, formData: FormData) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  const unitPrice = num(formData.get("unit_price"));
  const quantity = num(formData.get("quantity"));
  const shipping = num(formData.get("shipping"));
  const totalLanded = unitPrice * quantity + shipping;

  await supabase.from("supplier_quotes").insert({
    business_id: businessId,
    contract_id: contractId,
    supplier_id: str(formData.get("supplier_id")),
    unit_price: unitPrice,
    quantity,
    shipping,
    total_landed: totalLanded,
    notes: str(formData.get("notes")),
  });

  revalidatePath(wbPath(contractId));
}

export async function updateSupplierQuote(
  quoteId: string,
  contractId: string,
  formData: FormData
) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  const unitPrice = num(formData.get("unit_price"));
  const quantity = num(formData.get("quantity"));
  const shipping = num(formData.get("shipping"));
  const totalLanded = unitPrice * quantity + shipping;

  await supabase
    .from("supplier_quotes")
    .update({
      supplier_id: str(formData.get("supplier_id")),
      unit_price: unitPrice,
      quantity,
      shipping,
      total_landed: totalLanded,
      notes: str(formData.get("notes")),
    })
    .eq("id", quoteId)
    .eq("contract_id", contractId)
    .eq("business_id", businessId);

  revalidatePath(wbPath(contractId));
}

export async function deleteSupplierQuote(quoteId: string, contractId: string) {
  const businessId = await requireBusinessId();
  const supabase = await createClient();

  await supabase
    .from("supplier_quotes")
    .delete()
    .eq("id", quoteId)
    .eq("contract_id", contractId)
    .eq("business_id", businessId);

  revalidatePath(wbPath(contractId));
}
