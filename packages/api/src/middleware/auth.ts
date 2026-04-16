import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { getDb, pgSchema } from "@meridian/db";
import { eq, gt } from "drizzle-orm";
import type { AppEnv } from "../types.js";

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const sessionId = getCookie(c, "meridian_session");
  if (!sessionId) {
    return c.json({ success: false, error: "未登录" }, 401);
  }

  const db = getDb();
  const [session] = await db
    .select()
    .from(pgSchema.sessions)
    .where(eq(pgSchema.sessions.id, sessionId))
    .limit(1);

  if (!session || new Date(session.expiresAt) < new Date()) {
    return c.json({ success: false, error: "会话已过期" }, 401);
  }

  const [user] = await db
    .select({ id: pgSchema.users.id, role: pgSchema.users.role })
    .from(pgSchema.users)
    .where(eq(pgSchema.users.id, session.userId))
    .limit(1);

  if (!user) {
    return c.json({ success: false, error: "用户不存在" }, 401);
  }

  c.set("userId", user.id);
  c.set("userRole", user.role);
  await next();
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get("userRole") !== "admin") {
    return c.json({ success: false, error: "需要管理员权限" }, 403);
  }
  await next();
});
