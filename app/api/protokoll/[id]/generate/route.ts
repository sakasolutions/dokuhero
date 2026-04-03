import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { generatePDF } from "@/lib/pdf";
import {
  sendNeuesProtokollInternGespeichertMail,
  sendProtokollKopieAnBetriebMail,
  sendProtokollMail,
} from "@/lib/mail";
import { sessionMayFreigebenProtokoll } from "@/lib/protokoll-freigabe";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  kiText: z.string(),
  sendMail: z.boolean().optional().default(false),
  unterschrift: z.string().nullable().optional(),
  monteurUnterschrift: z.string().nullable().optional(),
  kundeEmail: z.preprocess(
    (v) => {
      if (v == null || v === "") return undefined;
      const s = String(v).trim();
      return s === "" ? undefined : s;
    },
    z.string().email("Ungültige E-Mail-Adresse").optional()
  ),
  notifyBetriebIntern: z.boolean().optional().default(false),
});

interface LoadRow extends RowDataPacket {
  protokoll_id: number;
  auftrag_id: number;
  protokoll_nummer: number | null;
  auftragsnummer: string | null;
  protokoll_erstellt: Date;
  protokoll_status: string;
  prot_archiviert: number;
  auftrag_archiviert: number;
  beschreibung: string | null;
  materialien: string | null;
  kunde_name: string | null;
  kunde_email: string | null;
  kunde_adresse: string | null;
  kunde_telefon: string | null;
  betrieb_name: string;
  betrieb_email: string | null;
  betrieb_logo_pfad: string | null;
  betrieb_telefon: string | null;
  betrieb_adresse: string | null;
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

    const {
      kiText,
      sendMail,
      unterschrift,
      monteurUnterschrift,
      kundeEmail,
      notifyBetriebIntern,
    } = parsed.data;
    const unterschriftVal =
      typeof unterschrift === "string" ? unterschrift.trim() : null;
    const hasUnterschrift =
      unterschriftVal != null && unterschriftVal.startsWith("data:image");
    const monteurUnterschriftVal =
      typeof monteurUnterschrift === "string"
        ? monteurUnterschrift.trim()
        : null;
    const hasMonteurUnterschrift =
      monteurUnterschriftVal != null &&
      monteurUnterschriftVal.startsWith("data:image");
    const needsBeideUnterschriften =
      notifyBetriebIntern ||
      (sendMail && typeof monteurUnterschrift === "string");
    const pool = getPool();

