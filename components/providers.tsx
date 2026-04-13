import type { ReactNode } from "react";

/** Früher SessionProvider – Landing hat keine App-Session mehr. */
export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
