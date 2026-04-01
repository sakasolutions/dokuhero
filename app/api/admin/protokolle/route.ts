import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

interface Row extends RowDataPacket {
  id: number;
  erstellt_am: Date;
  gesendet_am: Date | null;
  pdf_pfad: string | null;
  auftrag_id: number;
  betrieb_name: string;
  betrieb_id: number;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<Row[]>(
      `SELECT p.id, p.erstellt_am, p.gesendet_am, p.pdf_pfad, a.id AS auftrag_id,
              b.name AS betrieb_name, b.id AS betrieb_id
       FROM protokolle p
       INNER JOIN auftraege a ON a.id = p.auftrag_id
       INNER JOIN betriebe b ON b.id = a.betrieb_id
       ORDER BY p.erstellt_am DESC, p.id DESC
       LIMIT 500`
    );

    const protokolle = rows.map((r) => ({
      id: r.id,
      auftrag_id: r.auftrag_id,
      betrieb_id: r.betrieb_id,
      betrieb_name: r.betrieb_name,
      erstellt_am:
        r.erstellt_am instanceof Date
          ? r.erstellt_am.toISOString()
          : String(r.erstellt_am),
      gesendet_am:
        r.gesendet_am instanceof Date
          ? r.gesendet_am.toISOString()
          : r.gesendet_am
            ? String(r.gesendet_am)
            : null,
      pdf_pfad: r.pdf_pfad,
    }));

    return NextResponse.json({ protokolle });
  } catch (e) {
    console.error("[admin/protokolle]", e);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
