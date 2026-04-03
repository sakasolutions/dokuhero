import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { generateProtokollText, refineProtokollText } from "@/lib/ai";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface Row extends RowDataPacket {
  notiz: string | null;
  materialien: string | null;
  betrieb_name: string;
  prot_archiviert: number;
  auftrag_archiviert: number;
}

type RouteContext = { params: { id: string } };

function parsePreviewBody(raw: string): {
  feedback?: string;
  previousText?: string;
} {
  const t = raw.trim();
  if (!t) return {};
  try {
    const o = JSON.parse(t) as unknown;
    if (!o || typeof o !== "object" || Array.isArray(o)) return {};
    const rec = o as Record<string, unknown>;
    return {
      feedback: typeof rec.feedback === "string" ? rec.feedback : undefined,
      previousText:
        typeof rec.previousText === "string" ? rec.previousText : undefined,
    };
  } catch {
    throw new SyntaxError("invalid json");
  }
}

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

    let parsed: { feedback?: string; previousText?: string };
    try {
      parsed = parsePreviewBody(await request.text());
    } catch {
      return NextResponse.json(
        { error: "Ungültiger JSON-Body" },
        { status: 400 }
      );
    }

    const feedback = (parsed.feedback ?? "").trim();
    const previousText = (parsed.previousText ?? "").trim();

    const pool = getPool();

    const [rows] = await pool.execute<Row[]>(
      `SELECT p.notiz, p.materialien, b.name AS betrieb_name,
              p.archiviert AS prot_archiviert, a.archiviert AS auftrag_archiviert
       FROM protokolle p
       INNER JOIN auftraege a ON p.auftrag_id = a.id
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

    let kiText: string;
    if (feedback) {
      if (!previousText) {
        return NextResponse.json(
          {
            error:
              "Bei Anpassung ist previousText (aktueller Protokolltext) erforderlich.",
          },
          { status: 400 }
        );
      }
      kiText = await refineProtokollText(previousText, feedback);
    } else {
      const notizText = row.notiz ?? "";
      kiText = await generateProtokollText(
        notizText,
        row.betrieb_name,
        row.materialien
      );
    }

    await pool.execute(`UPDATE protokolle SET ki_text = ? WHERE id = ?`, [
      kiText,
      protokollId,
    ]);

    return NextResponse.json({ kiText });
  } catch (error) {
    console.error("Protokoll preview Fehler:", error);
    const message =
      error instanceof Error ? error.message : "Textgenerierung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
