import { Hono } from "hono";
import { neo4jQueries, getDb, pgSchema } from "@meridian/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { sendPushToUser } from "./push.js";
import type { AppEnv } from "../types.js";

export const plazaRoutes = new Hono<AppEnv>();

plazaRoutes.use("*", requireAuth);

const VALID_CATEGORIES = ["all", "design", "construction", "connection", "materials", "general"];

plazaRoutes.get("/", async (c) => {
  const category = c.req.query("category") ?? "all";
  const safeCategory = VALID_CATEGORIES.includes(category) ? category : "all";
  const messages = await neo4jQueries.getPlazaMessages(safeCategory);
  return c.json({ success: true, data: messages });
});

plazaRoutes.post("/", async (c) => {
  const body = await c.req.json() as { content: string; category?: string };
  if (!body.content?.trim()) return c.json({ success: false, error: "消息不能为空" }, 400);
  const category = VALID_CATEGORIES.includes(body.category ?? "") ? body.category! : "general";
  const msg = await neo4jQueries.addPlazaMessage(c.get("userId"), body.content.trim(), category);
  return c.json({ success: true, data: msg }, 201);
});

// Replies
plazaRoutes.get("/:id/replies", async (c) => {
  const replies = await neo4jQueries.getPlazaReplies(c.req.param("id"));
  return c.json({ success: true, data: replies });
});

plazaRoutes.post("/:id/replies", async (c) => {
  const body = await c.req.json() as { content: string; parentId?: string };
  if (!body.content?.trim()) return c.json({ success: false, error: "回复不能为空" }, 400);
  const messageId = c.req.param("id");
  const replierId = c.get("userId");
  const reply = await neo4jQueries.addPlazaReply(messageId, replierId, body.content.trim(), body.parentId);

  // Send push notification to the original message author (if not the same person)
  try {
    const db = getDb();
    const [message] = await db
      .select({ userId: pgSchema.plazaMessages.userId })
      .from(pgSchema.plazaMessages)
      .where(eq(pgSchema.plazaMessages.id, messageId))
      .limit(1);
    if (message && message.userId !== replierId) {
      await sendPushToUser(message.userId, {
        title: "广场新评论",
        body: body.content.trim().slice(0, 80),
        url: "/",
        tag: `plaza-reply-${messageId}`,
      });
    }
  } catch {
    // Push errors must not affect the reply response
  }

  return c.json({ success: true, data: reply }, 201);
});

// ── Delete message (author or admin) ──────────────────────────────────────
plazaRoutes.delete("/:id", async (c) => {
  const messageId = c.req.param("id");
  const userId = c.get("userId");
  const db = getDb();

  const [[msg], [actor]] = await Promise.all([
    db.select({ userId: pgSchema.plazaMessages.userId }).from(pgSchema.plazaMessages).where(eq(pgSchema.plazaMessages.id, messageId)).limit(1),
    db.select({ role: pgSchema.users.role }).from(pgSchema.users).where(eq(pgSchema.users.id, userId)).limit(1),
  ]);

  if (!msg) return c.json({ success: false, error: "消息不存在" }, 404);
  if (msg.userId !== userId && actor?.role !== "admin") return c.json({ success: false, error: "无权限" }, 403);

  await db.delete(pgSchema.plazaReplies).where(eq(pgSchema.plazaReplies.messageId, messageId));
  await db.delete(pgSchema.plazaMessages).where(eq(pgSchema.plazaMessages.id, messageId));
  return c.json({ success: true });
});

// ── Delete reply (author or admin) ────────────────────────────────────────
plazaRoutes.delete("/:id/replies/:replyId", async (c) => {
  const replyId = c.req.param("replyId");
  const userId = c.get("userId");
  const db = getDb();

  const [[reply], [actor]] = await Promise.all([
    db.select({ userId: pgSchema.plazaReplies.userId }).from(pgSchema.plazaReplies).where(eq(pgSchema.plazaReplies.id, replyId)).limit(1),
    db.select({ role: pgSchema.users.role }).from(pgSchema.users).where(eq(pgSchema.users.id, userId)).limit(1),
  ]);

  if (!reply) return c.json({ success: false, error: "评论不存在" }, 404);
  if (reply.userId !== userId && actor?.role !== "admin") return c.json({ success: false, error: "无权限" }, 403);

  // Delete the reply and any sub-replies that reference it
  await db.delete(pgSchema.plazaReplies).where(and(
    eq(pgSchema.plazaReplies.messageId, c.req.param("id")),
    eq(pgSchema.plazaReplies.id, replyId),
  ));
  return c.json({ success: true });
});
