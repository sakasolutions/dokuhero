import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${padding ? "p-4 sm:p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
