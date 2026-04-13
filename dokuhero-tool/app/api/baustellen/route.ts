import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { z } from "zod";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().max(5000).optional().nullable(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number(session?.user?.id);
    if (!session?.user?.id || !Number.isFinite(userId)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, user_id, name, address, created_at, updated_at
       FROM baustellen WHERE user_id = ? ORDER BY name ASC`,
      [userId]
    );
    return NextResponse.json({ baustellen: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number(session?.user?.id);
    if (!session?.user?.id || !Number.isFinite(userId)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    const pool = getPool();
    const [res] = await pool.execute<ResultSetHeader>(
      `INSERT INTO baustellen (user_id, name, address) VALUES (?, ?, ?)`,
      [userId, parsed.data.name.trim(), parsed.data.address?.trim() || null]
    );

    return NextResponse.json({ id: res.insertId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Fehler beim Anlegen" }, { status: 500 });
  }
}
