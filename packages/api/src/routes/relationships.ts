import { Hono } from "hono";

import { neo4jQueries } from "@meridian/db";
import { createRelationshipSchema } from "@meridian/shared";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

export const relationshipRoutes = new Hono<AppEnv>();

relationshipRoutes.use("*", requireAuth);

relationshipRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const relationships = await neo4jQueries.getVisibleRelationships(userId);

  // Apply fuzzy filter for cross-circle items
  const filtered = relationships.map((rel: Record<string, unknown>) => {
    if (rel.ownerId === userId || rel.sameCircle) {
      return rel;
    }
    // Fuzzy view: only type tags visible
    return {
      id: rel.id,
      domainTags: rel.domainTags,
      levelTags: rel.levelTags,
      visibility: rel.visibility,
      _fuzzy: true,
    };
  });

  return c.json({ success: true, data: filtered });
});

relationshipRoutes.get("/:id", async (c) => {
  const rel = await neo4jQueries.getRelationshipById(c.req.param("id"));
  if (!rel) {
    return c.json({ success: false, error: "关系不存在" }, 404);
  }
  return c.json({ success: true, data: rel });
});

relationshipRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createRelationshipSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0].message }, 400);
  }

  const id = crypto.randomUUID();
  await neo4jQueries.createRelationshipNode({
    id,
    ownerId: c.get("userId"),
    ...parsed.data,
  });

  return c.json({ success: true, data: { id } }, 201);
});

// Comments
relationshipRoutes.get("/:id/comments", async (c) => {
  const comments = await neo4jQueries.getComments("relationship", c.req.param("id"));
  return c.json({ success: true, data: comments });
});

relationshipRoutes.post("/:id/comments", async (c) => {
  const body = await c.req.json() as { content: string };
  if (!body.content?.trim()) return c.json({ success: false, error: "评论不能为空" }, 400);
  const comment = await neo4jQueries.addComment("relationship", c.req.param("id"), c.get("userId"), body.content.trim());
  return c.json({ success: true, data: comment }, 201);
});
