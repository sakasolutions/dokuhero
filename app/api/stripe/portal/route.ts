import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface BetriebStripeRow extends RowDataPacket {
  stripe_customer_id: string | null;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const betriebId = session?.user?.betrieb_id;
  if (!betriebId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const pool = getPool();
  const [rows] = await pool.execute<BetriebStripeRow[]>(
    "SELECT stripe_customer_id FROM betriebe WHERE id = ? LIMIT 1",
    [betriebId]
  );
  const stripe_customer_id = rows[0]?.stripe_customer_id?.trim() ?? "";
  if (!stripe_customer_id) {
    return NextResponse.json(
      { error: "Kein aktives Abo gefunden" },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripe_customer_id,
      return_url: "https://dokuhero.de/einstellungen",
    });
    if (!portalSession.url) {
      return NextResponse.json(
        { error: "Portal-URL fehlt." },
        { status: 500 }
      );
    }
    return NextResponse.json({ url: portalSession.url });
  } catch (e) {
    console.error("[stripe/portal]", e);
    return NextResponse.json(
      { error: "Kundenportal konnte nicht geöffnet werden." },
      { status: 500 }
    );
  }
}
