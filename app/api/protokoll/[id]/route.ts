import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { ensureFotosUploadDir } from "@/lib/protokoll-upload";
import { sessionMayFreigebenProtokoll } from "@/lib/protokoll-freigabe";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";

function stripBase64(input: string): string {
  const t = input.trim();
  if (t.includes(",")) {
    return t.split(",")[1] ?? "";
  }
  return t;
}

export const dynamic = "force-dynamic";

interface JoinRow extends RowDataPacket {
  id: number;
  auftrag_id: number;
  protokoll_nummer: number | null;
  notiz: string | null;
  materialien: string | null;
  ki_text: string | null;
  pdf_pfad: string | null;
  gesendet_am: Date | null;
  erstellt_am: Date;
  status: string;
  archiviert: number;
  kunde_name: string | null;
  kunde_email: string | null;
  auftrag_beschreibung: string | null;
}

interface FotoRow extends RowDataPacket {
  id: number;
  protokoll_id: number;
  datei_pfad: string;
  dateiname: string;
  erstellt_am: Date;
}

type RouteContext = { params: { id: string } };

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("submit_review") }),
  z.object({
    action: z.literal("add_fotos"),
    fotos: z.array(z.string()).min(1).max(10),
  }),
  z.object({
    action: z.literal("update_notiz"),
    notiz: z.string().max(20000).nullable().optional(),
    materialien: z.string().max(5000).nullable().optional(),
  }),
]);

