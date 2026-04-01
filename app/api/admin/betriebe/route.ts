import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

interface BetriebRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  telefon: string | null;
  branche: string | null;
  erstellt_am: Date;
  gesperrt: number;
  protokolle_anzahl: number;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<BetriebRow[]>(
      `SELECT b.id, b.name, b.email, b.telefon, b.branche, b.erstellt_am, b.gesperrt,
        (SELECT COUNT(*)
         FROM protokolle p
         INNER JOIN auftraege a ON a.id = p.auftrag_id
         WHERE a.betrieb_id = b.id) AS protokolle_anzahl
       FROM betriebe b
       ORDER BY b.id DESC`
    );

    const betriebe = rows.map((b) => ({
      id: b.id,
      name: b.name,
      email: b.email,
      telefon: b.telefon,
      branche: b.branche,
      erstellt_am:
        b.erstellt_am instanceof Date
          ? b.erstellt_am.toISOString()
          : String(b.erstellt_am),
      gesperrt: Number(b.gesperrt) === 1,
      protokolle_anzahl: Number(b.protokolle_anzahl ?? 0),
    }));

    return NextResponse.json({ betriebe });
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : "";
    if (code === "ER_BAD_FIELD_ERROR") {
      return NextResponse.json(
        {
          error:
            "Spalte gesperrt fehlt – Migration add_betrieb_gesperrt.sql ausführen.",
        },
        { status: 500 }
      );
    }
    console.error("[admin/betriebe]", e);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
