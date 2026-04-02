import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      betrieb_id: number;
      name: string;
      email: string;
      gesperrt?: number;
      plan?: string;
      abo_bis?: string | null;
      erstellt_am?: string | null;
    };
  }

  interface User {
    betrieb_id: number;
    name: string;
    email: string;
    gesperrt?: number;
    plan?: string;
    abo_bis?: string | null;
    erstellt_am?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    betrieb_id: number;
    name: string;
    email: string;
    gesperrt?: number;
    plan?: string;
    abo_bis?: string | null;
    erstellt_am?: string | null;
  }
}
