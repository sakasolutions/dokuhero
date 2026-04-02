import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

interface BetriebRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  passwort: string;
  gesperrt?: number | null;
  plan?: string | null;
  abo_bis?: Date | null;
  stripe_customer_id?: string | null;
  erstellt_am?: Date | null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const pool = getPool();
        const [rows] = await pool.execute<BetriebRow[]>(
          "SELECT * FROM betriebe WHERE email = ? LIMIT 1",
          [credentials.email.trim().toLowerCase()]
        );

        const betrieb = rows[0];
        if (!betrieb) {
          return null;
        }

        const ok = await bcrypt.compare(
          credentials.password,
          betrieb.passwort
        );
        if (!ok) {
          return null;
        }

        if (Number(betrieb.gesperrt) === 1) {
          throw new Error("GESPERRT");
        }

        return {
          id: String(betrieb.id),
          email: betrieb.email,
          name: betrieb.name,
          betrieb_id: betrieb.id,
          gesperrt: Number(betrieb.gesperrt) === 1 ? 1 : 0,
          plan: typeof betrieb.plan === "string" ? betrieb.plan : "trial",
          abo_bis:
            betrieb.abo_bis instanceof Date ? betrieb.abo_bis.toISOString() : null,
          erstellt_am:
            betrieb.erstellt_am instanceof Date
              ? betrieb.erstellt_am.toISOString()
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
        token.name = user.name ?? "";
        token.email = user.email ?? "";
        token.gesperrt = user.gesperrt ?? 0;
        if ("plan" in user) token.plan = (user as { plan?: unknown }).plan as any;
        if ("abo_bis" in user)
          token.abo_bis = (user as { abo_bis?: unknown }).abo_bis as any;
        if ("erstellt_am" in user)
          token.erstellt_am = (user as { erstellt_am?: unknown }).erstellt_am as any;
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
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.gesperrt = token.gesperrt ?? 0;
        session.user.plan = (token as any).plan;
        session.user.abo_bis = (token as any).abo_bis;
        session.user.erstellt_am = (token as any).erstellt_am;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
