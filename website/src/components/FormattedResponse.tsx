function parseResponse(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch { return null; }
}

export default function FormattedResponse({ text, compact = false }: { text: string; compact?: boolean }) {
  const parsed = parseResponse(text);
  if (!parsed) return <p className="text-sm text-foreground whitespace-pre-wrap break-words bg-background/50 p-3 font-body">{text}</p>;
  const action = typeof parsed.action === "string" ? parsed.action : null;
  const content = typeof parsed.content === "string" ? parsed.content : null;
  const rest = Object.fromEntries(Object.entries(parsed).filter(([key]) => key !== "action" && key !== "content"));
  return (
    <div className="text-sm bg-background/50 p-3 space-y-2 break-words">
      {action && <span className="text-xs font-mono px-1.5 py-0.5 bg-violet/20 text-violet-light">{action}</span>}
      {content && <p className={`text-foreground whitespace-pre-wrap leading-relaxed font-body ${compact ? "line-clamp-4" : ""}`}>{content}</p>}
      {Object.keys(rest).length > 0 && <pre className="text-xs text-foreground-muted font-mono whitespace-pre-wrap mt-2">{JSON.stringify(rest, null, 2)}</pre>}
    </div>
  );
}
