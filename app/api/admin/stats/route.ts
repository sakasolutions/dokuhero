import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

interface C extends RowDataPacket {
  c: number;
}

async function count(pool: ReturnType<typeof getPool>, sql: string): Promise<number> {
  const [rows] = await pool.execute<C[]>(sql);
  return Number(rows[0]?.c ?? 0);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const pool = getPool();

    const [
      betriebe_gesamt,
      protokolle_gesamt,
      bewertungen_positiv,
      bewertungen_negativ,
      registrierungen_heute,
    ] = await Promise.all([
      count(pool, "SELECT COUNT(*) AS c FROM betriebe"),
      count(pool, "SELECT COUNT(*) AS c FROM protokolle"),
      count(
        pool,
        "SELECT COUNT(*) AS c FROM bewertungen WHERE zufrieden = 1"
      ),
      count(
        pool,
        "SELECT COUNT(*) AS c FROM bewertungen WHERE zufrieden = 0"
      ),
      count(
        pool,
        "SELECT COUNT(*) AS c FROM betriebe WHERE DATE(erstellt_am) = CURDATE()"
      ),
    ]);

    return NextResponse.json({
      betriebe_gesamt,
      protokolle_gesamt,
      bewertungen_positiv,
      bewertungen_negativ,
      registrierungen_heute,
    });
  } catch (e) {
    console.error("[admin/stats]", e);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
