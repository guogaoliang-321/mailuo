import { Hono } from "hono";
import { nanoid } from "nanoid";
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

  const id = nanoid();
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
