import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";

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
  disabled = false,
}: {
  children: React.ReactNode;
  primary?: boolean;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${primary ? "bg-primary text-primary-foreground shadow-[0_3px_10px_rgba(23,21,29,0.08)] hover:brightness-105" : "border bg-card text-foreground hover:bg-muted"} ${className}`}
    >
      {children}
    </button>
  );
}

export function SelectMenu({ value, options, placeholder, onChange, className = "" }: {
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);

  return <div ref={root} className={`relative ${className}`}><button type="button" onClick={() => setOpen((current) => !current)} className={`flex h-14 w-full items-center justify-between rounded-md border-0 bg-[#f5f5f2] px-4 text-left text-sm outline-none focus:border-0 focus:outline-none focus:ring-0 ${selected ? "text-foreground" : "text-muted-foreground"}`} aria-haspopup="listbox" aria-expanded={open}><span>{selected?.label ?? placeholder}</span><ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} /></button>{open && <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-64 overflow-auto rounded-xl bg-[#f5f5f2] p-2 shadow-[0_10px_30px_rgba(23,21,29,0.12)]" role="listbox">{options.map((option) => <button type="button" key={option.value} onClick={() => { onChange(option.value); setOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm hover:bg-primary/10 ${value === option.value ? "font-bold text-primary" : "font-medium"}`} role="option" aria-selected={value === option.value}>{option.label}{value === option.value && <Check className="size-4" />}</button>)}</div>}</div>;
}

export function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
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
