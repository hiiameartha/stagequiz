import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let sql: ReturnType<typeof postgres> | null = null;
let db: Db | null = null;

export function isDbEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDb(): Db | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (db) return db;

  sql = postgres(url, { max: 5, prepare: false });
  db = drizzle(sql, { schema });
  return db;
}
