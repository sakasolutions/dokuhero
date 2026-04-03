import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

const STATUS_FILTER_VALUES = ["zur_pruefung", "entwurf", "freigegeben"] as const;
type StatusFilter = (typeof STATUS_FILTER_VALUES)[number];

function isStatusFilter(s: string): s is StatusFilter {
  return (STATUS_FILTER_VALUES as readonly string[]).includes(s);
}

interface ProtokollListeRow extends RowDataPacket {
  id: number;
  status: string;
  notiz: string | null;
  ki_text: string | null;
  pdf_pfad: string | null;
  erstellt_am: Date;
  auftrag_beschreibung: string | null;
  auftrag_id: number;
  kunde_name: string | null;
  fahrzeug: string | null;
  kennzeichen: string | null;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusRaw = searchParams.get("status")?.trim() ?? "";

    let statusClause = "";
    const queryParams: (number | string)[] = [session.user.betrieb_id];

    if (statusRaw !== "") {
      if (!isStatusFilter(statusRaw)) {
        return NextResponse.json(
          { error: "Ungültiger status (zur_pruefung, entwurf, freigegeben)." },
          { status: 400 }
        );
      }
      statusClause = " AND p.status = ?";
      queryParams.push(statusRaw);
    }

    const pool = getPool();
    const [rows] = await pool.execute<ProtokollListeRow[]>(
      `SELECT 
         p.id,
         p.status,
         p.notiz,
         p.ki_text,
         p.pdf_pfad,
         p.erstellt_am,
         a.beschreibung AS auftrag_beschreibung,
         a.id AS auftrag_id,
         k.name AS kunde_name,
         k.fahrzeug,
         k.kennzeichen
       FROM protokolle p
       JOIN auftraege a ON p.auftrag_id = a.id
       LEFT JOIN kunden k ON a.kunde_id = k.id
       WHERE a.betrieb_id = ? AND p.archiviert = 0
         ${statusClause}
       ORDER BY 
         CASE p.status 
           WHEN 'zur_pruefung' THEN 1 
           WHEN 'entwurf' THEN 2 
           WHEN 'freigegeben' THEN 3 
         END ASC,
         p.erstellt_am DESC`,
      queryParams
    );

    return NextResponse.json({ protokolle: rows });
  } catch (error) {
    console.error("Protokolle API Fehler:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
