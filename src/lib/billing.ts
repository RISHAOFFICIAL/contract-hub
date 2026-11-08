// Plan and billing access helpers for Contract Hub.
// Free: search federal and Michigan contracts, track up to 3 contracts.
// Pro ($24/month, $240/year, 7-day free trial): unlimited tracking,
// alerts on new matches, saved searches, and a document vault.
// Early members are grandfathered: they keep full access for free.

import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business";

export const FREE_CONTRACT_LIMIT = 3;
export const PRO_MONTHLY_PRICE = 24;
export const PRO_ANNUAL_PRICE = 240;
export const TRIAL_DAYS = 7;

export type PlanName = "free" | "pro";

export type PlanAccess = {
  businessId: string | null;
  plan: PlanName;
  /** True when the business signed up before the paywall and keeps full access. */
  isGrandfathered: boolean;
  /** True when the business has Pro access, paid or grandfathered. */
  isPro: boolean;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  contractCount: number;
  /** Contracts left on Free. Pro is unlimited, so this is Infinity. */
  contractsRemaining: number;
  canTrackMore: boolean;
};

type BusinessBillingRow = {
  id: string;
  plan: string | null;
  grandfathered?: boolean | null;
  stripe_customer_id?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
};

function toAccess(
  business: BusinessBillingRow | null,
  contractCount: number
): PlanAccess {
  const plan: PlanName = business?.plan === "pro" ? "pro" : "free";
  const isGrandfathered = business?.grandfathered === true;
  const isPro = plan === "pro" || isGrandfathered;
  const contractsRemaining = isPro
    ? Number.POSITIVE_INFINITY
    : Math.max(0, FREE_CONTRACT_LIMIT - contractCount);
  return {
    businessId: business?.id ?? null,
    plan,
    isGrandfathered,
    isPro,
    subscriptionStatus: business?.subscription_status ?? null,
    trialEndsAt: business?.trial_ends_at ?? null,
    currentPeriodEnd: business?.current_period_end ?? null,
    stripeCustomerId: business?.stripe_customer_id ?? null,
    contractCount,
    contractsRemaining,
    canTrackMore: isPro || contractCount < FREE_CONTRACT_LIMIT,
  };
}

/**
 * Plan access for the signed in user's business, using the user client.
 * Use in server components and server actions.
 */
export async function getPlanAccess(): Promise<PlanAccess> {
  const businessId = await getBusinessId();
  if (!businessId) return toAccess(null, 0);
  const supabase = await createClient();
  // Full billing read. If the billing columns are not migrated yet the
  // select errors, so fall back to the plan column alone. A paid Pro
  // account must still read as Pro during the rollout window.
  const full = await supabase
    .from("businesses")
    .select(
      "id, plan, grandfathered, stripe_customer_id, subscription_status, trial_ends_at, current_period_end"
    )
    .eq("id", businessId)
    .single();
  let business = (full.data as BusinessBillingRow | null) ?? null;
  if (full.error) {
    const planOnly = await supabase
      .from("businesses")
      .select("id, plan")
      .eq("id", businessId)
      .single();
    business = (planOnly.data as BusinessBillingRow | null) ?? null;
  }
  const { count } = await supabase
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);
  return toAccess(business, count ?? 0);
}

/**
 * True when the business has Pro access. The parameter type is loose on
 * purpose: the generated Supabase client type is too deep to check
 * structurally. Works with any Supabase client (user client in actions,
 * service role client in the cron worker).
 * Falls back to the plan column alone when the billing columns are not
 * migrated yet, so scans keep working during the rollout window.
 */
export async function isProBusiness(
  supabase: { from: (...args: never[]) => unknown },
  businessId: string
): Promise<boolean> {
  const client = supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string
        ) => PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
  };
  const full = await client
    .from("businesses")
    .select("plan, grandfathered")
    .eq("id", businessId);
  if (!full.error && Array.isArray(full.data) && full.data.length > 0) {
    const row = full.data[0] as unknown as BusinessBillingRow;
    return row.plan === "pro" || row.grandfathered === true;
  }
  const planOnly = await client
    .from("businesses")
    .select("plan")
    .eq("id", businessId);
  if (!planOnly.error && Array.isArray(planOnly.data) && planOnly.data.length > 0) {
    return (
      (planOnly.data[0] as unknown as BusinessBillingRow).plan === "pro"
    );
  }
  return false;
}
