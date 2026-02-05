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
  hoverBorderColor = "hover:border-violet/50",
  className,
}: CopyableCodeBlockProps) {
  const { copied, copy } = useClipboard();

  return (
    <div
      onClick={() => copy(copyText)}
      className={`bg-background border border-border rounded-lg p-4 cursor-pointer ${hoverBorderColor} transition-colors relative group ${className ?? ""}`}
    >
      {children}
      <span className="absolute top-4 right-4 text-xs text-foreground-muted group-hover:text-foreground transition-colors">
        {copied ? "copied" : "copy"}
      </span>
    </div>
  );
}
