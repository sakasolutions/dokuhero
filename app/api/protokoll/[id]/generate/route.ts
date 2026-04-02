import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { generatePDF } from "@/lib/pdf";
import { sendProtokollMail } from "@/lib/mail";
import { sessionMayFreigebenProtokoll } from "@/lib/protokoll-freigabe";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  kiText: z.string(),
  sendMail: z.boolean().optional().default(false),
});

interface LoadRow extends RowDataPacket {
  protokoll_id: number;
  auftrag_id: number;
  protokoll_erstellt: Date;
  protokoll_status: string;
  beschreibung: string | null;
  kunde_name: string | null;
  kunde_email: string | null;
  betrieb_name: string;
  betrieb_logo_pfad: string | null;
}

interface FotoPfadRow extends RowDataPacket {
  datei_pfad: string;
}

type RouteContext = { params: { id: string } };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const protokollId = Number(context.params.id);
    if (!Number.isFinite(protokollId)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { kiText, sendMail } = parsed.data;
    const pool = getPool();

    if (!sessionMayFreigebenProtokoll(session)) {
      return NextResponse.json(
        { error: "Keine Berechtigung für PDF-Erstellung oder Freigabe-Versand." },
        { status: 403 }
      );
    }

    const [rows] = await pool.execute<LoadRow[]>(
      `SELECT p.id AS protokoll_id, p.auftrag_id, p.erstellt_am AS protokoll_erstellt,
              p.status AS protokoll_status,
              a.beschreibung,
              k.name AS kunde_name, k.email AS kunde_email,
              b.name AS betrieb_name,
              b.logo_pfad AS betrieb_logo_pfad
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

    if (row.protokoll_status !== "zur_pruefung") {
      return NextResponse.json(
        {
          error:
            "Nur Protokolle mit Status „zur Prüfung“ können hier verarbeitet werden.",
        },
        { status: 400 }
      );
    }

    const [fotoRows] = await pool.execute<FotoPfadRow[]>(
      `SELECT datei_pfad FROM fotos WHERE protokoll_id = ? ORDER BY erstellt_am ASC, id ASC`,
      [protokollId]
    );

    const fotoPfade = fotoRows.map((f) => f.datei_pfad);

    const datumStr = new Date(row.protokoll_erstellt).toLocaleString("de-DE", {
      dateStyle: "long",
      timeStyle: "short",
    });

    const pdfBuffer = await generatePDF({
      protokollId,
      betriebName: row.betrieb_name,
      kundeName: row.kunde_name ?? "–",
      datum: datumStr,
      auftragsnummer: String(row.auftrag_id),
      beschreibung: row.beschreibung ?? "",
      kiText,
      fotoPfade,
      betriebLogoPfad: row.betrieb_logo_pfad,
    });

    const pdfUrl = `/uploads/pdfs/${protokollId}.pdf`;

    let emailSent = false;
    let mailError: string | null = null;

    if (sendMail) {
      const to = row.kunde_email?.trim();
      if (!to) {
        return NextResponse.json(
          { error: "Keine E-Mail-Adresse beim Kunden hinterlegt." },
          { status: 400 }
        );
      }
      const kundeName = row.kunde_name?.trim() ?? "";
      try {
        await sendProtokollMail(to, row.betrieb_name, pdfBuffer, kundeName);
        emailSent = true;
      } catch (e) {
        console.error("Mailversand fehlgeschlagen:", e);
        mailError =
          e instanceof Error ? e.message : "E-Mail konnte nicht gesendet werden.";
      }
    }

    await pool.execute(
      `UPDATE protokolle
       SET ki_text = ?, pdf_pfad = ?,
           gesendet_am = CASE WHEN ? = 1 THEN NOW() ELSE gesendet_am END
       WHERE id = ?`,
      [kiText, pdfUrl, emailSent ? 1 : 0, protokollId]
    );

    if (emailSent) {
      await pool.execute(
        `UPDATE protokolle SET status = 'freigegeben' WHERE id = ?`,
        [protokollId]
      );
      await pool.execute(
        `UPDATE auftraege
         SET status = 'abgeschlossen', abgeschlossen_am = NOW()
         WHERE id = ? AND betrieb_id = ?`,
        [row.auftrag_id, session.user.betrieb_id]
      );
    }

    return NextResponse.json({
      success: true,
      pdfUrl,
      emailSent,
      ...(mailError ? { mailError } : {}),
    });
  } catch (error) {
    console.error("Protokoll generate Fehler:", error);
    const message =
      error instanceof Error ? error.message : "Generierung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
