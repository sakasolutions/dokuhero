import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { isAdminEmail } from "@/lib/admin";

export default withAuth(
  async function middleware(request) {
    const path = request.nextUrl.pathname;

    const publicPaths = [
      "/login",
      "/register",
      "/preise",
      "/api/stripe",
      "/passwort-vergessen",
      "/passwort-reset",
      "/bewertung",
      "/gesperrt",
    ];
    const isPublicPath = publicPaths.some((p) => path.startsWith(p));

    const secret = process.env.NEXTAUTH_SECRET;
    const token = secret ? await getToken({ req: request, secret }) : null;

    // Admin bleibt wie bisher (aber ohne Redirect-Schleifen)
    if (path === "/admin" || path.startsWith("/admin/")) {
      if (!isAdminEmail(token?.email as string | undefined)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return NextResponse.next();
    }

    // Admins nicht plan-gaten
    const email = token?.email as string | undefined;
    if (isAdminEmail(email)) {
      return NextResponse.next();
    }

    // Gesperrt hat Priorität
    if (Number(token?.gesperrt) === 1) {
      if (path.startsWith("/gesperrt")) return NextResponse.next();
      return NextResponse.redirect(new URL("/gesperrt", request.url));
    }

    // Trial Check / Abo abgelaufen
    if (token) {
      const plan = (token as unknown as { plan?: unknown }).plan;
      const planStr = typeof plan === "string" ? plan : "";

      const registriertRaw = (token as unknown as { registriert_am?: unknown })
        .registriert_am;
      const registriertAm =
        typeof registriertRaw === "string" ? new Date(registriertRaw) : null;
      const trialEnde =
        registriertAm && !Number.isNaN(registriertAm.getTime())
          ? new Date(registriertAm.getTime() + 30 * 24 * 60 * 60 * 1000)
          : null;
      const jetzt = new Date();

      const trialAbgelaufen =
        planStr === "trial" && trialEnde != null && jetzt > trialEnde;
      const abonnementAbgelaufen = planStr === "expired";

      if (!isPublicPath && (trialAbgelaufen || abonnementAbgelaufen)) {
        return NextResponse.redirect(new URL("/preise", request.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;
        const publicPaths = [
          "/login",
          "/register",
          "/preise",
          "/api/stripe",
          "/passwort-vergessen",
          "/passwort-reset",
          "/bewertung",
          "/gesperrt",
        ];
        if (publicPaths.some((p) => path.startsWith(p))) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/kunden/:path*",
    "/auftraege",
    "/auftraege/:path*",
    "/protokoll",
    "/protokoll/:path*",
    "/einstellungen",
    "/einstellungen/:path*",
    "/preise",
    "/preise/:path*",
    "/admin",
    "/admin/:path*",
    "/gesperrt",
  ],
};
