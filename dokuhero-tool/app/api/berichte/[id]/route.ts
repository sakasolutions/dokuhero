import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import {
  ensureBerichtFotosDir,
  webPathBerichtFoto,
} from "@/lib/uploads";
import { writeFile } from "fs/promises";
import { join } from "path";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const patchSchema = z.object({
  raw_note: z.string().max(20000).nullable().optional(),
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fotos: z.array(z.string()).max(10).optional(),
});

function stripBase64(input: string): string {
  const t = input.trim();
  if (t.includes(",")) return t.split(",")[1] ?? "";
  return t;
}

async function assertBerichtUser(
  pool: ReturnType<typeof getPool>,
  berichtId: number,
  userId: number
): Promise<
  | {
      id: number;
      baustelle_id: number;
      report_date: string;
      raw_note: string | null;
      formatted_text: string | null;
      pdf_path: string | null;
      status: string;
    }
  | null
> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT b.id, b.baustelle_id, b.report_date, b.raw_note, b.formatted_text, b.pdf_path, b.status
     FROM berichte b
     INNER JOIN baustellen bs ON bs.id = b.baustelle_id
     WHERE b.id = ? AND bs.user_id = ?
     LIMIT 1`,
    [berichtId, userId]
  );
  const r = rows[0] as
    | {
        id: number;
        baustelle_id: number;
        report_date: string;
        raw_note: string | null;
        formatted_text: string | null;
        pdf_path: string | null;
        status: string;
      }
    | undefined;
  return r ?? null;
}

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
    const bericht = await assertBerichtUser(pool, id, userId);
    if (!bericht) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const [bs] = await pool.execute<RowDataPacket[]>(
      "SELECT id, name, address FROM baustellen WHERE id = ? LIMIT 1",
      [bericht.baustelle_id]
    );

    const [fotos] = await pool.execute<RowDataPacket[]>(
      "SELECT id, file_path, file_name, created_at FROM bericht_fotos WHERE bericht_id = ? ORDER BY id ASC",
      [id]
    );

    return NextResponse.json({
      bericht,
      baustelle: bs[0] ?? null,
      fotos,
    });
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

    const pool = getPool();
    const bericht = await assertBerichtUser(pool, id, userId);
    if (!bericht) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    if (bericht.status !== "draft") {
      return NextResponse.json(
        { error: "Nur Entwürfe können bearbeitet werden." },
        { status: 400 }
      );
    }

    const { raw_note, report_date, fotos } = parsed.data;

    if (raw_note !== undefined || report_date !== undefined) {
      const sets: string[] = [];
      const vals: (string | null | number)[] = [];
      if (raw_note !== undefined) {
        sets.push("raw_note = ?");
        vals.push(raw_note?.trim() || null);
      }
      if (report_date !== undefined) {
        sets.push("report_date = ?");
        vals.push(report_date);
      }
      if (sets.length > 0) {
        vals.push(id);
        await pool.execute(`UPDATE berichte SET ${sets.join(", ")} WHERE id = ?`, vals);
      }
    }

    if (fotos && fotos.length > 0) {
      const [cntRows] = await pool.execute<RowDataPacket[]>(
        "SELECT COUNT(*) AS c FROM bericht_fotos WHERE bericht_id = ?",
        [id]
      );
      const existing = Number((cntRows[0] as { c?: unknown })?.c ?? 0);
      const remaining = 10 - existing;
      if (remaining <= 0) {
        return NextResponse.json({ error: "Maximal 10 Fotos." }, { status: 400 });
      }

      const dir = await ensureBerichtFotosDir();
      const ts = Date.now();
      let added = 0;
      for (let i = 0; i < Math.min(fotos.length, remaining); i++) {
        const b64 = stripBase64(fotos[i] ?? "");
        if (!b64) continue;
        const buf = Buffer.from(b64, "base64");
        if (buf.length === 0) continue;
        const name = `${id}_${ts}_${added}.jpg`;
        const full = join(dir, name);
        await writeFile(full, buf);
        const web = webPathBerichtFoto(name);
        await pool.execute(
          `INSERT INTO bericht_fotos (bericht_id, file_path, file_name) VALUES (?, ?, ?)`,
          [id, web, name]
        );
        added += 1;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