const putArchiveSchema = z.object({ archivieren: z.literal(true) });

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const protokollId = Number(context.params.id);
    if (!Number.isFinite(protokollId)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const pool = getPool();

    const [prows] = await pool.execute<JoinRow[]>(
      `SELECT p.id, p.auftrag_id, p.protokoll_nummer, p.notiz, p.materialien, p.ki_text, p.pdf_pfad, p.gesendet_am, p.erstellt_am, p.status, p.archiviert,
              k.name AS kunde_name, k.email AS kunde_email,
              a.beschreibung AS auftrag_beschreibung
       FROM protokolle p
       INNER JOIN auftraege a ON p.auftrag_id = a.id
       LEFT JOIN kunden k ON a.kunde_id = k.id
       WHERE p.id = ? AND a.betrieb_id = ?
       LIMIT 1`,
      [protokollId, session.user.betrieb_id]
    );

    const j = prows[0];
    if (!j) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const protokoll = {
      id: j.id,
      auftrag_id: j.auftrag_id,
      protokoll_nummer: j.protokoll_nummer,
      notiz: j.notiz,
      materialien: j.materialien,
      ki_text: j.ki_text,
      pdf_pfad: j.pdf_pfad,
      gesendet_am: j.gesendet_am,
      erstellt_am: j.erstellt_am,
      status: j.status,
      archiviert: j.archiviert,
    };

    const [frows] = await pool.execute<FotoRow[]>(
      `SELECT id, protokoll_id, datei_pfad, dateiname, erstellt_am FROM fotos
       WHERE protokoll_id = ?
       ORDER BY erstellt_am ASC, id ASC`,
      [protokollId]
    );

    return NextResponse.json({
      protokoll,
      kunde_name: j.kunde_name,
      kunde_email: j.kunde_email,
      auftrag_beschreibung: j.auftrag_beschreibung,
      fotos: frows,
      freigabe_erlaubt: sessionMayFreigebenProtokoll(session),
    });
  } catch (error) {
    console.error("Protokoll GET Fehler:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const protokollId = Number(context.params.id);
    if (!Number.isFinite(protokollId)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = putArchiveSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültiger Body (erwartet { archivieren: true })." },
        { status: 400 }
      );
    }

    const pool = getPool();
    const [res] = await pool.execute<ResultSetHeader>(
      `UPDATE protokolle p
       INNER JOIN auftraege a ON p.auftrag_id = a.id
       SET p.archiviert = 1
       WHERE p.id = ? AND a.betrieb_id = ?
         AND p.status = 'freigegeben'
         AND p.archiviert = 0`,
      [protokollId, session.user.betrieb_id]
    );
    if (res.affectedRows === 0) {
      return NextResponse.json(
        { error: "Archivieren nicht möglich (Status, bereits archiviert oder nicht gefunden)." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Protokoll PUT Fehler:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const protokollId = Number(context.params.id);
    if (!Number.isFinite(protokollId)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const pool = getPool();
    const action = parsed.data.action;

    if (action === "reject") {
      if (!sessionMayFreigebenProtokoll(session)) {
        return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
      }
      const [res] = await pool.execute<ResultSetHeader>(
        `UPDATE protokolle p
         INNER JOIN auftraege a ON p.auftrag_id = a.id
         SET p.status = 'entwurf'
         WHERE p.id = ? AND a.betrieb_id = ? AND p.status = 'zur_pruefung'
           AND p.archiviert = 0 AND a.archiviert = 0`,
        [protokollId, session.user.betrieb_id]
      );
      if (res.affectedRows === 0) {
        return NextResponse.json(
          { error: "Zurückweisen nicht möglich (Status oder Zugriff)." },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "update_notiz") {
      const notizVal = parsed.data.notiz?.trim() || null;
      const matVal = parsed.data.materialien?.trim() || null;
      const [res] = await pool.execute<ResultSetHeader>(
        `UPDATE protokolle
         SET notiz = ?, materialien = ?
         WHERE id = ?
           AND status IN ('entwurf', 'zur_pruefung')
           AND archiviert = 0
           AND auftrag_id IN (
             SELECT id FROM auftraege
             WHERE betrieb_id = ? AND archiviert = 0
           )`,
        [notizVal, matVal, protokollId, session.user.betrieb_id]
      );
      if (res.affectedRows === 0) {
        return NextResponse.json(
          {
            error:
              "Aktualisieren nicht möglich (Status, archiviert oder nicht gefunden).",
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "add_fotos") {
      const rawList = parsed.data.fotos;
      let writtenFiles: string[] = [];
      const conn = await pool.getConnection();
      await conn.beginTransaction();
      try {
        const [pRows] = await conn.execute<RowDataPacket[]>(
          `SELECT p.id, p.status, p.auftrag_id
           FROM protokolle p
           INNER JOIN auftraege a ON p.auftrag_id = a.id
           WHERE p.id = ? AND a.betrieb_id = ?
             AND p.archiviert = 0 AND a.archiviert = 0
           LIMIT 1`,
          [protokollId, session.user.betrieb_id]
        );
        const prow = pRows[0] as
          | { id: number; status: string; auftrag_id: number }
          | undefined;
        if (!prow || prow.status !== "entwurf") {
          await conn.rollback();
          return NextResponse.json(
            {
              error:
                "Fotos können nur bei Protokollen im Status „Entwurf“ ergänzt werden.",
            },
            { status: 400 }
          );
        }

        const [cntRows] = await conn.execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS c FROM fotos WHERE protokoll_id = ?`,
          [protokollId]
        );
        const rawC = (cntRows[0] as { c?: unknown })?.c;
        const existing =
          typeof rawC === "bigint" ? Number(rawC) : Number(rawC ?? 0);
        const remaining = 10 - existing;
        if (remaining <= 0) {
          await conn.rollback();
          return NextResponse.json(
            { error: "Es sind bereits 10 Fotos vorhanden." },
            { status: 400 }
          );
        }

        const toAdd = rawList.slice(0, remaining);
        const uploadDir = await ensureFotosUploadDir();
        const ts = Date.now();
        const auftrag_id = prow.auftrag_id;
        let fileIndex = 0;

        for (let i = 0; i < toAdd.length; i++) {
          const b64 = stripBase64(toAdd[i]);
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

        if (fileIndex === 0) {
          await conn.rollback();
          for (const f of writtenFiles) {
            try {
              await unlink(f);
            } catch {
              /* ignore */
            }
          }
          return NextResponse.json(
            { error: "Keine gültigen Fotodaten übermittelt." },
            { status: 400 }
          );
        }

        await conn.commit();
        return NextResponse.json({ ok: true, added: fileIndex });
      } catch (e) {
        await conn.rollback();
        for (const f of writtenFiles) {
          try {
            await unlink(f);
          } catch {
            /* ignore */
          }
        }
        console.error("add_fotos:", e);
        return NextResponse.json(
          { error: "Fotos konnten nicht gespeichert werden." },
          { status: 500 }
        );
      } finally {
        conn.release();
      }
    }

    const [res] = await pool.execute<ResultSetHeader>(
      `UPDATE protokolle p
       INNER JOIN auftraege a ON p.auftrag_id = a.id
       SET p.status = 'zur_pruefung'
       WHERE p.id = ? AND a.betrieb_id = ?
         AND p.status = 'entwurf'
         AND p.archiviert = 0 AND a.archiviert = 0
         AND p.ki_text IS NOT NULL
         AND TRIM(p.ki_text) <> ''`,
      [protokollId, session.user.betrieb_id]
    );
    if (res.affectedRows === 0) {
      return NextResponse.json(
        { error: "Einreichen nicht möglich (Status oder fehlender Protokolltext)." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Protokoll PATCH Fehler:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
