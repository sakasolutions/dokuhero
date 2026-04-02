import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { STARTER_PROTOKOLL_MONATS_LIMIT } from "@/lib/protokoll-limit";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COUNT_SQL = `SELECT COUNT(*) AS c
  FROM protokolle p
  INNER JOIN auftraege a ON a.id = p.auftrag_id
  WHERE a.betrieb_id = ?
    AND MONTH(p.erstellt_am) = MONTH(NOW())
    AND YEAR(p.erstellt_am) = YEAR(NOW())`;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const betriebId = session.user.betrieb_id;
    const planRaw = session.user.plan;
    const plan =
      typeof planRaw === "string" ? planRaw.trim().toLowerCase() : "";

    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(COUNT_SQL, [betriebId]);
    const count = Number((rows[0] as { c?: unknown })?.c ?? 0);

    if (plan !== "starter") {
      return NextResponse.json({
        limitReached: false,
        count,
        limit: 0,
      });
    }

    const limit = STARTER_PROTOKOLL_MONATS_LIMIT;
    return NextResponse.json({
      limitReached: count >= limit,
      count,
      limit,
    });
  } catch (e) {
    console.error("GET /api/protokoll/limit:", e);
    return NextResponse.json(
      { error: "Limit konnte nicht geprüft werden." },
      { status: 500 }
    );
  }
}
