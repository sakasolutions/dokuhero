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
  branche: string | null;
  adresse: string | null;
  plz: string | null;
  stadt: string | null;
  logo_pfad: string | null;
  google_bewertung_link: string | null;
  plan?: string | null;
  abo_bis?: Date | null;
  stripe_customer_id?: string | null;
  erstellt_am?: Date | null;
}

const putSchema = z
  .object({
    name: z.string().min(1, "Betriebsname ist erforderlich"),
    telefon: z.string().nullable().optional(),
    branche: z.string().nullable().optional(),
    adresse: z.string().nullable().optional(),
    plz: z.string().nullable().optional(),
    stadt: z.string().nullable().optional(),
    google_bewertung_link: z.string().nullable().optional(),
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
      `SELECT id, name, email, telefon, branche, adresse, plz, stadt, logo_pfad, google_bewertung_link,
              plan, abo_bis, stripe_customer_id, erstellt_am
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
        branche: row.branche,
        adresse: row.adresse,
        plz: row.plz,
        stadt: row.stadt,
        logo_pfad: row.logo_pfad,
        google_bewertung_link: row.google_bewertung_link,
        plan: typeof row.plan === "string" ? row.plan : null,
        abo_bis: row.abo_bis instanceof Date ? row.abo_bis.toISOString() : null,
        stripe_customer_id:
          typeof row.stripe_customer_id === "string" ? row.stripe_customer_id : null,
        erstellt_am:
          row.erstellt_am instanceof Date ? row.erstellt_am.toISOString() : null,
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
        ? "Datenbank: Spalte fehlt – Migrationen ausführen (u. a. adresse, plz, stadt auf betriebe)."
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
    const branche = nullIfEmpty(d.branche ?? undefined);
    const adresse = nullIfEmpty(d.adresse ?? undefined);
    const plz = nullIfEmpty(d.plz ?? undefined);
    const stadt = nullIfEmpty(d.stadt ?? undefined);
    const google_bewertung_link = nullIfEmpty(
      d.google_bewertung_link ?? undefined
    );

    const pool = getPool();
    const pw = d.neuesPasswort?.trim();

    if (pw) {
      const hash = await bcrypt.hash(pw, 12);
      await pool.execute(
        `UPDATE betriebe SET name = ?, telefon = ?, branche = ?, adresse = ?, plz = ?, stadt = ?, google_bewertung_link = ?, passwort = ?
         WHERE id = ?`,
        [
          d.name.trim(),
          telefon,
          branche,
          adresse,
          plz,
          stadt,
          google_bewertung_link,
          hash,
          session.user.betrieb_id,
        ]
      );
    } else {
      await pool.execute(
        `UPDATE betriebe SET name = ?, telefon = ?, branche = ?, adresse = ?, plz = ?, stadt = ?, google_bewertung_link = ?
         WHERE id = ?`,
        [
          d.name.trim(),
          telefon,
          branche,
          adresse,
          plz,
          stadt,
          google_bewertung_link,
          session.user.betrieb_id,
        ]
      );
    }

    const savedName = d.name.trim();
    return NextResponse.json({ ok: true, name: savedName });
  } catch (e) {
    console.error("PUT einstellungen:", e);
    const msg =
      e && typeof e === "object" && "code" in e && (e as { code: string }).code === "ER_BAD_FIELD_ERROR"
        ? "Datenbank: Spalte fehlt – prüfen ob Spalten adresse, plz, stadt existieren."
        : "Speichern fehlgeschlagen.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
