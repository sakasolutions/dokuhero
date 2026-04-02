import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getPool } from "@/lib/db";
import {
  sendNeuerBetriebAdminNotifyMail,
  sendWillkommenMail,
} from "@/lib/mail";
import type { ResultSetHeader } from "mysql2";
import type { RowDataPacket } from "mysql2";

const BRANCHEN = [
  "KFZ-Werkstatt",
  "Hausmeisterdienst",
  "Handwerker",
  "Reinigung",
  "Sonstiges",
] as const;

const registerSchema = z
  .object({
    name: z.string().min(1, "Betriebsname ist erforderlich"),
    email: z.string().email("Ungültige E-Mail"),
    password: z.string().min(8, "Mindestens 8 Zeichen"),
    passwordConfirm: z.string(),
    telefon: z.string().optional().nullable(),
    branche: z.enum(BRANCHEN).optional(),
    acceptAgb: z.boolean(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["passwordConfirm"],
  })
  .refine((data) => data.acceptAgb === true, {
    message:
      "Bitte bestätigen, dass du die AGB und die Datenschutzerklärung gelesen hast und akzeptierst.",
    path: ["acceptAgb"],
  });

interface IdRow extends RowDataPacket {
  id: number;
}

function logMysqlError(context: string, e: unknown) {
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    console.error(`[register] ${context}`, {
      message: o.message ?? (e instanceof Error ? e.message : String(e)),
      code: o.code,
      errno: o.errno,
      sqlState: o.sqlState,
      sqlMessage: o.sqlMessage,
    });
  } else {
    console.error(`[register] ${context}`, e);
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error("[register] JSON-Body konnte nicht gelesen werden:", parseErr);
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      console.error(
        "[register] Validierung fehlgeschlagen:",
        parsed.error.flatten()
      );
      const fe = parsed.error.flatten().fieldErrors;
      const first =
        Object.values(fe)
          .flat()
          .find((m) => typeof m === "string") ?? "Ungültige Eingaben.";
      return NextResponse.json(
        { error: first, fieldErrors: fe },
        { status: 400 }
      );
    }

    const { name, email, password, telefon, branche: brancheRaw } =
      parsed.data;
    const branche = brancheRaw ?? "Sonstiges";
    const emailNorm = email.trim().toLowerCase();
    const pool = getPool();

    const [existing] = await pool.execute<IdRow[]>(
      "SELECT id FROM betriebe WHERE email = ? LIMIT 1",
      [emailNorm]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Diese E-Mail ist bereits registriert." },
        { status: 409 }
      );
    }

    const hash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO betriebe (
         name, email, passwort, telefon, branche, adresse,
         logo_pfad, google_bewertung_link,
         plan, gesperrt, registriert_am, erstellt_am
       ) VALUES (
         ?, ?, ?, ?, ?, NULL, NULL, NULL,
         'trial', 0, NOW(), NOW()
       )`,
      [name.trim(), emailNorm, hash, telefon?.trim() || null, branche]
    );

    try {
      await sendNeuerBetriebAdminNotifyMail({
        betriebName: name.trim(),
        email: emailNorm,
        telefon: telefon?.trim() || null,
        branche,
        betriebId: result.insertId,
      });
    } catch (e) {
      console.error("[register] Admin-Benachrichtigung fehlgeschlagen:", e);
    }

    try {
      await sendWillkommenMail(emailNorm, name.trim());
    } catch (e) {
      console.error("[register] Willkommens-Mail fehlgeschlagen:", e);
    }

    return NextResponse.json({
      ok: true,
      betriebId: result.insertId,
    });
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : "";
    if (code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Diese E-Mail ist bereits registriert." },
        { status: 409 }
      );
    }
    if (code === "ER_BAD_FIELD_ERROR") {
      logMysqlError("INSERT: unbekannte/fehlende Spalte (ER_BAD_FIELD_ERROR)", e);
      const sqlMsg =
        e && typeof e === "object" && "sqlMessage" in e
          ? String((e as { sqlMessage: string }).sqlMessage)
          : "";
      return NextResponse.json(
        {
          error:
            "Datenbankschema passt nicht (fehlende oder falsch benannte Spalte). Siehe Server-Log.",
          detail: sqlMsg || undefined,
        },
        { status: 500 }
      );
    }
    logMysqlError("Registrierung fehlgeschlagen (INSERT/DB)", e);
    return NextResponse.json(
      { error: "Registrierung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
