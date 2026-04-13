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
        const [rows] = await pool.execute<RowDataPacket[]>(
          "SELECT id, email, name, password_hash FROM users WHERE email = ? LIMIT 1",
          [credentials.email.trim().toLowerCase()]
        );
        const u = rows[0] as
          | {
              id: number;
              email: string;
              name: string | null;
              password_hash: string;
            }
          | undefined;
        if (!u) return null;

        const ok = await bcrypt.compare(credentials.password, u.password_hash);
        if (!ok) return null;

        return {
          id: String(u.id),
          email: u.email,
          name: u.name ?? "",
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
