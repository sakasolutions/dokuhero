import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { Pool } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

interface CountRow extends RowDataPacket {
  c: number;
}

interface FeedbackRow extends RowDataPacket {
  feedback_text: string | null;
}

async function countSafe(
  pool: Pool,
  sql: string,
  params: [number]
): Promise<number> {
  try {
    const [rows] = await pool.execute<CountRow[]>(sql, params);
    const first = rows[0];
    return Number(first?.c ?? 0);
  } catch (error) {
    console.error("[dashboard/stats] Abfrage fehlgeschlagen:", sql, error);
    return 0;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const betriebId = session.user.betrieb_id;
    const pool = getPool();

    const kundenGesamt = await countSafe(
      pool,
      "SELECT COUNT(*) AS c FROM kunden WHERE betrieb_id = ?",
      [betriebId]
    );

    const auftraegeHeute = await countSafe(
      pool,
      `SELECT COUNT(*) AS c FROM auftraege
       WHERE betrieb_id = ? AND DATE(erstellt_am) = CURDATE()`,
      [betriebId]
    );

    // Nur Spalten aus bekannten Tabellen; Woche über erstellt_am des Auftrags
    const protokolleDieseWoche = await countSafe(
      pool,
      `SELECT COUNT(*) AS c
       FROM protokolle p
       INNER JOIN auftraege a ON p.auftrag_id = a.id
       WHERE a.betrieb_id = ?
         AND YEARWEEK(a.erstellt_am, 1) = YEARWEEK(CURDATE(), 1)`,
      [betriebId]
    );

    const offeneAuftraege = await countSafe(
      pool,
      `SELECT COUNT(*) AS c FROM auftraege
       WHERE betrieb_id = ? AND abgeschlossen_am IS NULL`,
      [betriebId]
    );

    const bewertungJoin = `FROM bewertungen b
       INNER JOIN protokolle p ON p.id = b.protokoll_id
       INNER JOIN auftraege a ON a.id = p.auftrag_id
       WHERE a.betrieb_id = ?`;

    const bewertungen_positiv = await countSafe(
      pool,
      `SELECT COUNT(*) AS c ${bewertungJoin} AND b.zufrieden = 1`,
      [betriebId]
    );

    const bewertungen_negativ = await countSafe(
      pool,
      `SELECT COUNT(*) AS c ${bewertungJoin} AND b.zufrieden = 0`,
      [betriebId]
    );

    let letztes_feedback: string | null = null;
    try {
      const [fbRows] = await pool.execute<FeedbackRow[]>(
        `SELECT b.feedback_text
         ${bewertungJoin}
           AND b.zufrieden = 0
           AND b.feedback_text IS NOT NULL
           AND TRIM(b.feedback_text) <> ''
         ORDER BY b.erstellt_am DESC, b.id DESC
         LIMIT 1`,
        [betriebId]
      );
      const t = fbRows[0]?.feedback_text?.trim();
      letztes_feedback = t && t.length > 0 ? t : null;
    } catch (error) {
      console.error("[dashboard/stats] letztes_feedback:", error);
    }

    return NextResponse.json({
      kundenGesamt,
      auftraegeHeute,
      protokolleDieseWoche,
      offeneAuftraege,
      bewertungen_positiv,
      bewertungen_negativ,
      letztes_feedback,
    });
  } catch (error) {
    console.error("[dashboard/stats]", error);
    return NextResponse.json(
      { error: "Statistiken konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
