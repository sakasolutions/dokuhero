import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

interface Row extends RowDataPacket {
  id: number;
  protokoll_id: number | null;
  zufrieden: number | null;
  feedback_text: string | null;
  erstellt_am: Date;
  betrieb_name: string;
  betrieb_id: number;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<Row[]>(
      `SELECT b.id, b.protokoll_id, b.zufrieden, b.feedback_text, b.erstellt_am,
              bet.name AS betrieb_name, bet.id AS betrieb_id
       FROM bewertungen b
       INNER JOIN protokolle p ON p.id = b.protokoll_id
       INNER JOIN auftraege a ON a.id = p.auftrag_id
       INNER JOIN betriebe bet ON bet.id = a.betrieb_id
       ORDER BY b.erstellt_am DESC, b.id DESC
       LIMIT 500`
    );

    const bewertungen = rows.map((r) => ({
      id: r.id,
      protokoll_id: r.protokoll_id,
      betrieb_id: r.betrieb_id,
      betrieb_name: r.betrieb_name,
      zufrieden: r.zufrieden,
      feedback_text: r.feedback_text,
      erstellt_am:
        r.erstellt_am instanceof Date
          ? r.erstellt_am.toISOString()
          : String(r.erstellt_am),
    }));

    return NextResponse.json({ bewertungen });
  } catch (e) {
    console.error("[admin/bewertungen]", e);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
