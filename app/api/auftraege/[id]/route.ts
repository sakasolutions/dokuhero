import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";

interface AuftragRow extends RowDataPacket {
  id: number;
  betrieb_id: number;
  kunde_id: number | null;
  auftragsnummer: string | null;
  status: string;
  erstellt_am: Date;
  abgeschlossen_am: Date | null;
  archiviert: number;
  kunde_name: string | null;
}

interface ProtokollKurzRow extends RowDataPacket {
  id: number;
  erstellt_am: Date;
  gesendet_am: Date | null;
  pdf_pfad: string | null;
  status: string | null;
  notiz: string | null;
}

const updateSchema = z.object({
  status: z.enum(["offen", "in_bearbeitung", "abgeschlossen"]),
});

type RouteContext = { params: { id: string } };

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = context.params;
    const auftragId = Number(id);
    if (!Number.isFinite(auftragId)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<AuftragRow[]>(
      `SELECT a.id, a.betrieb_id, a.kunde_id, a.auftragsnummer, a.status, a.erstellt_am, a.abgeschlossen_am, a.archiviert,
              k.name AS kunde_name
       FROM auftraege a
       LEFT JOIN kunden k ON k.id = a.kunde_id AND k.betrieb_id = a.betrieb_id
       WHERE a.id = ? AND a.betrieb_id = ?
       LIMIT 1`,
      [auftragId, session.user.betrieb_id]
    );

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const [pRows] = await pool.execute<ProtokollKurzRow[]>(
      `SELECT p.id, p.erstellt_am, p.gesendet_am, p.pdf_pfad, p.status, p.notiz
       FROM protokolle p
       INNER JOIN auftraege a ON a.id = p.auftrag_id
       WHERE p.auftrag_id = ? AND a.betrieb_id = ?
       ORDER BY p.erstellt_am DESC, p.id DESC`,
      [auftragId, session.user.betrieb_id]
    );

    const protokolle = pRows.map((p) => ({
      id: p.id,
      erstellt_am:
        p.erstellt_am instanceof Date
          ? p.erstellt_am.toISOString()
          : String(p.erstellt_am),
      gesendet_am:
        p.gesendet_am instanceof Date
          ? p.gesendet_am.toISOString()
          : p.gesendet_am
            ? String(p.gesendet_am)
            : null,
      pdf_pfad: p.pdf_pfad,
      status: p.status,
      notiz: p.notiz,
    }));

    return NextResponse.json({ ...row, protokolle });
  } catch (error) {
    console.error("Aufträge API Fehler:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = context.params;
    const auftragId = Number(id);
    if (!Number.isFinite(auftragId)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const body: unknown = await request.json();
    const pool = getPool();

    if (
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      (body as { archivieren?: unknown }).archivieren === true
    ) {
      if (session.user.rolle !== "inhaber") {
        return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
      }
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE auftraege SET archiviert = 1
         WHERE id = ? AND betrieb_id = ? AND archiviert = 0`,
        [auftragId, session.user.betrieb_id]
      );
      if (result.affectedRows === 0) {
        return NextResponse.json(
          { error: "Archivieren nicht möglich (bereits archiviert oder nicht gefunden)." },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status } = parsed.data;

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE auftraege
       SET status = ?,
           abgeschlossen_am = IF(? = 'abgeschlossen', COALESCE(abgeschlossen_am, NOW()), NULL)
       WHERE id = ? AND betrieb_id = ? AND archiviert = 0`,
      [status, status, auftragId, session.user.betrieb_id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Aufträge API Fehler:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = context.params;
    const auftragId = Number(id);
    if (!Number.isFinite(auftragId)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM auftraege WHERE id = ? AND betrieb_id = ?",
      [auftragId, session.user.betrieb_id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : "";
    if (code === "ER_ROW_IS_REFERENCED_2" || code === "1451") {
      return NextResponse.json(
        { error: "Auftrag kann nicht gelöscht werden (noch verknüpfte Daten)." },
        { status: 409 }
      );
    }
    console.error("Aufträge API Fehler:", e);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
