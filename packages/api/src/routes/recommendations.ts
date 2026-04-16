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
    c.get("userId"),
    c.req.param("id"),
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

  if (!graphData.self) {
    return c.json({ success: true, data: { nodes: [], links: [] } });
  }

  const nodes: Array<{
    id: string;
    label: string;
    type: "user" | "circle";
  }> = [];
  const links: Array<{
    source: string;
    target: string;
    type: string;
  }> = [];

  // Add self
  nodes.push({
    id: graphData.self.id,
    label: graphData.self.displayName,
    type: "user",
  });

  // Add circles
  for (const circle of graphData.circles) {
    nodes.push({ id: circle.id, label: circle.name, type: "circle" });
    links.push({
      source: graphData.self.id,
      target: circle.id,
      type: "MEMBER_OF",
    });
  }

  // Add peers
  for (const peer of graphData.peers) {
    if (!nodes.some((n) => n.id === peer.id)) {
      nodes.push({ id: peer.id, label: peer.displayName, type: "user" });
    }
    // Find shared circles for links
    for (const circle of graphData.circles) {
      links.push({
        source: peer.id,
        target: circle.id,
        type: "MEMBER_OF",
      });
    }
  }

  return c.json({ success: true, data: { nodes, links } });
});
