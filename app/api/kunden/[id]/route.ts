import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";

interface KundeRow extends RowDataPacket {
  id: number;
  betrieb_id: number;
  name: string;
  telefon: string | null;
  email: string | null;
  fahrzeug: string | null;
  kennzeichen: string | null;
  notizen: string | null;
  erstellt_am: Date;
}

const updateSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  telefon: z.string().optional().nullable(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  fahrzeug: z.string().optional().nullable(),
  kennzeichen: z.string().optional().nullable(),
  notizen: z.string().optional().nullable(),
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
    const kundeId = Number(id);
    if (!Number.isFinite(kundeId)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<KundeRow[]>(
      `SELECT id, betrieb_id, name, telefon, email, fahrzeug, kennzeichen, notizen, erstellt_am
       FROM kunden WHERE id = ? AND betrieb_id = ? LIMIT 1`,
      [kundeId, session.user.betrieb_id]
    );

    const kunde = rows[0];
    if (!kunde) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(kunde);
  } catch {
    return NextResponse.json(
      { error: "Kunde konnte nicht geladen werden." },
      { status: 500 }
    );
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
    const kundeId = Number(id);
    if (!Number.isFinite(kundeId)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const email =
      d.email && d.email.length > 0 ? d.email : null;

    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE kunden SET name = ?, telefon = ?, email = ?, fahrzeug = ?, kennzeichen = ?, notizen = ?
       WHERE id = ? AND betrieb_id = ?`,
      [
        d.name.trim(),
        d.telefon?.trim() || null,
        email,
        d.fahrzeug?.trim() || null,
        d.kennzeichen?.trim() || null,
        d.notizen?.trim() || null,
        kundeId,
        session.user.betrieb_id,
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Kunde konnte nicht aktualisiert werden." },
      { status: 500 }
    );
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
    const kundeId = Number(id);
    if (!Number.isFinite(kundeId)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM kunden WHERE id = ? AND betrieb_id = ?",
      [kundeId, session.user.betrieb_id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "ER_ROW_IS_REFERENCED_2" || code === "1451") {
      return NextResponse.json(
        { error: "Kunde kann nicht gelöscht werden (noch verknüpfte Aufträge)." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Kunde konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }
}
