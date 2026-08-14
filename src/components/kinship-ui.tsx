import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { initials } from "@/lib/types";

export function Logo() {
  return (
    <Link
      to="/"
      className="inline-flex shrink-0 items-center"
      aria-label="Kinship home"
    >
      <img
        src="/logo.svg"
        alt="Kinship"
        className="h-10 w-auto max-w-[9rem] object-contain"
      />
    </Link>
  );
}

export function Avatar({
  src,
  name,
  size = "size-9",
}: {
  src?: string;
  name: string;
  size?: string;
}) {
  return src ? (
    <img
      src={src}
      alt={name}
      className={`${size} rounded-full object-cover`}
    />
  ) : (
    <span
      className={`${size} grid place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground`}
    >
      {initials(name)}
    </span>
  );
}

export function Button({
  children,
  primary = false,
  className = "",
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  primary?: boolean;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold ${primary ? "bg-primary text-primary-foreground shadow-[0_8px_20px_#66735A] hover:brightness-105" : "border bg-card text-foreground hover:bg-muted"} ${className}`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-[.18em] text-primary">
            <Sparkles className="size-3" />
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-[-.045em] sm:text-5xl">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}
