// Stripe webhook: keeps the businesses table in sync with subscriptions.
// The webhook uses the service role key, never the user session, so it
// can update billing columns that account holders cannot change.
// Endpoint: POST /api/billing/webhook
// Configure it in the Stripe dashboard (Developers, Webhooks) with events:
// checkout.session.completed, customer.subscription.created,
// customer.subscription.updated, customer.subscription.deleted.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type BillingUpdate = {
  plan: "free" | "pro";
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: string | null;
  current_period_end?: string | null;
  trial_ends_at?: string | null;
};

function toIso(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase service role is not configured.");
  }
  return createClient(url, serviceKey);
}

/** Plan from a Stripe subscription status. Trialing and active are Pro. */
function planForStatus(status: string): "free" | "pro" {
  return status === "active" || status === "trialing" ? "pro" : "free";
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  businessIdOverride?: string
) {
  const businessId =
    businessIdOverride ?? subscription.metadata?.business_id;
  const supabase = serviceClient();

  // Find the business by subscription id first, then by metadata.
  const { data: bySubscription } = await supabase
    .from("businesses")
    .select("id, grandfathered")
    .eq("stripe_subscription_id", subscription.id)
    .limit(1);
  let found = bySubscription;
  if (!found || found.length === 0) {
    if (!businessId) {
      console.error(
        "Stripe webhook: subscription has no business id",
        subscription.id
      );
      return;
    }
    const byBusiness = await supabase
      .from("businesses")
      .select("id, grandfathered")
      .eq("id", businessId)
      .limit(1);
    found = byBusiness.data;
  }
  const business = (found ?? [])[0] as
    | { id: string; grandfathered: boolean | null }
    | undefined;
  if (!business) {
    console.error(
      "Stripe webhook: no business found for subscription",
      subscription.id
    );
    return;
  }

  const item = subscription.items.data[0];
  const update: BillingUpdate = {
    plan: planForStatus(subscription.status),
    stripe_customer_id:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    current_period_end: toIso(item?.current_period_end),
    trial_ends_at: toIso(subscription.trial_end),
  };
  const { error } = await supabase
    .from("businesses")
    .update(update)
    .eq("id", business.id);
  if (error) {
    console.error("Stripe webhook: business update failed", error);
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Stripe webhook: STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json(
      { ok: false, error: "webhook not configured" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "missing signature" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("Stripe webhook: signature verification failed", err);
    return NextResponse.json(
      { ok: false, error: "invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await syncSubscription(
            subscription,
            session.metadata?.business_id
          );
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook: handler failed", err);
    return NextResponse.json(
      { ok: false, error: "handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
