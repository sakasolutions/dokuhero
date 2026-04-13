import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { z } from "zod";

export const dynamic = "force-dynamic";

const postBody = z.object({
  name: z.string().min(1).max(255),
  address: z.string().max(8000).nullable().optional(),
  customer_name: z.string().max(255).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const uid = Number(session?.user?.id);
    if (!session?.user?.id || !Number.isFinite(uid)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, user_id, name, address, customer_name, notes, is_archived, created_at, updated_at
       FROM baustellen WHERE user_id = ? AND is_archived = 0 ORDER BY name ASC`,
      [uid]
    );
    return NextResponse.json({ baustellen: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const uid = Number(session?.user?.id);
    if (!session?.user?.id || !Number.isFinite(uid)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const json = await req.json().catch(() => null);
    const p = postBody.safeParse(json);
    if (!p.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const pool = getPool();
    const [r] = await pool.execute<ResultSetHeader>(
      `INSERT INTO baustellen (user_id, name, address, customer_name, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        uid,
        p.data.name.trim(),
        p.data.address?.trim() || null,
        p.data.customer_name?.trim() || null,
        p.data.notes?.trim() || null,
      ]
    );
    return NextResponse.json({ id: r.insertId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
