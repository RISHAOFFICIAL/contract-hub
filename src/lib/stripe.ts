// Stripe client and Pro price configuration for Contract Hub.
// Server only. Keys come from environment variables, never from code.
// See .env.example for the variables to set in Vercel.

import Stripe from "stripe";

export const TRIAL_DAYS = 7;

let stripeClient: Stripe | null = null;

/** Lazy Stripe client. Throws a plain error when the key is not set. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in the environment."
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export type BillingPeriod = "monthly" | "annual";

/** Price id for the Pro tier. Create the prices in the Stripe dashboard. */
export function getPriceId(period: BillingPeriod): string {
  const id =
    period === "monthly"
      ? process.env.STRIPE_PRICE_ID_PRO_MONTHLY
      : process.env.STRIPE_PRICE_ID_PRO_ANNUAL;
  if (!id) {
    throw new Error(
      `Stripe price for Pro ${period} is not configured. Set ${
        period === "monthly"
          ? "STRIPE_PRICE_ID_PRO_MONTHLY"
          : "STRIPE_PRICE_ID_PRO_ANNUAL"
      } in the environment.`
    );
  }
  return id;
}

/** Public URL of the app, used for Stripe Checkout return links. */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://contract-hub-mu.vercel.app";
}
