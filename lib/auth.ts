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

        return {
          id: String(betrieb.id),
          email: betrieb.email,
          name: betrieb.name,
          betrieb_id: betrieb.id,
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
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
