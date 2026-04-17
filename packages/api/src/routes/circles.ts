import { Hono } from "hono";
import { neo4jQueries } from "@meridian/db";
import { createCircleSchema, inviteToCircleSchema } from "@meridian/shared";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

export const circleRoutes = new Hono<AppEnv>();

circleRoutes.use("*", requireAuth);

circleRoutes.get("/", async (c) => {
  const circles = await neo4jQueries.getUserCircles(c.get("userId"));
  return c.json({ success: true, data: circles });
});

circleRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createCircleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0].message }, 400);
  }

  const id = crypto.randomUUID();
  await neo4jQueries.createCircleNode({
    id,
    ...parsed.data,
    createdBy: c.get("userId"),
  });

  return c.json({ success: true, data: { id } }, 201);
});

circleRoutes.get("/:id/members", async (c) => {
  const members = await neo4jQueries.getCircleMembers(c.req.param("id"));
  return c.json({ success: true, data: members });
});

circleRoutes.post("/:id/invite", async (c) => {
  const body = await c.req.json();
  const parsed = inviteToCircleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0].message }, 400);
  }
  await neo4jQueries.addCircleMember(c.req.param("id"), parsed.data.userId);
  return c.json({ success: true }, 201);
});

circleRoutes.delete("/:id/members/:userId", async (c) => {
  await neo4jQueries.removeCircleMember(c.req.param("id"), c.req.param("userId"));
  return c.json({ success: true });
});

// ── Circle invite codes ──

// Generate invite code for a circle
circleRoutes.post("/:id/invite-code", async (c) => {
  const circleId = c.req.param("id");
  const code = crypto.randomUUID().slice(0, 8).toUpperCase();
  const invite = await neo4jQueries.createCircleInviteCode(circleId, c.get("userId"), code);
  return c.json({ success: true, data: invite }, 201);
});

// List invite codes for a circle
circleRoutes.get("/:id/invite-codes", async (c) => {
  const codes = await neo4jQueries.getCircleInviteCodes(c.req.param("id"));
  return c.json({ success: true, data: codes });
});

// Join a circle by invite code
circleRoutes.post("/join", async (c) => {
  const body = await c.req.json();
  const code = (body as { code?: string }).code;
  if (!code) return c.json({ success: false, error: "请输入邀请码" }, 400);

  const result = await neo4jQueries.joinCircleByCode(code, c.get("userId"));
  if (!result.success) {
    return c.json({ success: false, error: result.error }, 400);
  }
  return c.json({ success: true, data: { circleName: result.circleName } });
});

// Circle messages
circleRoutes.get("/:id/messages", async (c) => {
  const messages = await neo4jQueries.getCircleMessages(c.req.param("id"));
  return c.json({ success: true, data: messages });
});

circleRoutes.post("/:id/messages", async (c) => {
  const body = await c.req.json() as { content: string };
  if (!body.content?.trim()) return c.json({ success: false, error: "消息不能为空" }, 400);
  const msg = await neo4jQueries.addCircleMessage(c.req.param("id"), c.get("userId"), body.content.trim());
  return c.json({ success: true, data: msg }, 201);
});
