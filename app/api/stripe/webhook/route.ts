import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";

function getPriceIdFromSubscription(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0];
  const id = item?.price?.id;
  return typeof id === "string" ? id : null;
}

function planFromPriceId(priceId: string): "starter" | "pro" | "business" {
  const businessMonthly = process.env.STRIPE_PRICE_BUSINESS_MONTHLY;
  const businessYearly = process.env.STRIPE_PRICE_BUSINESS_YEARLY;
  if (
    priceId === businessMonthly ||
    priceId === businessYearly
  ) {
    return "business";
  }
  const proMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const proYearly = process.env.STRIPE_PRICE_PRO_YEARLY;
  if (priceId === proMonthly || priceId === proYearly) return "pro";
  return "starter";
}

function limitsForPlan(plan: "starter" | "pro" | "business"): {
  max_protokolle: number;
  max_benutzer: number;
} {
  if (plan === "business") return { max_protokolle: 9999, max_benutzer: 15 };
  if (plan === "pro") return { max_protokolle: 9999, max_benutzer: 5 };
  return { max_protokolle: 50, max_benutzer: 1 };
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
  }

  const pool = getPool();

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const betriebIdRaw = s.client_reference_id;
      const betriebId = betriebIdRaw ? Number(betriebIdRaw) : NaN;
      if (!betriebId || Number.isNaN(betriebId)) {
        return NextResponse.json({ error: "Missing betrieb id" }, { status: 400 });
      }

      const customerId =
        typeof s.customer === "string"
          ? s.customer
          : s.customer?.id ?? null;

      const subscriptionId =
        typeof s.subscription === "string"
          ? s.subscription
          : s.subscription?.id ?? null;

      if (!subscriptionId) {
        return NextResponse.json(
          { error: "Missing subscription" },
          { status: 400 }
        );
      }

      const subscriptionResp = await stripe.subscriptions.retrieve(subscriptionId);
      const subscription = subscriptionResp as unknown as Stripe.Subscription;
      const priceId = getPriceIdFromSubscription(subscription);
      if (!priceId) {
        return NextResponse.json({ error: "Missing price" }, { status: 400 });
      }

      const plan = planFromPriceId(priceId);
      const { max_protokolle, max_benutzer } = limitsForPlan(plan);
      const currentPeriodEnd = Number((subscription as any).current_period_end);
      const aboBis = new Date(
        (Number.isFinite(currentPeriodEnd) ? currentPeriodEnd : Date.now() / 1000) *
          1000
      );

      await pool.execute(
        `UPDATE betriebe
         SET plan = ?, max_protokolle = ?, max_benutzer = ?, abo_bis = ?, stripe_customer_id = ?
         WHERE id = ?`,
        [plan, max_protokolle, max_benutzer, aboBis, customerId, betriebId]
      );
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await pool.execute(
        `UPDATE betriebe SET plan = 'expired' WHERE stripe_customer_id = ?`,
        [customerId]
      );
    }

    if (event.type === "invoice.payment_failed") {
      const inv = event.data.object as Stripe.Invoice;
      const customerId =
        typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
      if (customerId) {
        await pool.execute(
          `UPDATE betriebe SET plan = 'expired' WHERE stripe_customer_id = ?`,
          [customerId]
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

