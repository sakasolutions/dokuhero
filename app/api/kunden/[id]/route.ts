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
  email: string | null;
  telefon: string | null;
  adresse: string | null;
  fahrzeug: string | null;
  kennzeichen: string | null;
  notizen: string | null;
  erstellt_am: Date;
}

interface AuftragMitProtokollRow extends RowDataPacket {
  id: number;
  betrieb_id: number;
  kunde_id: number | null;
  beschreibung: string | null;
  status: string;
  erstellt_am: Date;
  abgeschlossen_am: Date | null;
  protokoll_id: number | null;
  pdf_pfad: string | null;
  ki_text: string | null;
  gesendet_am: Date | null;
  foto_anzahl: number | string | bigint | null;
}

function toIso(d: Date | null | undefined): string | null {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function num(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

const updateSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  email: z.string().email("Bitte eine gültige E-Mail-Adresse eingeben"),
  telefon: z.string().optional().nullable(),
  adresse: z.string().optional().nullable(),
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
      `SELECT id, betrieb_id, name, email, telefon, adresse, fahrzeug, kennzeichen, notizen, erstellt_am
       FROM kunden WHERE id = ? AND betrieb_id = ? LIMIT 1`,
      [kundeId, session.user.betrieb_id]
    );

    const kunde = rows[0];
    if (!kunde) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const [aufRows] = await pool.execute<AuftragMitProtokollRow[]>(
      `SELECT
         a.id,
         a.betrieb_id,
         a.kunde_id,
         a.beschreibung,
         a.status,
         a.erstellt_am,
         a.abgeschlossen_am,
         p.id AS protokoll_id,
         p.pdf_pfad,
         p.ki_text,
         p.gesendet_am,
         (SELECT COUNT(*) FROM fotos f WHERE f.protokoll_id = p.id) AS foto_anzahl
       FROM auftraege a
       LEFT JOIN protokolle p ON p.auftrag_id = a.id
       WHERE a.kunde_id = ? AND a.betrieb_id = ? AND a.archiviert = 0
       ORDER BY a.erstellt_am DESC`,
      [kundeId, session.user.betrieb_id]
    );

    const auftraege = aufRows.map((r) => ({
      id: r.id,
      betrieb_id: r.betrieb_id,
      kunde_id: r.kunde_id,
      beschreibung: r.beschreibung,
      status: r.status,
      erstellt_am: toIso(r.erstellt_am) ?? "",
      abgeschlossen_am: toIso(r.abgeschlossen_am),
      protokoll_id: r.protokoll_id != null ? Number(r.protokoll_id) : null,
      pdf_pfad: r.pdf_pfad ?? null,
      ki_text: r.ki_text ?? null,
      gesendet_am: toIso(r.gesendet_am),
      foto_anzahl: num(r.foto_anzahl),
    }));

    return NextResponse.json({
      kunde: {
        id: kunde.id,
        betrieb_id: kunde.betrieb_id,
        name: kunde.name,
        email: kunde.email,
        telefon: kunde.telefon,
        adresse: kunde.adresse,
        fahrzeug: kunde.fahrzeug,
        kennzeichen: kunde.kennzeichen,
        notizen: kunde.notizen,
        erstellt_am: toIso(kunde.erstellt_am) ?? "",
      },
      auftraege,
    });
  } catch (error) {
    console.error("Kunden API Fehler:", error);
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

    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE kunden SET name = ?, email = ?, telefon = ?, adresse = ?, fahrzeug = ?, kennzeichen = ?, notizen = ?
       WHERE id = ? AND betrieb_id = ?`,
      [
        d.name.trim(),
        d.email.trim(),
        d.telefon?.trim() || null,
        d.adresse?.trim() || null,
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
  } catch (error) {
    console.error("Kunden API Fehler:", error);
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
    console.error("Kunden API Fehler:", e);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
