import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className = "", ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-primary focus:ring-2 ${className}`}
      {...p}
    />
  );
}
