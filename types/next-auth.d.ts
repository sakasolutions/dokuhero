import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      betrieb_id: number;
      name: string;
      email: string;
    };
  }

  interface User {
    betrieb_id: number;
    name: string;
    email: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    betrieb_id: number;
    name: string;
    email: string;
  }
}
