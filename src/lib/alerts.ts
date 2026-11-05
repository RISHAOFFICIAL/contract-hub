// Server-side only alert helpers for Contract Hub.
// Creates deadline and renewal alerts with dedupe, so the same item is
// not re-alerted inside the dedupe window.

import { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

const DEDUPE_DAYS = 30;

/** True when a recent alert of the same type already points at this record. */
async function alreadyAlerted(
  supabase: Db,
  businessId: string,
  type: string,
  relatedTable: string,
  relatedId: string
): Promise<boolean> {
  const since = new Date(
    Date.now() - DEDUPE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data } = await supabase
    .from("alerts")
    .select("id")
    .eq("business_id", businessId)
    .eq("type", type)
    .eq("related_table", relatedTable)
    .eq("related_id", relatedId)
    .gte("created_at", since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/**
 * Create deadline alerts for contracts due within 7 days (active stages
 * only) and renewal alerts for registrations expiring within 7 days.
 * Returns the number of alerts created.
 */
export async function checkDeadlines(
  supabase: Db,
  businessId: string
): Promise<number> {
  let created = 0;
  const now = new Date();
  const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, title, deadline")
    .eq("business_id", businessId)
    .not("stage", "in", "(completed,closed_out,lost)")
    .not("deadline", "is", null)
    .gte("deadline", now.toISOString())
    .lte("deadline", in7);

  for (const c of contracts ?? []) {
    const contract = c as { id: string; title: string; deadline: string };
    if (
      await alreadyAlerted(supabase, businessId, "deadline", "contracts", contract.id)
    )
      continue;
    const days = Math.ceil(
      (new Date(contract.deadline).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    await supabase.from("alerts").insert({
      business_id: businessId,
      type: "deadline",
      title: `Deadline in ${days} day${days === 1 ? "" : "s"}: ${contract.title}`,
      body: `The deadline for ${contract.title} is ${new Date(
        contract.deadline
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}.`,
      related_id: contract.id,
      related_table: "contracts",
    });
    created += 1;
  }

  const today = now.toISOString().slice(0, 10);
  const in7Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, name, expiry_date")
    .eq("business_id", businessId)
    .not("expiry_date", "is", null)
    .gte("expiry_date", today)
    .lte("expiry_date", in7Date);

  for (const r of registrations ?? []) {
    const reg = r as { id: string; name: string; expiry_date: string };
    if (
      await alreadyAlerted(supabase, businessId, "renewal", "registrations", reg.id)
    )
      continue;
    const days = Math.ceil(
      (new Date(reg.expiry_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    await supabase.from("alerts").insert({
      business_id: businessId,
      type: "renewal",
      title: `Registration expires in ${days} day${days === 1 ? "" : "s"}: ${reg.name}`,
      body: `The ${reg.name} registration expires on ${new Date(
        reg.expiry_date
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}. Start the renewal so it does not lapse.`,
      related_id: reg.id,
      related_table: "registrations",
    });
    created += 1;
  }

  return created;
}
