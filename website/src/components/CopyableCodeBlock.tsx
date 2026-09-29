"use client";

import { useClipboard } from "@/lib/useClipboard";

interface CopyableCodeBlockProps {
  copyText: string;
  children: React.ReactNode;
  hoverBorderColor?: string;
  className?: string;
}

export default function CopyableCodeBlock({
  copyText,
  children,
  hoverBorderColor = "hover:border-gold/30",
  className,
}: CopyableCodeBlockProps) {
  const { copied, copy, error } = useClipboard();

  return (
    <div
      className={`bg-background border border-border p-4 ${hoverBorderColor} transition-colors relative group overflow-x-auto ${className ?? ""}`}
    >
      {children}
      <button type="button" onClick={() => void copy(copyText)} aria-label="Copy instructions" className="absolute top-1 right-1 min-h-11 min-w-11 px-2 text-xs bg-background text-gold hover:text-gold-light transition-colors font-mono">
        {copied ? "Copied" : "Copy"}
      </button>
      <span className="sr-only" role="status">{copied ? "Copied to clipboard" : ""}</span>
      {error && <p role="status" className="mt-3 text-xs text-gold">{error}</p>}
    </div>
  );
}
