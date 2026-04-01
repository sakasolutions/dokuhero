import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { getPool } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface BetriebRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  telefon: string | null;
  branche: string | null;
  adresse: string | null;
  logo_pfad: string | null;
  google_bewertung_link: string | null;
  erstellt_am: Date;
  gesperrt: number;
}

interface KundeRow extends RowDataPacket {
  id: number;
  name: string;
  email: string | null;
  telefon: string | null;
  adresse: string | null;
  erstellt_am: Date;
}

interface ProtokollRow extends RowDataPacket {
  id: number;
  auftrag_id: number;
  erstellt_am: Date;
  gesendet_am: Date | null;
  pdf_pfad: string | null;
  notiz: string | null;
}

interface BewertungRow extends RowDataPacket {
  id: number;
  protokoll_id: number | null;
  zufrieden: number | null;
  feedback_text: string | null;
  erstellt_am: Date;
}

const putSchema = z.object({
  gesperrt: z.boolean(),
});

type RouteContext = { params: { id: string } };

function iso(d: Date | string | null | undefined): string | null {
  if (d == null) return null;
  if (d instanceof Date) return d.toISOString();
  return String(d);
}

export async function GET(
  _req: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const id = Number(context.params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const pool = getPool();
    const [bRows] = await pool.execute<BetriebRow[]>(
      `SELECT id, name, email, telefon, branche, adresse, logo_pfad,
              google_bewertung_link, erstellt_am, gesperrt
       FROM betriebe WHERE id = ? LIMIT 1`,
      [id]
    );
    const betrieb = bRows[0];
    if (!betrieb) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const [kunden] = await pool.execute<KundeRow[]>(
      `SELECT id, name, email, telefon, adresse, erstellt_am
       FROM kunden WHERE betrieb_id = ? ORDER BY name ASC, id ASC`,
      [id]
    );

    const [protokolle] = await pool.execute<ProtokollRow[]>(
      `SELECT p.id, p.auftrag_id, p.erstellt_am, p.gesendet_am, p.pdf_pfad, p.notiz
       FROM protokolle p
       INNER JOIN auftraege a ON a.id = p.auftrag_id
       WHERE a.betrieb_id = ?
       ORDER BY p.erstellt_am DESC, p.id DESC`,
      [id]
    );

    const [bewertungen] = await pool.execute<BewertungRow[]>(
      `SELECT b.id, b.protokoll_id, b.zufrieden, b.feedback_text, b.erstellt_am
       FROM bewertungen b
       INNER JOIN protokolle p ON p.id = b.protokoll_id
       INNER JOIN auftraege a ON a.id = p.auftrag_id
       WHERE a.betrieb_id = ?
       ORDER BY b.erstellt_am DESC, b.id DESC`,
      [id]
    );

    return NextResponse.json({
      betrieb: {
        id: betrieb.id,
        name: betrieb.name,
        email: betrieb.email,
        telefon: betrieb.telefon,
        branche: betrieb.branche,
        adresse: betrieb.adresse,
        logo_pfad: betrieb.logo_pfad,
        google_bewertung_link: betrieb.google_bewertung_link,
        erstellt_am: iso(betrieb.erstellt_am),
        gesperrt: Number(betrieb.gesperrt) === 1,
      },
      kunden: kunden.map((k) => ({
        id: k.id,
        name: k.name,
        email: k.email,
        telefon: k.telefon,
        adresse: k.adresse,
        erstellt_am: iso(k.erstellt_am),
      })),
      protokolle: protokolle.map((p) => ({
        id: p.id,
        auftrag_id: p.auftrag_id,
        erstellt_am: iso(p.erstellt_am),
        gesendet_am: iso(p.gesendet_am),
        pdf_pfad: p.pdf_pfad,
        notiz: p.notiz,
      })),
      bewertungen: bewertungen.map((b) => ({
        id: b.id,
        protokoll_id: b.protokoll_id,
        zufrieden: b.zufrieden,
        feedback_text: b.feedback_text,
        erstellt_am: iso(b.erstellt_am),
      })),
    });
  } catch (e) {
    console.error("[admin/betriebe/id GET]", e);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const id = Number(context.params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger Body" }, { status: 400 });
    }

    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "gesperrt (boolean) erforderlich" }, { status: 400 });
    }

    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      "UPDATE betriebe SET gesperrt = ? WHERE id = ?",
      [parsed.data.gesperrt ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, gesperrt: parsed.data.gesperrt });
  } catch (e) {
    console.error("[admin/betriebe/id PUT]", e);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
