import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { sessionMayFreigebenProtokoll } from "@/lib/protokoll-freigabe";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface JoinRow extends RowDataPacket {
  id: number;
  auftrag_id: number;
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
      `SELECT p.id, p.auftrag_id, p.notiz, p.materialien, p.ki_text, p.pdf_pfad, p.gesendet_am, p.erstellt_am, p.status, p.archiviert,
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
