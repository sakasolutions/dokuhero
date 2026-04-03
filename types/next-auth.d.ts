import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      betrieb_id: number;
      benutzer_id?: number;
      rolle?: string;
      name: string;
      email: string;
      gesperrt?: number;
      plan?: string;
      registriert_am?: string | null;
      abo_bis?: string | null;
      erstellt_am?: string | null;
    };
  }

  interface User {
    betrieb_id: number;
    benutzer_id?: number;
    rolle?: string;
    name: string;
    email: string;
    gesperrt?: number;
    plan?: string;
    registriert_am?: string | null;
    abo_bis?: string | null;
    erstellt_am?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    betrieb_id: number;
    benutzer_id?: number;
    rolle?: string;
    name: string;
    email: string;
    gesperrt?: number;
    plan?: string;
    registriert_am?: string | null;
    abo_bis?: string | null;
    erstellt_am?: string | null;
  }
}
