import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { formatBericht, polishRawNote } from "@/lib/ai";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: { id: string } };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    const uid = Number(session?.user?.id);
    if (!session?.user?.id || !Number.isFinite(uid)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT b.id, b.raw_note, b.title, bs.name AS baustelle_name
       FROM berichte b
       INNER JOIN baustellen bs ON bs.id = b.baustelle_id
       WHERE b.id = ? AND bs.user_id = ? LIMIT 1`,
      [id, uid]
    );
    const row = rows[0] as
      | { id: number; raw_note: string | null; title: string; baustelle_name: string }
      | undefined;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const raw = row.raw_note?.trim() ?? "";
    if (!raw) {
      return NextResponse.json({ error: "Keine Notiz." }, { status: 400 });
    }
    let polished = raw;
    try {
      polished = await polishRawNote(raw);
    } catch {
      polished = raw;
    }
    const formatted = await formatBericht(polished, row.baustelle_name);
    await pool.execute(
      `UPDATE berichte SET raw_note = ?, formatted_text = ?, status = 'formatted' WHERE id = ?`,
      [polished, formatted, id]
    );
    return NextResponse.json({ ok: true, formatted_text: formatted });
  } catch (e) {
    console.error(e);
    const m = e instanceof Error ? e.message : "Fehler";
    return NextResponse.json({ error: m }, { status: 500 });
  }
}
