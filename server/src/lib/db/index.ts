import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/** PostgreSQL wire protocol works with Supabase, Neon, and local PostgreSQL. */
export function createDatabase(connectionString: string) {
  let hostname: string;
  try {
    const url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
    hostname = url.hostname;
    if (!hostname) throw new Error();
  } catch {
    // Never include the connection string in errors: it contains credentials.
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
  const pool = new Pool({
    connectionString,
    // Hosted connections verify TLS by default; explicit URL SSL settings win.
    ssl: local ? false : { rejectUnauthorized: true },
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: true,
  });
  pool.on("error", (error) => {
    console.error("[database] Idle connection failed", error.name);
  });
  return { database: drizzle(pool, { schema }), pool };
}

let _db: NodePgDatabase<typeof schema> | null = null;

function getDb(): NodePgDatabase<typeof schema> {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    _db = createDatabase(process.env.DATABASE_URL).database;
  }
  return _db;
}

export const db: NodePgDatabase<typeof schema> = new Proxy(
  {} as NodePgDatabase<typeof schema>,
  {
    get(_target, prop) {
      return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
    },
  }
);

export { schema };
