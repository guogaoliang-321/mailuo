import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { hash, verify } from "@node-rs/argon2";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb, pgSchema } from "@meridian/db";
import { loginSchema, registerSchema } from "@meridian/shared";
import { eq, and, gt, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

export const authRoutes = new Hono<AppEnv>();

const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

authRoutes.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0].message }, 400);
  }

  const { email, password, displayName, inviteCode } = parsed.data;
  const db = getDb();

  // Validate invite code
  const [invite] = await db
    .select()
    .from(pgSchema.inviteCodes)
    .where(eq(pgSchema.inviteCodes.code, inviteCode))
    .limit(1);

  if (!invite) {
    return c.json({ success: false, error: "邀请码无效" }, 400);
  }
  if (invite.useCount >= invite.maxUses) {
    return c.json({ success: false, error: "邀请码已用完" }, 400);
  }
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return c.json({ success: false, error: "邀请码已过期" }, 400);
  }

  // Check email uniqueness
  const [existing] = await db
    .select({ id: pgSchema.users.id })
    .from(pgSchema.users)
    .where(eq(pgSchema.users.email, email))
    .limit(1);

  if (existing) {
    return c.json({ success: false, error: "该邮箱已注册" }, 400);
  }

  const passwordHash = await hash(password);

  const [user] = await db
    .insert(pgSchema.users)
    .values({
      email,
      displayName,
      passwordHash,
      invitedBy: invite.createdBy,
    })
    .returning({ id: pgSchema.users.id });

  // Update invite code usage
  await db
    .update(pgSchema.inviteCodes)
    .set({
      useCount: sql`${pgSchema.inviteCodes.useCount} + 1`,
      usedBy: user.id,
    })
    .where(eq(pgSchema.inviteCodes.id, invite.id));

  // Create session
  const sessionId = nanoid(64);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE);

  await db.insert(pgSchema.sessions).values({
    id: sessionId,
    userId: user.id,
    expiresAt,
    userAgent: c.req.header("user-agent") ?? null,
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  setCookie(c, "meridian_session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: SESSION_MAX_AGE / 1000,
    path: "/",
  });

  return c.json({ success: true, data: { id: user.id, email, displayName } }, 201);
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0].message }, 400);
  }

  const { email, password } = parsed.data;
  const db = getDb();

  const [user] = await db
    .select()
    .from(pgSchema.users)
    .where(eq(pgSchema.users.email, email))
    .limit(1);

  if (!user) {
    return c.json({ success: false, error: "邮箱或密码错误" }, 401);
  }

  const valid = await verify(user.passwordHash, password);
  if (!valid) {
    return c.json({ success: false, error: "邮箱或密码错误" }, 401);
  }

  const sessionId = nanoid(64);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE);

  await db.insert(pgSchema.sessions).values({
    id: sessionId,
    userId: user.id,
    expiresAt,
    userAgent: c.req.header("user-agent") ?? null,
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  setCookie(c, "meridian_session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: SESSION_MAX_AGE / 1000,
    path: "/",
  });

  return c.json({
    success: true,
    data: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
  });
});

authRoutes.post("/logout", async (c) => {
  const sessionId = getCookie(c, "meridian_session");
  if (sessionId) {
    const db = getDb();
    await db.delete(pgSchema.sessions).where(eq(pgSchema.sessions.id, sessionId));
  }
  deleteCookie(c, "meridian_session");
  return c.json({ success: true });
});

authRoutes.patch("/profile", requireAuth, async (c) => {
  const body = await c.req.json();
  const parsed = z.object({
    displayName: z.string().min(1, "名称不能为空").max(50, "名称不超过50字"),
  }).safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0].message }, 400);
  }
  const db = getDb();
  const [updated] = await db
    .update(pgSchema.users)
    .set({ displayName: parsed.data.displayName })
    .where(eq(pgSchema.users.id, c.get("userId")))
    .returning({
      id: pgSchema.users.id,
      email: pgSchema.users.email,
      displayName: pgSchema.users.displayName,
      role: pgSchema.users.role,
    });
  return c.json({ success: true, data: updated });
});

authRoutes.patch("/password", requireAuth, async (c) => {
  const body = await c.req.json();
  const parsed = z.object({
    currentPassword: z.string().min(1, "请输入当前密码"),
    newPassword: z.string().min(8, "新密码至少8位").max(100),
  }).safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0].message }, 400);
  }
  const db = getDb();
  const [user] = await db
    .select()
    .from(pgSchema.users)
    .where(eq(pgSchema.users.id, c.get("userId")))
    .limit(1);
  if (!user) return c.json({ success: false, error: "用户不存在" }, 404);

  const valid = await verify(user.passwordHash, parsed.data.currentPassword);
  if (!valid) return c.json({ success: false, error: "当前密码错误" }, 401);

  const newHash = await hash(parsed.data.newPassword);
  await db
    .update(pgSchema.users)
    .set({ passwordHash: newHash })
    .where(eq(pgSchema.users.id, c.get("userId")));

  return c.json({ success: true });
});

authRoutes.get("/me", requireAuth, async (c) => {
  const db = getDb();
  const [user] = await db
    .select({
      id: pgSchema.users.id,
      email: pgSchema.users.email,
      displayName: pgSchema.users.displayName,
      role: pgSchema.users.role,
      createdAt: pgSchema.users.createdAt,
    })
    .from(pgSchema.users)
    .where(eq(pgSchema.users.id, c.get("userId")))
    .limit(1);

  if (!user) {
    return c.json({ success: false, error: "用户不存在" }, 404);
  }

  return c.json({ success: true, data: user });
});
