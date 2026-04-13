"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";

export function Providers({ children, session }: { children: ReactNode; session?: Session | null }) {
  return (
    <SessionProvider session={session ?? undefined} refetchOnWindowFocus refetchInterval={5 * 60}>
      {children}
    </SessionProvider>
  );
}
