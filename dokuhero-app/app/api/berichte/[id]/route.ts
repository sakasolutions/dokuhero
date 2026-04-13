import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { ensureFotosDir, webFoto } from "@/lib/uploads";
import { writeFile } from "fs/promises";
import { join } from "path";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const patchBody = z.object({
  title: z.string().max(500).optional(),
  raw_note: z.string().max(20000).nullable().optional(),
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fotos: z.array(z.string()).max(12).optional(),
});

function stripB64(s: string): string {
  const t = s.trim();
  return t.includes(",") ? (t.split(",")[1] ?? "") : t;
}

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
    const [br] = await pool.execute<RowDataPacket[]>(
      `SELECT b.* FROM berichte b
       INNER JOIN baustellen bs ON bs.id = b.baustelle_id
       WHERE b.id = ? AND bs.user_id = ? LIMIT 1`,
      [id, uid]
    );
    if (!br[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [bs] = await pool.execute<RowDataPacket[]>(
      "SELECT id, name, address, customer_name, notes FROM baustellen WHERE id = ? LIMIT 1",
      [(br[0] as { baustelle_id: number }).baustelle_id]
    );
    const [fotos] = await pool.execute<RowDataPacket[]>(
      "SELECT id, file_path, file_name, sort_order, created_at FROM bericht_fotos WHERE bericht_id = ? ORDER BY sort_order ASC, id ASC",
      [id]
    );
    return NextResponse.json({ bericht: br[0], baustelle: bs[0] ?? null, fotos });
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
    const pool = getPool();
    const [br] = await pool.execute<RowDataPacket[]>(
      `SELECT b.id, b.status FROM berichte b
       INNER JOIN baustellen bs ON bs.id = b.baustelle_id
       WHERE b.id = ? AND bs.user_id = ? LIMIT 1`,
      [id, uid]
    );
    const row = br[0] as { id: number; status: string } | undefined;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const json = await req.json().catch(() => null);
    const p = patchBody.safeParse(json);
    if (!p.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    const d = p.data;
    const isDraft = row.status === "draft";

    if (!isDraft && d.raw_note !== undefined) {
      return NextResponse.json(
        { error: "Notiz nach der Formulierung nicht mehr per PATCH änderbar." },
        { status: 400 }
      );
    }

    if (isDraft && (d.title !== undefined || d.raw_note !== undefined || d.report_date !== undefined)) {
      const sets: string[] = [];
      const vals: (string | null | number)[] = [];
      if (d.title !== undefined) {
        sets.push("title = ?");
        vals.push(d.title.trim());
      }
      if (d.raw_note !== undefined) {
        sets.push("raw_note = ?");
        vals.push(d.raw_note?.trim() || null);
      }
      if (d.report_date !== undefined) {
        sets.push("report_date = ?");
        vals.push(d.report_date);
      }
      if (sets.length) {
        vals.push(id);
        await pool.execute(`UPDATE berichte SET ${sets.join(", ")} WHERE id = ?`, vals);
      }
    } else if (!isDraft && (d.title !== undefined || d.report_date !== undefined)) {
      const sets: string[] = [];
      const vals: (string | null | number)[] = [];
      if (d.title !== undefined) {
        sets.push("title = ?");
        vals.push(d.title.trim());
      }
      if (d.report_date !== undefined) {
        sets.push("report_date = ?");
        vals.push(d.report_date);
      }
      if (sets.length) {
        vals.push(id);
        await pool.execute(`UPDATE berichte SET ${sets.join(", ")} WHERE id = ?`, vals);
      }
    }
    if (d.fotos?.length) {
      const [cnt] = await pool.execute<RowDataPacket[]>(
        "SELECT COUNT(*) AS c FROM bericht_fotos WHERE bericht_id = ?",
        [id]
      );
      const have = Number((cnt[0] as { c?: unknown })?.c ?? 0);
      const room = 12 - have;
      if (room <= 0) return NextResponse.json({ error: "Max. 12 Fotos" }, { status: 400 });
      const dir = await ensureFotosDir();
      const ts = Date.now();
      let added = 0;
      for (const b64raw of d.fotos.slice(0, room)) {
        const raw = stripB64(b64raw);
        if (!raw) continue;
        const buf = Buffer.from(raw, "base64");
        if (!buf.length) continue;
        const fn = `${id}_${ts}_${added}.jpg`;
        await writeFile(join(dir, fn), buf);
        const web = webFoto(fn);
        const ord = have + added;
        await pool.execute(
          `INSERT INTO bericht_fotos (bericht_id, file_path, file_name, sort_order) VALUES (?, ?, ?, ?)`,
          [id, web, fn, ord]
        );
        added += 1;
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
