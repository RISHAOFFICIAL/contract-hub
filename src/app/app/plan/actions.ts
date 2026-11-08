"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlanAccess } from "@/lib/billing";
import {
  getAppUrl,
  getPriceId,
  getStripe,
  TRIAL_DAYS,
  type BillingPeriod,
} from "@/lib/stripe";

/**
 * Start a Stripe Checkout subscription with a 7-day free trial.
 * The card is collected at checkout and charged after the trial ends
 * unless the customer cancels. Grandfathered and Pro accounts cannot
 * check out again.
 */
export async function startCheckout(formData: FormData) {
  const period: BillingPeriod =
    formData.get("period") === "annual" ? "annual" : "monthly";
  const access = await getPlanAccess();
  if (!access.businessId) redirect("/app");
  if (access.isPro) redirect("/app/plan");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/app/plan");

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email ?? undefined,
    line_items: [{ price: getPriceId(period), quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { business_id: access.businessId },
    },
    metadata: { business_id: access.businessId },
    allow_promotion_codes: true,
    success_url: `${getAppUrl()}/app/plan?billing=success`,
    cancel_url: `${getAppUrl()}/app/plan?billing=cancelled`,
  });
  if (!session.url) redirect("/app/plan?billing=error");
  redirect(session.url);
}

/**
 * Open the Stripe customer portal so a Pro customer can update their
 * card, change between monthly and annual, or cancel. The portal must
 * be enabled in the Stripe dashboard or Stripe returns an error page.
 */
export async function openBillingPortal() {
  const access = await getPlanAccess();
  if (!access.businessId || !access.stripeCustomerId) {
    redirect("/app/plan");
  }
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: access.stripeCustomerId,
    return_url: `${getAppUrl()}/app/plan`,
  });
  redirect(session.url);
}
