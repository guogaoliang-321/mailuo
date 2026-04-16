import { createMiddleware } from "hono/factory";
import { getDb, pgSchema } from "@meridian/db";
import type { AppEnv } from "../types.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const auditMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  await next();

  if (!MUTATING_METHODS.has(c.req.method)) return;

  const userId = c.get("userId") ?? null;
  const path = new URL(c.req.url).pathname;

  try {
    const db = getDb();
    await db.insert(pgSchema.auditLogs).values({
      userId,
      action: `${c.req.method} ${path}`,
      entityType: path.split("/")[3] ?? null,
      ipAddress:
        c.req.header("x-forwarded-for") ??
        c.req.header("x-real-ip") ??
        null,
    });
  } catch {
    // audit logging failure should not break the request
  }
});
