import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const patchBody = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().max(8000).nullable().optional(),
  customer_name: z.string().max(255).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
  is_archived: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: Ctx) {
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
      `SELECT id, user_id, name, address, customer_name, notes, is_archived, created_at, updated_at
       FROM baustellen WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, uid]
    );
    if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ baustelle: rows[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    const uid = Number(session?.user?.id);
    if (!session?.user?.id || !Number.isFinite(uid)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
    const json = await req.json().catch(() => null);
    const p = patchBody.safeParse(json);
    if (!p.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    const d = p.data;
    if (d.name !== undefined) {
      sets.push("name = ?");
      vals.push(d.name.trim());
    }
    if (d.address !== undefined) {
      sets.push("address = ?");
      vals.push(d.address?.trim() || null);
    }
    if (d.customer_name !== undefined) {
      sets.push("customer_name = ?");
      vals.push(d.customer_name?.trim() || null);
    }
    if (d.notes !== undefined) {
      sets.push("notes = ?");
      vals.push(d.notes?.trim() || null);
    }
    if (d.is_archived !== undefined) {
      sets.push("is_archived = ?");
      vals.push(d.is_archived ? 1 : 0);
    }
    if (sets.length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });
    vals.push(id, uid);
    const pool = getPool();
    const [r] = await pool.execute<ResultSetHeader>(
      `UPDATE baustellen SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      vals
    );
    if (r.affectedRows === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
