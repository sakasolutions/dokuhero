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

const createSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  email: z.preprocess(
    (v) => {
      if (v === undefined || v === null) return undefined;
      const s = String(v).trim();
      return s === "" ? undefined : s;
    },
    z.string().email("Bitte eine gültige E-Mail-Adresse eingeben").optional()
  ),
  telefon: z.string().optional().nullable(),
  adresse: z.string().optional().nullable(),
  fahrzeug: z.string().optional().nullable(),
  kennzeichen: z.string().optional().nullable(),
  notizen: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<KundeRow[]>(
      `SELECT id, betrieb_id, name, email, telefon, adresse, fahrzeug, kennzeichen, notizen, erstellt_am
       FROM kunden WHERE betrieb_id = ? ORDER BY name ASC`,
      [session.user.betrieb_id]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Kunden API Fehler:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const d = parsed.data;

    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO kunden (betrieb_id, name, email, telefon, adresse, fahrzeug, kennzeichen, notizen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.user.betrieb_id,
        d.name.trim(),
        d.email ?? null,
        d.telefon?.trim() || null,
        d.adresse?.trim() || null,
        d.fahrzeug?.trim() || null,
        d.kennzeichen?.trim() || null,
        d.notizen?.trim() || null,
      ]
    );

    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (error) {
    console.error("Kunden API Fehler:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
