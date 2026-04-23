import { Hono } from "hono";
import { neo4jQueries } from "@meridian/db";
import { requireAuth } from "../middleware/auth.js";
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
  const reply = await neo4jQueries.addPlazaReply(c.req.param("id"), c.get("userId"), body.content.trim(), body.parentId);
  return c.json({ success: true, data: reply }, 201);
});
