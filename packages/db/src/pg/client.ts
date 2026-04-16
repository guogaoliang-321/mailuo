import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!db) {
    const connectionString =
      process.env.DATABASE_URL ??
      "postgresql://meridian:meridian_dev_password@localhost:5432/meridian";
    sql = postgres(connectionString);
    db = drizzle(sql, { schema });
  }
  return db;
}

export async function closePg(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
    db = null;
  }
}
