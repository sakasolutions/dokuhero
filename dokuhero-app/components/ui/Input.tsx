import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-primary focus:ring-2 ${className}`}
      {...p}
    />
  );
}
