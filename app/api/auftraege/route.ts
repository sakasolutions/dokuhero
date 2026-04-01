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
  kunde_name: string | null;
  protokoll_id: number | null;
}

const createSchema = z.object({
  kunde_id: z.coerce.number().int().positive("Kunde auswählen"),
  beschreibung: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<AuftragRow[]>(
      `SELECT a.id, a.betrieb_id, a.kunde_id, a.beschreibung, a.status, a.erstellt_am, a.abgeschlossen_am,
              k.name AS kunde_name,
              (SELECT pr.id FROM protokolle pr
               WHERE pr.auftrag_id = a.id
               ORDER BY pr.erstellt_am DESC, pr.id DESC
               LIMIT 1) AS protokoll_id
       FROM auftraege a
       LEFT JOIN kunden k ON k.id = a.kunde_id AND k.betrieb_id = a.betrieb_id
       WHERE a.betrieb_id = ?
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
      `INSERT INTO auftraege (betrieb_id, kunde_id, beschreibung, status, erstellt_am, abgeschlossen_am)
       VALUES (?, ?, ?, ?, NOW(), NULL)`,
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
