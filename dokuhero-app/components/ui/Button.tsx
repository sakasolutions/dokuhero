import type { ButtonHTMLAttributes } from "react";

export function Button({
  className = "",
  variant = "primary",
  type = "button",
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50";
  const v =
    variant === "primary"
      ? "bg-primary text-white hover:bg-blue-600"
      : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50";
  return <button type={type} className={`${base} ${v} ${className}`} {...p} />;
}
