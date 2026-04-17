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

  const id = crypto.randomUUID();
  await neo4jQueries.createProjectNode({
    id,
    ...parsed.data,
    contributorId: c.get("userId"),
  });

  return c.json({ success: true, data: { id } }, 201);
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
