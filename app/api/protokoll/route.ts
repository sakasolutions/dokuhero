import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { ensureFotosUploadDir } from "@/lib/protokoll-upload";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";
import { fetchBetriebProtokollMonatsCap } from "@/lib/protokoll-limit";
import { formatiereNotiz } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const postSchema = z.object({
  auftrag_id: z.coerce.number().int().positive(),
  notiz: z.string().max(20000).optional().nullable(),
  materialien: z.string().max(5000).nullable().optional(),
  einsatz_von: z
    .union([z.string().regex(/^\d{2}:\d{2}$/), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  einsatz_bis: z
    .union([z.string().regex(/^\d{2}:\d{2}$/), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  anfahrt_km: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v === null ? null : v),
    z.union([z.coerce.number().min(0), z.null()]).optional()
  ),
  anfahrt_minuten: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v === null ? null : v),
    z.union([z.coerce.number().int().min(0), z.null()]).optional()
  ),
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

    const {
      auftrag_id,
      notiz,
      materialien,
      einsatz_von,
      einsatz_bis,
      anfahrt_km,
      anfahrt_minuten,
      fotos,
    } = parsed.data;
    const pool = getPool();

    const [aufRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, status FROM auftraege
       WHERE id = ? AND betrieb_id = ? AND archiviert = 0 LIMIT 1`,
      [auftrag_id, session.user.betrieb_id]
    );
    const auf = aufRows[0] as { id: number; status: string } | undefined;
    if (!auf) {
      return NextResponse.json(
        { error: "Auftrag nicht gefunden oder archiviert." },
        { status: 404 }
      );
    }
    if (!["offen", "in_bearbeitung"].includes(auf.status)) {
      return NextResponse.json(
        {
          error:
            "Nur Aufträge mit Status „offen“ oder „in Bearbeitung“ können protokolliert werden.",
        },
        { status: 400 }
      );
    }

    const cap = await fetchBetriebProtokollMonatsCap(pool, session.user.betrieb_id);
    if (!cap.unlimited) {
      const [cntRows] = await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS c
         FROM protokolle p
         INNER JOIN auftraege a ON a.id = p.auftrag_id
         WHERE a.betrieb_id = ?
           AND p.archiviert = 0 AND a.archiviert = 0
           AND MONTH(p.erstellt_am) = MONTH(NOW())
           AND YEAR(p.erstellt_am) = YEAR(NOW())`,
        [session.user.betrieb_id]
      );
      const rawC = (cntRows[0] as { c?: unknown })?.c;
      const monatsCount =
        typeof rawC === "bigint" ? Number(rawC) : Number(rawC ?? 0);
      if (monatsCount >= cap.limit) {
        return NextResponse.json(
          {
            error: "Protokoll-Limit erreicht. Bitte Plan upgraden.",
            limitReached: true,
          },
          { status: 403 }
        );
      }
    }

    // entspricht z. B. /var/www/dokuhero/public/uploads/fotos/ wenn cwd = Projektroot
    const uploadDir = await ensureFotosUploadDir();
    const ts = Date.now();
    let notizText = notiz?.trim() || null;
    let materialienText = materialien?.trim() || null;

    if (notizText) {
      try {
        notizText = await formatiereNotiz(notizText);
      } catch {
        /* Original-Notiz beibehalten */
      }
    }

    if (materialienText) {
      try {
        materialienText = await formatiereNotiz(materialienText);
      } catch {
        /* Original beibehalten */
      }
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      const [numRows] = await conn.execute<RowDataPacket[]>(
        "SELECT COUNT(*) AS anzahl FROM protokolle WHERE auftrag_id = ?",
        [auftrag_id]
      );
      const rawA = (numRows[0] as { anzahl?: unknown })?.anzahl;
      const anzahlVorher =
        typeof rawA === "bigint" ? Number(rawA) : Number(rawA ?? 0);
      const protokollNummer = anzahlVorher + 1;

      const erstelltVon =
        session.user.benutzer_id != null ? session.user.benutzer_id : null;
      const [pRes] = await conn.execute<ResultSetHeader>(
        `INSERT INTO protokolle (
           auftrag_id, protokoll_nummer, notiz, materialien,
           einsatz_von, einsatz_bis, anfahrt_km, anfahrt_minuten,
           ki_text, pdf_pfad, gesendet_am, erstellt_am, status, archiviert, erstellt_von_benutzer_id, current_step
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NOW(), 'entwurf', 0, ?, 1)`,
        [
          auftrag_id,
          protokollNummer,
          notizText,
          materialienText,
          einsatz_von ?? null,
          einsatz_bis ?? null,
          anfahrt_km ?? null,
          anfahrt_minuten ?? null,
          erstelltVon,
        ]
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

      if (auf.status === "offen") {
        await conn.execute(
          `UPDATE auftraege SET status = 'in_bearbeitung' WHERE id = ? AND betrieb_id = ?`,
          [auftrag_id, session.user.betrieb_id]
        );
      }

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
