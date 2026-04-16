import { Hono } from "hono";
import { nanoid } from "nanoid";
import { getDb, pgSchema } from "@meridian/db";
import { desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.use("*", requireAuth, requireAdmin);

adminRoutes.get("/users", async (c) => {
  const db = getDb();
  const userList = await db
    .select({
      id: pgSchema.users.id,
      email: pgSchema.users.email,
      displayName: pgSchema.users.displayName,
      role: pgSchema.users.role,
      createdAt: pgSchema.users.createdAt,
    })
    .from(pgSchema.users)
    .orderBy(desc(pgSchema.users.createdAt));

  return c.json({ success: true, data: userList });
});

adminRoutes.get("/invites", async (c) => {
  const db = getDb();
  const invites = await db
    .select()
    .from(pgSchema.inviteCodes)
    .orderBy(desc(pgSchema.inviteCodes.createdAt));

  return c.json({ success: true, data: invites });
});

adminRoutes.post("/invites", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const maxUses = (body as { maxUses?: number }).maxUses ?? 1;
  const expiresInDays = (body as { expiresInDays?: number }).expiresInDays ?? 7;

  const db = getDb();
  const code = nanoid(12);

  const [invite] = await db
    .insert(pgSchema.inviteCodes)
    .values({
      code,
      createdBy: c.get("userId"),
      maxUses,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    })
    .returning();

  return c.json({ success: true, data: invite }, 201);
});

adminRoutes.get("/audit", async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 100);
  const offset = (page - 1) * limit;

  const db = getDb();
  const logs = await db
    .select()
    .from(pgSchema.auditLogs)
    .orderBy(desc(pgSchema.auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ success: true, data: logs, meta: { page, limit } });
});
