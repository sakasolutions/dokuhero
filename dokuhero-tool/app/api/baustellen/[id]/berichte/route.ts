import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const postSchema = z.object({
  report_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function GET(_request: Request, context: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number(session?.user?.id);
    if (!session?.user?.id || !Number.isFinite(userId)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const baustelleId = Number(context.params.id);
    if (!Number.isFinite(baustelleId)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const pool = getPool();
    const [b] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM baustellen WHERE id = ? AND user_id = ? LIMIT 1",
      [baustelleId, userId]
    );
    if (!b[0]) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, baustelle_id, report_date, raw_note, formatted_text, pdf_path, status, created_at, updated_at
       FROM berichte WHERE baustelle_id = ? ORDER BY report_date DESC, id DESC`,
      [baustelleId]
    );
    return NextResponse.json({ berichte: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}

export async function POST(request: Request, context: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number(session?.user?.id);
    if (!session?.user?.id || !Number.isFinite(userId)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const baustelleId = Number(context.params.id);
    if (!Number.isFinite(baustelleId)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = postSchema.safeParse(body);

    const pool = getPool();
    const [b] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM baustellen WHERE id = ? AND user_id = ? LIMIT 1",
      [baustelleId, userId]
    );
    if (!b[0]) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const reportDate =
      parsed.success && parsed.data.report_date
        ? parsed.data.report_date
        : new Date().toISOString().slice(0, 10);

    const [res] = await pool.execute<ResultSetHeader>(
      `INSERT INTO berichte (baustelle_id, report_date, status) VALUES (?, ?, 'draft')`,
      [baustelleId, reportDate]
    );

    return NextResponse.json({ id: res.insertId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
