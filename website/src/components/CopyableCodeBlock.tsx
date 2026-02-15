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
  const { copied, copy } = useClipboard();

  return (
    <div
      onClick={() => copy(copyText)}
      className={`bg-background border border-border p-4 cursor-pointer ${hoverBorderColor} transition-colors relative group overflow-x-auto ${className ?? ""}`}
    >
      {children}
      <span className="absolute top-4 right-4 text-xs text-foreground-muted/50 group-hover:text-foreground-muted transition-colors font-mono">
        {copied ? "copied" : "copy"}
      </span>
    </div>
  );
}