    const [rows] = await pool.execute<LoadRow[]>(
      `SELECT p.id AS protokoll_id, p.auftrag_id, p.protokoll_nummer, a.auftragsnummer, p.erstellt_am AS protokoll_erstellt,
              p.status AS protokoll_status,
              p.archiviert AS prot_archiviert,
              a.archiviert AS auftrag_archiviert,
              a.beschreibung,
              p.materialien,
              k.name AS kunde_name, k.email AS kunde_email,
              k.adresse AS kunde_adresse, k.telefon AS kunde_telefon,
              b.name AS betrieb_name,
              b.email AS betrieb_email,
              b.logo_pfad AS betrieb_logo_pfad,
              b.telefon AS betrieb_telefon,
              b.adresse AS betrieb_adresse
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

    if (row.prot_archiviert === 1 || row.auftrag_archiviert === 1) {
      return NextResponse.json(
        { error: "Archivierte Einträge können nicht bearbeitet werden." },
        { status: 400 }
      );
    }

    const mayFreigeben = sessionMayFreigebenProtokoll(session);
    const isMitarbeiter = session.user.rolle === "mitarbeiter";
    const mitarbeiterDarfPdf =
      isMitarbeiter &&
      (row.protokoll_status === "entwurf" ||
        row.protokoll_status === "zur_pruefung") &&
      (!sendMail || hasUnterschrift) &&
      (!needsBeideUnterschriften || hasMonteurUnterschrift);

    if (!mayFreigeben && !mitarbeiterDarfPdf) {
      return NextResponse.json(
        { error: "Keine Berechtigung für PDF-Erstellung oder Freigabe-Versand." },
        { status: 403 }
      );
    }

    if (needsBeideUnterschriften && (!hasUnterschrift || !hasMonteurUnterschrift)) {
      return NextResponse.json(
        {
          error:
            "Für diesen Vorgang sind die Unterschriften von Kunde und Monteur erforderlich.",
        },
        { status: 400 }
      );
    }

    if (row.protokoll_status !== "entwurf" && row.protokoll_status !== "zur_pruefung") {
      return NextResponse.json(
        {
          error:
            "Nur Protokolle im Entwurf oder zur Freigabe können hier verarbeitet werden.",
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
      kundeAdresse: row.kunde_adresse ?? null,
      kundeTelefon: row.kunde_telefon ?? null,
      datum: datumStr,
      kiText,
      materialien: row.materialien?.trim() ? row.materialien : null,
      fotoPfade,
      betriebLogoPfad: row.betrieb_logo_pfad,
      unterschriftDataUri: hasUnterschrift ? unterschriftVal : null,
      monteurUnterschriftDataUri: hasMonteurUnterschrift
        ? monteurUnterschriftVal
        : null,
      monteurName: session.user.name ?? null,
      betriebTelefon: row.betrieb_telefon ?? null,
      betriebAdresse: row.betrieb_adresse ?? null,
    });

    const pdfUrl = `/uploads/pdfs/${protokollId}.pdf`;

    let emailSent = false;
    let mailError: string | null = null;
    let kopieAnBetriebError: string | null = null;
    let betriebInternNotified = false;
    let betriebInternMailError: string | null = null;

    if (sendMail) {
      const to = (kundeEmail?.trim() || row.kunde_email?.trim()) ?? "";
      if (!to) {
        return NextResponse.json(
          { error: "Keine E-Mail-Adresse für den Kunden angegeben." },
          { status: 400 }
        );
      }
      const kundeName = row.kunde_name?.trim() ?? "";
      try {
        await sendProtokollMail(
          to,
          row.betrieb_name,
          pdfBuffer,
          kundeName,
          null
        );
        emailSent = true;
        const betriebMail = row.betrieb_email?.trim();
        if (betriebMail) {
          try {
            await sendProtokollKopieAnBetriebMail(
              betriebMail,
              row.betrieb_name,
              kundeName,
              to,
              pdfBuffer,
              null
            );
          } catch (e) {
            console.error("Kopie an Betrieb fehlgeschlagen:", e);
            kopieAnBetriebError =
              e instanceof Error
                ? e.message
                : "Kopie an Betrieb konnte nicht gesendet werden.";
          }
        }
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
    }

    if (
      !sendMail &&
      hasUnterschrift &&
      hasMonteurUnterschrift &&
      notifyBetriebIntern
    ) {
      const betriebMail = row.betrieb_email?.trim();
      if (betriebMail) {
        try {
          await sendNeuesProtokollInternGespeichertMail(
            betriebMail,
            row.betrieb_name,
            row.kunde_name ?? "",
            pdfBuffer,
            null
          );
          betriebInternNotified = true;
        } catch (e) {
          console.error("Interne Betriebs-Mail fehlgeschlagen:", e);
          betriebInternMailError =
            e instanceof Error
              ? e.message
              : "Benachrichtigung an Betrieb fehlgeschlagen.";
        }
      }
    }

    return NextResponse.json({
      success: true,
      pdfUrl,
      emailSent,
      ...(mailError ? { mailError } : {}),
      ...(kopieAnBetriebError ? { kopieAnBetriebError } : {}),
      betriebInternNotified,
      ...(betriebInternMailError ? { betriebInternMailError } : {}),
    });
  } catch (error) {
    console.error("Protokoll generate Fehler:", error);
    const message =
      error instanceof Error ? error.message : "Generierung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
