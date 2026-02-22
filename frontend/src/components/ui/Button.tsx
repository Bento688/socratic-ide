import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}) => {
  const variants = {
    primary:
      "bg-white text-black hover:bg-zinc-200 border border-transparent font-semibold shadow-[0_0_15px_rgba(255,255,255,0.1)]",
    secondary:
      "bg-black text-white hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700",
    danger:
      "bg-red-950/10 text-red-500 hover:bg-red-950/20 border border-red-900/30",
    ghost: "bg-transparent text-zinc-400 hover:text-white hover:bg-white/5",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-sm font-medium transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 disabled:pointer-events-none tracking-tight",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
