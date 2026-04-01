import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { generateProtokollText } from "@/lib/ai";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface Row extends RowDataPacket {
  notiz: string | null;
  betrieb_name: string;
}

type RouteContext = { params: { id: string } };

export async function POST(_request: Request, context: RouteContext) {
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

    const [rows] = await pool.execute<Row[]>(
      `SELECT p.notiz, b.name AS betrieb_name
       FROM protokolle p
       INNER JOIN auftraege a ON p.auftrag_id = a.id
       INNER JOIN betriebe b ON a.betrieb_id = b.id
       WHERE p.id = ? AND a.betrieb_id = ?
       LIMIT 1`,
      [protokollId, session.user.betrieb_id]
    );

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const notizText = row.notiz ?? "";
    const kiText = await generateProtokollText(notizText, row.betrieb_name);

    await pool.execute(`UPDATE protokolle SET ki_text = ? WHERE id = ?`, [
      kiText,
      protokollId,
    ]);

    return NextResponse.json({ kiText });
  } catch (error) {
    console.error("Protokoll preview Fehler:", error);
    const message =
      error instanceof Error ? error.message : "Textgenerierung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
