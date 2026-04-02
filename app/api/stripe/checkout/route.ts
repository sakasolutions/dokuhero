import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

type Body =
  | { priceId?: unknown }
  | { plan?: unknown; billing?: unknown };

function allowedPriceIds(): string[] {
  const ids = [
    process.env.STRIPE_PRICE_STARTER_MONTHLY,
    process.env.STRIPE_PRICE_STARTER_YEARLY,
    process.env.STRIPE_PRICE_PRO_MONTHLY,
    process.env.STRIPE_PRICE_PRO_YEARLY,
    process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    process.env.STRIPE_PRICE_BUSINESS_YEARLY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEARLY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_YEARLY,
  ].filter(Boolean) as string[];
  return [...new Set(ids)];
}

function priceIdFor(
  plan: "starter" | "pro" | "business",
  billing: "monthly" | "yearly"
): string | null {
  if (plan === "starter" && billing === "monthly")
    return process.env.STRIPE_PRICE_STARTER_MONTHLY ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY ?? null;
  if (plan === "starter" && billing === "yearly")
    return process.env.STRIPE_PRICE_STARTER_YEARLY ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEARLY ?? null;
  if (plan === "pro" && billing === "monthly")
    return process.env.STRIPE_PRICE_PRO_MONTHLY ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY ?? null;
  if (plan === "pro" && billing === "yearly")
    return process.env.STRIPE_PRICE_PRO_YEARLY ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY ?? null;
  if (plan === "business" && billing === "monthly")
    return process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY ?? null;
  if (plan === "business" && billing === "yearly")
    return process.env.STRIPE_PRICE_BUSINESS_YEARLY ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_YEARLY ?? null;
  return null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const betriebId = session?.user?.betrieb_id;
  if (!betriebId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ungültiger Body." }, { status: 400 });
  }

  // Backward compatible: accept either { priceId } or { plan, billing }
  let priceId = typeof (body as any).priceId === "string" ? ((body as any).priceId as string) : null;
  if (!priceId) {
    const planRaw = (body as any).plan;
    const billingRaw = (body as any).billing;
    const plan =
      planRaw === "starter" || planRaw === "pro" || planRaw === "business"
        ? planRaw
        : null;
    const billing =
      billingRaw === "monthly" || billingRaw === "yearly" ? billingRaw : null;
    if (plan && billing) {
      priceId = priceIdFor(plan, billing);
    }
  }
  if (!priceId) {
    return NextResponse.json(
      { error: "priceId fehlt (oder plan/billing ungültig)." },
      { status: 400 }
    );
  }
  if (!allowedPriceIds().includes(priceId)) {
    return NextResponse.json({ error: "Ungültiger Preis." }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_URL fehlt." },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  const stripeSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: String(betriebId),
    success_url: `${baseUrl}/dashboard?payment=success`,
    cancel_url: `${baseUrl}/preise`,
  });

  return NextResponse.json({ url: stripeSession.url });
}

