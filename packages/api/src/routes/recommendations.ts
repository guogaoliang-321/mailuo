import { Hono } from "hono";
import { neo4jQueries } from "@meridian/db";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

export const recommendationRoutes = new Hono<AppEnv>();

recommendationRoutes.use("*", requireAuth);

/**
 * 获取某项目的匹配关系资源推荐
 * GET /recommendations/project/:id/matches
 */
recommendationRoutes.get("/project/:id/matches", async (c) => {
  const matches = await neo4jQueries.getMatchingRelationships(
    c.req.param("id"),
    c.get("userId"),
  );
  return c.json({ success: true, data: matches });
});

/**
 * 获取推荐的跨圈项目（基于用户关系标签匹配）
 * GET /recommendations/projects
 */
recommendationRoutes.get("/projects", async (c) => {
  const projects = await neo4jQueries.getRecommendedProjects(c.get("userId"));
  return c.json({ success: true, data: projects });
});

/**
 * 获取仪表盘统计
 * GET /recommendations/stats
 */
recommendationRoutes.get("/stats", async (c) => {
  const stats = await neo4jQueries.getDashboardStats(c.get("userId"));
  return c.json({ success: true, data: stats });
});

/**
 * 获取关系网络图谱数据
 * GET /recommendations/graph
 */
recommendationRoutes.get("/graph", async (c) => {
  const graphData = await neo4jQueries.getNetworkGraph(c.get("userId"));
  return c.json({ success: true, data: graphData });
});
