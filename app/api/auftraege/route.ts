import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";

const STATUS_OFFEN = "offen";

interface AuftragRow extends RowDataPacket {
  id: number;
  betrieb_id: number;
  kunde_id: number | null;
  beschreibung: string | null;
  status: string;
  erstellt_am: Date;
  abgeschlossen_am: Date | null;
  archiviert: number;
  kunde_name: string | null;
  protokoll_id: number | null;
  protokoll_status: string | null;
}

const createSchema = z.object({
  kunde_id: z.coerce.number().int().positive("Kunde auswählen"),
  beschreibung: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const protokollStatusFilter =
      searchParams.get("protokoll_status")?.trim() ?? "";
    const filterZurPruefung = protokollStatusFilter === "zur_pruefung";
    const showArchiv = searchParams.get("archiv") === "1";
    const archClause = showArchiv
      ? "AND a.archiviert = 1"
      : "AND a.archiviert = 0";

    const pool = getPool();
    const [rows] = await pool.execute<AuftragRow[]>(
      `SELECT a.id, a.betrieb_id, a.kunde_id, a.beschreibung, a.status, a.erstellt_am, a.abgeschlossen_am, a.archiviert,
              k.name AS kunde_name,
              pr.id AS protokoll_id,
              pr.status AS protokoll_status
       FROM auftraege a
       LEFT JOIN kunden k ON k.id = a.kunde_id AND k.betrieb_id = a.betrieb_id
       LEFT JOIN protokolle pr ON pr.auftrag_id = a.id
         AND pr.id = (
           SELECT pr2.id FROM protokolle pr2
           WHERE pr2.auftrag_id = a.id
           ORDER BY pr2.erstellt_am DESC, pr2.id DESC
           LIMIT 1
         )
       WHERE a.betrieb_id = ?
         ${archClause}
         ${filterZurPruefung ? "AND pr.status = 'zur_pruefung'" : ""}
       ORDER BY a.erstellt_am DESC`,
      [session.user.betrieb_id]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Aufträge API Fehler:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { kunde_id, beschreibung } = parsed.data;
    const pool = getPool();

    const [check] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM kunden WHERE id = ? AND betrieb_id = ? LIMIT 1",
      [kunde_id, session.user.betrieb_id]
    );
    if (!check[0]) {
      return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 400 });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO auftraege (betrieb_id, kunde_id, beschreibung, status, erstellt_am, abgeschlossen_am, archiviert)
       VALUES (?, ?, ?, ?, NOW(), NULL, 0)`,
      [
        session.user.betrieb_id,
        kunde_id,
        beschreibung?.trim() || null,
        STATUS_OFFEN,
      ]
    );

    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (error) {
    console.error("Aufträge API Fehler:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
