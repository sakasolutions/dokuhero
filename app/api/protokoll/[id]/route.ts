import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

interface ProtokollRow extends RowDataPacket {
  id: number;
  auftrag_id: number;
  ki_text: string | null;
  pdf_pfad: string | null;
  gesendet_am: Date | null;
}

interface FotoRow extends RowDataPacket {
  id: number;
  auftrag_id: number;
  pfad: string;
  erstellt_am: Date;
}

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const protokollId = Number(context.params.id);
    if (!Number.isFinite(protokollId)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const pool = getPool();

    const [prows] = await pool.execute<ProtokollRow[]>(
      `SELECT p.id, p.auftrag_id, p.ki_text, p.pdf_pfad, p.gesendet_am
       FROM protokolle p
       INNER JOIN auftraege a ON p.auftrag_id = a.id
       WHERE p.id = ? AND a.betrieb_id = ?
       LIMIT 1`,
      [protokollId, session.user.betrieb_id]
    );

    const protokoll = prows[0];
    if (!protokoll) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const [frows] = await pool.execute<FotoRow[]>(
      `SELECT id, auftrag_id, pfad, erstellt_am FROM fotos
       WHERE auftrag_id = ?
       ORDER BY erstellt_am ASC, id ASC`,
      [protokoll.auftrag_id]
    );

    return NextResponse.json({ protokoll, fotos: frows });
  } catch (error) {
    console.error("Protokoll GET Fehler:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
