import { NextResponse } from "next/server";
import { join } from "path";
import { pathToFileURL } from "url";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { generateProtokolText } from "@/lib/ai";
import { generatePDF } from "@/lib/pdf";
import { sendProtokolMail } from "@/lib/mail";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

interface LoadRow extends RowDataPacket {
  protokoll_id: number;
  auftrag_id: number;
  notiz: string | null;
  protokoll_erstellt: Date;
  beschreibung: string | null;
  kunde_name: string | null;
  kunde_email: string | null;
  betrieb_name: string;
}

interface FotoPfadRow extends RowDataPacket {
  datei_pfad: string;
}

function publicPathToFileUrl(webPath: string): string {
  const rel = webPath.startsWith("/") ? webPath.slice(1) : webPath;
  const abs = join(process.cwd(), "public", rel);
  return pathToFileURL(abs).href;
}

type RouteContext = { params: { id: string } };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const protokollId = Number(context.params.id);
    if (!Number.isFinite(protokollId)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const pool = getPool();

    const [rows] = await pool.execute<LoadRow[]>(
      `SELECT p.id AS protokoll_id, p.auftrag_id, p.notiz, p.erstellt_am AS protokoll_erstellt,
              a.beschreibung,
              k.name AS kunde_name, k.email AS kunde_email,
              b.name AS betrieb_name
       FROM protokolle p
       INNER JOIN auftraege a ON p.auftrag_id = a.id
       LEFT JOIN kunden k ON a.kunde_id = k.id
       INNER JOIN betriebe b ON a.betrieb_id = b.id
       WHERE p.id = ? AND a.betrieb_id = ?
       LIMIT 1`,
      [protokollId, session.user.betrieb_id]
    );

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const [fotoRows] = await pool.execute<FotoPfadRow[]>(
      `SELECT datei_pfad FROM fotos WHERE protokoll_id = ? ORDER BY erstellt_am ASC, id ASC`,
      [protokollId]
    );

    const notizText = row.notiz ?? "";
    const kiText = await generateProtokolText(notizText, row.betrieb_name);

    const fotoUrls = fotoRows.map((f) => publicPathToFileUrl(f.datei_pfad));

    const datumStr = new Date(row.protokoll_erstellt).toLocaleString("de-DE", {
      dateStyle: "long",
      timeStyle: "short",
    });

    const pdfBuffer = await generatePDF({
      betriebName: row.betrieb_name,
      kundeName: row.kunde_name ?? "–",
      datum: datumStr,
      beschreibung: row.beschreibung ?? "",
      kiText,
      fotos: fotoUrls,
      protokollId,
    });

    const webPdfPath = `/uploads/pdfs/${protokollId}.pdf`;

    let emailSent = false;
    const to = row.kunde_email?.trim();
    if (to) {
      try {
        await sendProtokolMail(to, row.betrieb_name, pdfBuffer, protokollId);
        emailSent = true;
      } catch (e) {
        console.error("Mailversand fehlgeschlagen:", e);
      }
    }

    await pool.execute(
      `UPDATE protokolle
       SET ki_text = ?, pdf_pfad = ?,
           gesendet_am = CASE WHEN ? = 1 THEN NOW() ELSE gesendet_am END
       WHERE id = ?`,
      [kiText, webPdfPath, emailSent ? 1 : 0, protokollId]
    );

    return NextResponse.json({
      success: true,
      protokoll_id: protokollId,
      emailSent,
      pdf_pfad: webPdfPath,
    });
  } catch (error) {
    console.error("Protokoll generate Fehler:", error);
    const message =
      error instanceof Error ? error.message : "Generierung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
