import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

interface Row extends RowDataPacket {
  id: number;
  betrieb_id: number;
  kunde_id: number | null;
  auftragsnummer: string | null;
  status: string;
  erstellt_am: Date;
  abgeschlossen_am: Date | null;
  kunde_name: string | null;
  protokoll_anzahl: number;
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<Row[]>(
      `SELECT a.id, a.betrieb_id, a.kunde_id, a.auftragsnummer, a.status, a.erstellt_am, a.abgeschlossen_am,
              k.name AS kunde_name,
              (SELECT COUNT(*) FROM protokolle p WHERE p.auftrag_id = a.id AND p.archiviert = 0) AS protokoll_anzahl
       FROM auftraege a
       LEFT JOIN kunden k ON k.id = a.kunde_id AND k.betrieb_id = a.betrieb_id
       WHERE a.betrieb_id = ? AND a.status IN ('offen', 'in_bearbeitung') AND a.archiviert = 0
       ORDER BY a.erstellt_am DESC`,
      [session.user.betrieb_id]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Aufträge offen API Fehler:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
