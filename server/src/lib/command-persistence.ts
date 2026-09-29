import { sql } from "drizzle-orm";

export function claimCommandQuery(commandId: string, now: string, staleCutoff: string) {
  return sql`
    UPDATE missionary_commands SET processing_at = ${now}
    WHERE id = ${commandId} AND status = 'pending'
      AND (processing_at IS NULL OR processing_at < ${staleCutoff})
    RETURNING id
  `;
}

export function normalizeTokenCount(value: unknown): string {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value).toString();
  return "0";
}

export function completeCommandQuery(command: {
  commandId: string;
  missionaryId: string;
  response: string | undefined;
  tokensUsed: unknown;
  completedAt: string;
}) {
  const tokens = normalizeTokenCount(command.tokensUsed);
  // Completing the command and incrementing stats must either both succeed or
  // both roll back. A retry of this statement cannot count a completed command twice.
  return sql`
    WITH completed AS (
      UPDATE missionary_commands
      SET response = ${command.response ?? null}, tokens_used = ${tokens},
          status = 'completed', completed_at = ${command.completedAt}
      WHERE id = ${command.commandId} AND missionary_id = ${command.missionaryId} AND status = 'pending'
      RETURNING missionary_id
    )
    UPDATE missionaries SET
      total_commands = ((CASE WHEN total_commands ~ '^[0-9]+$' THEN total_commands::numeric ELSE 0 END) + 1)::text,
      total_tokens = ((CASE WHEN total_tokens ~ '^[0-9]+$' THEN total_tokens::numeric ELSE 0 END) + ${tokens}::numeric)::text
    FROM completed WHERE missionaries.id = completed.missionary_id
    RETURNING missionaries.id
  `;
}
