import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { formatRawNote, generateBerichtText } from "@/lib/ai";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: { id: string } };

export async function POST(_request: Request, context: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number(session?.user?.id);
    if (!session?.user?.id || !Number.isFinite(userId)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const id = Number(context.params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT b.id, b.raw_note, b.status, bs.name AS baustelle_name
       FROM berichte b
       INNER JOIN baustellen bs ON bs.id = b.baustelle_id
       WHERE b.id = ? AND bs.user_id = ?
       LIMIT 1`,
      [id, userId]
    );
    const row = rows[0] as
      | {
          id: number;
          raw_note: string | null;
          status: string;
          baustelle_name: string;
        }
      | undefined;
    if (!row) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const raw = row.raw_note?.trim() ?? "";
    if (!raw) {
      return NextResponse.json(
        { error: "Keine Notiz zum Formulieren." },
        { status: 400 }
      );
    }

    let cleaned = raw;
    try {
      cleaned = await formatRawNote(raw);
    } catch {
      cleaned = raw;
    }

    const formatted = await generateBerichtText(cleaned, row.baustelle_name);

    await pool.execute(
      `UPDATE berichte SET raw_note = ?, formatted_text = ?, status = 'formatted' WHERE id = ?`,
      [cleaned, formatted, id]
    );

    return NextResponse.json({ ok: true, formatted_text: formatted });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Formulierung fehlgeschlagen.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
