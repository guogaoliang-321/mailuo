import { Hono } from "hono";
import { neo4jQueries } from "@meridian/db";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

export const dashboardRoutes = new Hono<AppEnv>();

dashboardRoutes.use("*", requireAuth);

dashboardRoutes.get("/", async (c) => {
  const userId = c.get("userId");

  const [projects, circles, requests, allDemands, relationships, graph] = await Promise.all([
    neo4jQueries.getVisibleProjects(userId),
    neo4jQueries.getUserCircles(userId),
    neo4jQueries.getRequestsForUser(userId),
    neo4jQueries.getAllVisibleRequests(userId),
    neo4jQueries.getVisibleRelationships(userId),
    neo4jQueries.getNetworkGraph(userId),
  ]);

  // Apply fuzzy filter for relationships (same logic as /relationships)
  const filteredRelationships = (relationships as Record<string, unknown>[]).map((rel) => {
    if (rel.ownerId === userId || rel.sameCircle) return rel;
    return { id: rel.id, domainTags: rel.domainTags, levelTags: rel.levelTags, visibility: rel.visibility, _fuzzy: true };
  });

  return c.json({
    success: true,
    data: { projects, circles, requests, allDemands, relationships: filteredRelationships, graph },
  });
});
