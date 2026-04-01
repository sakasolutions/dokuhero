import { randomBytes } from "crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { getPool } from "@/lib/db";
import { sendZufriedenheitsAnfrageMail } from "@/lib/mail";

export function getAppBaseUrl(): string {
  const u =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://dokuhero.de";
  return u.replace(/\/$/, "");
}

interface ProtokollMailRow extends RowDataPacket {
  protokoll_id: number;
  kunde_email: string | null;
  kunde_name: string | null;
  betrieb_name: string;
}

/**
 * Lädt Daten, legt Bewertungszeile mit Token an, sendet Zufriedenheits-Mail.
 * Bei Mail-Fehler wird die Zeile wieder entfernt.
 * @returns true wenn versendet, false wenn kein Kunden-E-Mail o. Ä.
 */
export async function sendBewertungsAnfrage(
  protokollId: number
): Promise<boolean> {
  const pool = getPool();

  const [rows] = await pool.execute<ProtokollMailRow[]>(
    `SELECT p.id AS protokoll_id,
            k.email AS kunde_email,
            k.name AS kunde_name,
            b.name AS betrieb_name
     FROM protokolle p
     INNER JOIN auftraege a ON a.id = p.auftrag_id
     LEFT JOIN kunden k ON k.id = a.kunde_id
     INNER JOIN betriebe b ON b.id = a.betrieb_id
     WHERE p.id = ?
     LIMIT 1`,
    [protokollId]
  );

  const row = rows[0];
  if (!row) {
    return false;
  }

  const to = row.kunde_email?.trim();
  if (!to) {
    return false;
  }

  const token = randomBytes(32).toString("hex");

  const [ins] = await pool.execute<ResultSetHeader>(
    `INSERT INTO bewertungen (protokoll_id, token) VALUES (?, ?)`,
    [protokollId, token]
  );

  const bewertungId = ins.insertId;
  const base = getAppBaseUrl();
  const urlJa = `${base}/bewertung/${token}/ja`;
  const urlNein = `${base}/bewertung/${token}/nein`;

  try {
    await sendZufriedenheitsAnfrageMail(
      to,
      row.betrieb_name,
      row.kunde_name?.trim() ?? "",
      urlJa,
      urlNein
    );
    return true;
  } catch (e) {
    await pool.execute(`DELETE FROM bewertungen WHERE id = ?`, [bewertungId]);
    throw e;
  }
}

export interface BewertungKontextRow extends RowDataPacket {
  bewertung_id: number;
  token: string;
  zufrieden: number | null;
  feedback_text: string | null;
  google_bewertung_link: string | null;
  betrieb_email: string;
  betrieb_name: string;
  kunde_name: string | null;
}

export async function getBewertungKontextByToken(
  token: string
): Promise<BewertungKontextRow | null> {
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return null;
  }

  const pool = getPool();
  const [rows] = await pool.execute<BewertungKontextRow[]>(
    `SELECT b.id AS bewertung_id, b.token, b.zufrieden, b.feedback_text,
            be.google_bewertung_link, be.email AS betrieb_email, be.name AS betrieb_name,
            k.name AS kunde_name
     FROM bewertungen b
     INNER JOIN protokolle p ON p.id = b.protokoll_id
     INNER JOIN auftraege a ON a.id = p.auftrag_id
     INNER JOIN betriebe be ON be.id = a.betrieb_id
     LEFT JOIN kunden k ON k.id = a.kunde_id
     WHERE b.token = ?
     LIMIT 1`,
    [token]
  );

  return rows[0] ?? null;
}
