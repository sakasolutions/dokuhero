import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const postBody = z.object({
  title: z.string().max(500).optional(),
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function assertBaustelle(pool: ReturnType<typeof getPool>, bid: number, uid: number) {
  const [r] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM baustellen WHERE id = ? AND user_id = ? LIMIT 1",
    [bid, uid]
  );
  return !!r[0];
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    const uid = Number(session?.user?.id);
    if (!session?.user?.id || !Number.isFinite(uid)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const bid = Number(params.id);
    if (!Number.isFinite(bid)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
    const pool = getPool();
    if (!(await assertBaustelle(pool, bid, uid))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, baustelle_id, title, status, report_date, pdf_path, created_at, updated_at
       FROM berichte WHERE baustelle_id = ? ORDER BY report_date DESC, id DESC`,
      [bid]
    );
    return NextResponse.json({ berichte: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    const uid = Number(session?.user?.id);
    if (!session?.user?.id || !Number.isFinite(uid)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const bid = Number(params.id);
    if (!Number.isFinite(bid)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
    const pool = getPool();
    if (!(await assertBaustelle(pool, bid, uid))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const json = await req.json().catch(() => ({}));
    const p = postBody.safeParse(json);
    const title = (p.success && p.data.title?.trim()) || "Bericht";
    const rd =
      p.success && p.data.report_date
        ? p.data.report_date
        : new Date().toISOString().slice(0, 10);
    const [r] = await pool.execute<ResultSetHeader>(
      `INSERT INTO berichte (baustelle_id, title, report_date, status) VALUES (?, ?, ?, 'draft')`,
      [bid, title, rd]
    );
    return NextResponse.json({ id: r.insertId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
