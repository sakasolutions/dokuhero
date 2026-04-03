import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const pool = getPool();

        // Prüfe ob Email oder Username
        const isEmail = credentials.email.includes("@");

        let benutzer = null;

        if (isEmail) {
          // Inhaber Login: Email in benutzer Tabelle
          const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT b.id as benutzer_id, b.name, b.email, b.username,
              b.passwort, b.rolle, b.aktiv, b.betrieb_id,
              bt.plan, bt.abo_bis, bt.gesperrt, bt.erstellt_am,
              bt.registriert_am
       FROM benutzer b
       JOIN betriebe bt ON bt.id = b.betrieb_id
       WHERE b.email = ? AND b.rolle = 'inhaber'
       LIMIT 1`,
            [credentials.email.trim().toLowerCase()]
          );
          benutzer = (rows as RowDataPacket[])[0];
        } else {
          // Werker Login: Username in benutzer Tabelle
          // Format: "username@betrieb_id" z.B. "max@3"
          // ODER einfach username wenn betrieb_id in separatem Feld
          // Erstmal: username direkt suchen
          const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT b.id as benutzer_id, b.name, b.email, b.username,
              b.passwort, b.rolle, b.aktiv, b.betrieb_id,
              bt.plan, bt.abo_bis, bt.gesperrt, bt.erstellt_am,
              bt.registriert_am
       FROM benutzer b
       JOIN betriebe bt ON bt.id = b.betrieb_id
       WHERE b.username = ? AND b.rolle = 'mitarbeiter'
       LIMIT 1`,
            [credentials.email.trim().toLowerCase()]
          );
          benutzer = (rows as RowDataPacket[])[0];
        }

        if (!benutzer) return null;

        const ok = await bcrypt.compare(credentials.password, benutzer.passwort);
        if (!ok) return null;

        if (Number(benutzer.aktiv) !== 1) throw new Error("GESPERRT");
        if (Number(benutzer.gesperrt) === 1) throw new Error("GESPERRT");

        return {
          id: String(benutzer.benutzer_id),
          email: benutzer.email ?? "",
          name: benutzer.name,
          betrieb_id: benutzer.betrieb_id,
          benutzer_id: benutzer.benutzer_id,
          rolle: benutzer.rolle,
          gesperrt: Number(benutzer.gesperrt) === 1 ? 1 : 0,
          plan: typeof benutzer.plan === "string" ? benutzer.plan : "trial",
          abo_bis: benutzer.abo_bis instanceof Date
            ? benutzer.abo_bis.toISOString()
            : null,
          erstellt_am: benutzer.erstellt_am instanceof Date
            ? benutzer.erstellt_am.toISOString()
            : null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user && "betrieb_id" in user) {
        token.betrieb_id = user.betrieb_id;
        token.benutzer_id = (user as any).benutzer_id;
        token.rolle = (user as any).rolle;
        token.name = user.name ?? "";
        token.email = user.email ?? "";
        token.gesperrt = user.gesperrt ?? 0;
        if ("plan" in user) token.plan = (user as { plan?: unknown }).plan as any;
        if ("abo_bis" in user)
          token.abo_bis = (user as { abo_bis?: unknown }).abo_bis as any;
        if ("erstellt_am" in user)
          token.erstellt_am = (user as { erstellt_am?: unknown }).erstellt_am as any;
        if ("registriert_am" in user)
          token.registriert_am = (user as { registriert_am?: unknown }).registriert_am as any;

        // Nach Login: Plan/Trial-Daten aus der DB holen (für Middleware-Gating)
        try {
          const pool = getPool();
          type BetriebDataRow = RowDataPacket & {
            plan: string | null;
            registriert_am: Date | null;
            abo_bis: Date | null;
            gesperrt: number | null;
          };

          let rows: BetriebDataRow[] = [];
          try {
            const [r] = await pool.execute<BetriebDataRow[]>(
              `SELECT plan,
                      COALESCE(registriert_am, erstellt_am) AS registriert_am,
                      abo_bis,
                      gesperrt
               FROM betriebe WHERE id = ? LIMIT 1`,
              [token.betrieb_id]
            );
            rows = r;
          } catch (e) {
            // Falls registriert_am noch nicht existiert, fallback auf erstellt_am
            const code =
              e && typeof e === "object" && "code" in e
                ? String((e as { code?: string }).code)
                : "";
            if (code === "ER_BAD_FIELD_ERROR") {
              const [r] = await pool.execute<BetriebDataRow[]>(
                `SELECT plan,
                        erstellt_am AS registriert_am,
                        abo_bis,
                        gesperrt
                 FROM betriebe WHERE id = ? LIMIT 1`,
                [token.betrieb_id]
              );
              rows = r;
            } else {
              throw e;
            }
          }

          const b = rows[0];
          if (b) {
            token.plan = typeof b.plan === "string" ? b.plan : token.plan;
            token.gesperrt =
              typeof b.gesperrt === "number" ? b.gesperrt : token.gesperrt;
            token.abo_bis =
              b.abo_bis instanceof Date ? b.abo_bis.toISOString() : null;
            token.registriert_am =
              b.registriert_am instanceof Date
                ? b.registriert_am.toISOString()
                : (b.registriert_am as unknown as string | null);

            // TEMP DEBUG (Server Logs)
            console.log("Betrieb DB data:", b);
            console.log("JWT Token registriert_am:", token.registriert_am);
            console.log("JWT Token plan:", token.plan);
          }
        } catch {
          // Fallback: Token bleibt wie gehabt (UI funktioniert trotzdem)
        }
      }
      if (trigger === "update" && session && typeof session === "object") {
        const s = session as { name?: unknown };
        if (typeof s.name === "string") {
          token.name = s.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.betrieb_id = token.betrieb_id;
        session.user.benutzer_id = (token as any).benutzer_id;
        session.user.rolle = (token as any).rolle;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.gesperrt = token.gesperrt ?? 0;
        session.user.plan = (token as any).plan;
        session.user.registriert_am = (token as any).registriert_am;
        session.user.abo_bis = (token as any).abo_bis;
        session.user.erstellt_am = (token as any).erstellt_am;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
