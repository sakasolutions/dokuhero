import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2";
import { z } from "zod";
import { getBewertungKontextByToken } from "@/lib/bewertung";
import { getPool } from "@/lib/db";
import { sendNegativesFeedbackAnBetriebMail } from "@/lib/mail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  feedback_text: z.string().min(1, "Bitte Text eingeben.").max(8000),
});

export async function POST(request: Request) {
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      const msg =
        parsed.error.flatten().fieldErrors.feedback_text?.[0] ??
        parsed.error.flatten().fieldErrors.token?.[0] ??
        "Ungültige Eingabe.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { token, feedback_text } = parsed.data;
    const ctx = await getBewertungKontextByToken(token);
    if (!ctx) {
      return NextResponse.json({ error: "Link ungültig." }, { status: 404 });
    }

    if (ctx.zufrieden === 1) {
      return NextResponse.json(
        { error: "Sie haben bereits positiv geantwortet." },
        { status: 409 }
      );
    }

    if (ctx.feedback_text?.trim()) {
      return NextResponse.json({ ok: true, already: true });
    }

    const pool = getPool();
    const [res] = await pool.execute<ResultSetHeader>(
      `UPDATE bewertungen
       SET feedback_text = ?, zufrieden = 0
       WHERE id = ? AND token = ? AND (feedback_text IS NULL OR feedback_text = '')`,
      [feedback_text.trim(), ctx.bewertung_id, token]
    );

    const affected = res.affectedRows;

    if (affected === 0) {
      return NextResponse.json(
        { error: "Feedback konnte nicht gespeichert werden." },
        { status: 409 }
      );
    }

    const betriebMail = ctx.betrieb_email?.trim();
    if (betriebMail) {
      try {
        await sendNegativesFeedbackAnBetriebMail(
          betriebMail,
          ctx.betrieb_name,
          ctx.kunde_name?.trim() ?? "",
          feedback_text.trim()
        );
      } catch (e) {
        console.error("Feedback-Mail an Betrieb fehlgeschlagen:", e);
        return NextResponse.json(
          {
            error:
              "Feedback gespeichert, aber Benachrichtigung an den Betrieb ist fehlgeschlagen.",
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST bewertung/feedback:", e);
    return NextResponse.json({ error: "Serverfehler." }, { status: 500 });
  }
}
