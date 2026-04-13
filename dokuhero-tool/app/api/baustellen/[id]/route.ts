import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().max(5000).nullable().optional(),
});

export async function GET(_request: Request, context: Ctx) {
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
      `SELECT id, user_id, name, address, created_at, updated_at
       FROM baustellen WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, userId]
    );
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }
    return NextResponse.json({ baustelle: row });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Ctx) {
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

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    if (parsed.data.name !== undefined) {
      sets.push("name = ?");
      vals.push(parsed.data.name.trim());
    }
    if (parsed.data.address !== undefined) {
      sets.push("address = ?");
      vals.push(parsed.data.address?.trim() || null);
    }
    if (sets.length === 0) {
      return NextResponse.json({ error: "Keine Felder" }, { status: 400 });
    }
    vals.push(id, userId);

    const pool = getPool();
    const [res] = await pool.execute<ResultSetHeader>(
      `UPDATE baustellen SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      vals
    );
    if (res.affectedRows === 0) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
