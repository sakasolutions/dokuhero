import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface BetriebRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  telefon: string | null;
  adresse: string | null;
  logo_pfad: string | null;
  google_bewertung_link: string | null;
}

const putSchema = z
  .object({
    name: z.string().min(1, "Betriebsname ist erforderlich"),
    telefon: z.string().optional(),
    adresse: z.string().optional(),
    google_bewertung_link: z.string().optional(),
    neuesPasswort: z.string().optional(),
    neuesPasswortBestaetigung: z.string().optional(),
  })
  .refine(
    (d) => !d.neuesPasswort?.trim() || d.neuesPasswort.length >= 8,
    {
      message: "Neues Passwort: mindestens 8 Zeichen.",
      path: ["neuesPasswort"],
    }
  )
  .refine(
    (d) =>
      !d.neuesPasswort?.trim() ||
      d.neuesPasswort === (d.neuesPasswortBestaetigung ?? ""),
    {
      message: "Passwort-Bestätigung stimmt nicht überein.",
      path: ["neuesPasswortBestaetigung"],
    }
  );

function nullIfEmpty(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<BetriebRow[]>(
      `SELECT id, name, email, telefon, adresse, logo_pfad, google_bewertung_link
       FROM betriebe WHERE id = ? LIMIT 1`,
      [session.user.betrieb_id]
    );

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({
      betrieb: {
        id: row.id,
        name: row.name,
        email: row.email,
        telefon: row.telefon,
        adresse: row.adresse,
        logo_pfad: row.logo_pfad,
        google_bewertung_link: row.google_bewertung_link,
      },
    });
  } catch (e) {
    console.error("GET einstellungen:", e);
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : "";
    const msg =
      code === "ER_BAD_FIELD_ERROR"
        ? "Datenbank: Spalte „adresse“ fehlt – Migration ausführen (migrations/add_betrieb_adresse.sql)."
        : "Laden fehlgeschlagen.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = putSchema.safeParse(json);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const first =
        fe.neuesPasswortBestaetigung?.[0] ??
        fe.neuesPasswort?.[0] ??
        fe.name?.[0] ??
        parsed.error.errors[0]?.message ??
        "Ungültige Eingaben.";
      return NextResponse.json({ error: first }, { status: 400 });
    }

    const d = parsed.data;
    const telefon = nullIfEmpty(d.telefon ?? undefined);
    const adresse = nullIfEmpty(d.adresse ?? undefined);
    const google_bewertung_link = nullIfEmpty(
      d.google_bewertung_link ?? undefined
    );

    const pool = getPool();
    const pw = d.neuesPasswort?.trim();

    if (pw) {
      const hash = await bcrypt.hash(pw, 12);
      await pool.execute(
        `UPDATE betriebe SET name = ?, telefon = ?, adresse = ?, google_bewertung_link = ?, passwort = ?
         WHERE id = ?`,
        [
          d.name.trim(),
          telefon,
          adresse,
          google_bewertung_link,
          hash,
          session.user.betrieb_id,
        ]
      );
    } else {
      await pool.execute(
        `UPDATE betriebe SET name = ?, telefon = ?, adresse = ?, google_bewertung_link = ?
         WHERE id = ?`,
        [
          d.name.trim(),
          telefon,
          adresse,
          google_bewertung_link,
          session.user.betrieb_id,
        ]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PUT einstellungen:", e);
    const msg =
      e && typeof e === "object" && "code" in e && (e as { code: string }).code === "ER_BAD_FIELD_ERROR"
        ? "Datenbank: Spalte „adresse“ fehlt – Migration ausführen (siehe migrations/add_betrieb_adresse.sql)."
        : "Speichern fehlgeschlagen.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
