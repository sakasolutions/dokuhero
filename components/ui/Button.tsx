import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-teal-700 focus-visible:ring-primary",
  outline:
    "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-slate-400",
  ghost: "text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
};

export function Button({
  className = "",
  variant = "primary",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  const { type = "button", ...rest } = props as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
