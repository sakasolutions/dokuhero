import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

interface CountRow extends RowDataPacket {
  c: number;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const betriebId = session.user.betrieb_id;
    const pool = getPool();

    const [[kundenGesamt]] = await pool.execute<CountRow[]>(
      "SELECT COUNT(*) AS c FROM kunden WHERE betrieb_id = ?",
      [betriebId]
    );

    const [[auftraegeHeute]] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) AS c FROM auftraege
       WHERE betrieb_id = ? AND DATE(erstellt_am) = CURDATE()`,
      [betriebId]
    );

    const [[protokolleDieseWoche]] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) AS c
       FROM protokolle p
       INNER JOIN auftraege a ON p.auftrag_id = a.id
       WHERE a.betrieb_id = ?
         AND YEARWEEK(COALESCE(p.gesendet_am, a.erstellt_am), 1) = YEARWEEK(CURDATE(), 1)`,
      [betriebId]
    );

    const [[offeneAuftraege]] = await pool.execute<CountRow[]>(
      `SELECT COUNT(*) AS c FROM auftraege
       WHERE betrieb_id = ? AND abgeschlossen_am IS NULL`,
      [betriebId]
    );

    return NextResponse.json({
      kundenGesamt: Number(kundenGesamt?.c ?? 0),
      auftraegeHeute: Number(auftraegeHeute?.c ?? 0),
      protokolleDieseWoche: Number(protokolleDieseWoche?.c ?? 0),
      offeneAuftraege: Number(offeneAuftraege?.c ?? 0),
    });
  } catch {
    return NextResponse.json(
      { error: "Statistiken konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
