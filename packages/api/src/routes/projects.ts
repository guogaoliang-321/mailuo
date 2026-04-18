import { Hono } from "hono";

import { neo4jQueries } from "@meridian/db";
import { createProjectSchema, updateProjectSchema } from "@meridian/shared";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

export const projectRoutes = new Hono<AppEnv>();

projectRoutes.use("*", requireAuth);

projectRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const projects = await neo4jQueries.getVisibleProjects(userId);
  return c.json({ success: true, data: projects });
});

projectRoutes.get("/:id", async (c) => {
  const project = await neo4jQueries.getProjectById(c.req.param("id"));
  if (!project) {
    return c.json({ success: false, error: "项目不存在" }, 404);
  }
  return c.json({ success: true, data: project });
});

projectRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0].message }, 400);
  }

  const userId = c.get("userId");
  const shareTo = (body as { shareToCircle?: string | "all" }).shareToCircle;

  // 1. Always save to private library first
  const myProject = await neo4jQueries.createMyProject({
    userId,
    name: parsed.data.name,
    stage: parsed.data.stage,
    region: parsed.data.region,
    budget: parsed.data.scale,
    notes: parsed.data.notes,
    isShared: !!shareTo,
  });

  // 2. If sharing, also create in shared pool
  let sharedId: string | undefined;
  if (shareTo) {
    sharedId = crypto.randomUUID();
    await neo4jQueries.createProjectNode({
      id: sharedId,
      ...parsed.data,
      contributorId: userId,
      circleId: shareTo === "all" ? null : shareTo,
    });
  }

  return c.json({ success: true, data: { id: sharedId ?? myProject.id, privateId: myProject.id } }, 201);
});

projectRoutes.patch("/:id", async (c) => {
  const body = await c.req.json();
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0].message }, 400);
  }

  await neo4jQueries.updateProjectNode(c.req.param("id"), parsed.data);
  return c.json({ success: true });
});

// Comments
projectRoutes.get("/:id/comments", async (c) => {
  const comments = await neo4jQueries.getComments("project", c.req.param("id"));
  return c.json({ success: true, data: comments });
});

projectRoutes.post("/:id/comments", async (c) => {
  const body = await c.req.json() as { content: string };
  if (!body.content?.trim()) return c.json({ success: false, error: "评论不能为空" }, 400);
  const comment = await neo4jQueries.addComment("project", c.req.param("id"), c.get("userId"), body.content.trim());
  return c.json({ success: true, data: comment }, 201);
});
