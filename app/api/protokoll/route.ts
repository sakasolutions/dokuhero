import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { ensureFotosUploadDir } from "@/lib/protokoll-upload";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const postSchema = z.object({
  auftrag_id: z.coerce.number().int().positive(),
  notiz: z.string().max(20000).optional().nullable(),
  fotos: z.array(z.string()).max(10),
});

function stripBase64(input: string): string {
  const t = input.trim();
  if (t.includes(",")) {
    return t.split(",")[1] ?? "";
  }
  return t;
}

export async function POST(request: Request) {
  let writtenFiles: string[] = [];

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { auftrag_id, notiz, fotos } = parsed.data;
    const pool = getPool();

    const [aufRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, status FROM auftraege WHERE id = ? AND betrieb_id = ? LIMIT 1`,
      [auftrag_id, session.user.betrieb_id]
    );
    const auf = aufRows[0] as { id: number; status: string } | undefined;
    if (!auf) {
      return NextResponse.json({ error: "Auftrag nicht gefunden" }, { status: 404 });
    }
    if (auf.status !== "offen") {
      return NextResponse.json(
        { error: "Nur Aufträge mit Status „offen“ können protokolliert werden." },
        { status: 400 }
      );
    }

    // entspricht z. B. /var/www/dokuhero/public/uploads/fotos/ wenn cwd = Projektroot
    const uploadDir = await ensureFotosUploadDir();
    const ts = Date.now();
    const notizText = notiz?.trim() || null;

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const [pRes] = await conn.execute<ResultSetHeader>(
        `INSERT INTO protokolle (auftrag_id, notiz, ki_text, pdf_pfad, gesendet_am, erstellt_am)
         VALUES (?, ?, NULL, NULL, NULL, NOW())`,
        [auftrag_id, notizText]
      );
      const protokollId = pRes.insertId;

      let fileIndex = 0;
      for (let i = 0; i < fotos.length; i++) {
        const b64 = stripBase64(fotos[i]);
        if (!b64) continue;
        const buf = Buffer.from(b64, "base64");
        if (buf.length === 0) continue;

        const dateiname = `${auftrag_id}_${ts}_${fileIndex}.jpg`;
        fileIndex += 1;
        const fullPath = join(uploadDir, dateiname);
        const dateiPfad = `/uploads/fotos/${dateiname}`;

        await writeFile(fullPath, buf);
        writtenFiles.push(fullPath);

        await conn.execute(
          `INSERT INTO fotos (protokoll_id, datei_pfad, dateiname, erstellt_am)
           VALUES (?, ?, ?, NOW())`,
          [protokollId, dateiPfad, dateiname]
        );
      }

      await conn.execute(
        `UPDATE auftraege SET status = 'in_bearbeitung' WHERE id = ? AND betrieb_id = ?`,
        [auftrag_id, session.user.betrieb_id]
      );

      await conn.commit();

      return NextResponse.json({ protokoll_id: protokollId });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (error) {
    for (const f of writtenFiles) {
      try {
        await unlink(f);
      } catch {
        /* ignore */
      }
    }
    console.error("Protokoll POST Fehler:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
