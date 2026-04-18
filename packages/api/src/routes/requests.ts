import { Hono } from "hono";

import { neo4jQueries, getDb, pgSchema } from "@meridian/db";
import { sql } from "drizzle-orm";
import { createRequestSchema, respondRequestSchema } from "@meridian/shared";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

export const requestRoutes = new Hono<AppEnv>();

requestRoutes.use("*", requireAuth);

requestRoutes.get("/", async (c) => {
  const requests = await neo4jQueries.getRequestsForUser(c.get("userId"));
  return c.json({ success: true, data: requests });
});

requestRoutes.get("/all-visible", async (c) => {
  const requests = await neo4jQueries.getAllVisibleRequests(c.get("userId"));
  return c.json({ success: true, data: requests });
});

requestRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0].message }, 400);
  }

  const id = crypto.randomUUID();
  await neo4jQueries.createRequestNode({
    id,
    title: parsed.data.title,
    description: parsed.data.description,
    initiatorId: c.get("userId"),
    targetProjectId: parsed.data.targetProjectId,
    relayPath: parsed.data.relayPath,
  });

  // Create merit event for request initiation
  await neo4jQueries.createMeritEvent({
    id: crypto.randomUUID(),
    projectId: parsed.data.targetProjectId ?? id,
    userId: c.get("userId"),
    role: "request_initiator",
    action: "initiated_request",
  });

  return c.json({ success: true, data: { id } }, 201);
});

requestRoutes.get("/:id/steps", async (c) => {
  const steps = await neo4jQueries.getRelaySteps(c.req.param("id"));
  return c.json({ success: true, data: steps });
});

requestRoutes.post("/:id/consent", requireAuth, async (c) => {
  const ok = await neo4jQueries.consentRelayStep(
    c.req.param("id"),
    c.get("userId")
  );
  if (!ok) {
    return c.json({ success: false, error: "无法同意：不是你的轮次或已处理" }, 400);
  }

  // Create merit event for relay
  await neo4jQueries.createMeritEvent({
    id: crypto.randomUUID(),
    projectId: c.req.param("id"),
    userId: c.get("userId"),
    role: "relay_intermediary",
    action: "relayed",
  });

  return c.json({ success: true });
});

requestRoutes.post("/:id/reject", requireAuth, async (c) => {
  const ok = await neo4jQueries.rejectRelayStep(
    c.req.param("id"),
    c.get("userId")
  );
  if (!ok) {
    return c.json({ success: false, error: "无法拒绝" }, 400);
  }
  return c.json({ success: true });
});

// Respond to a request (multiple people can respond)
requestRoutes.post("/:id/respond", requireAuth, async (c) => {
  const body = await c.req.json() as { type: string; message: string };
  if (!body.message?.trim()) return c.json({ success: false, error: "请输入内容" }, 400);
  const resp = await neo4jQueries.addRequestResponse(
    c.req.param("id"), c.get("userId"), body.type, body.message.trim()
  );
  return c.json({ success: true, data: resp }, 201);
});

// Get all responses for a request
requestRoutes.get("/:id/responses", requireAuth, async (c) => {
  const responses = await neo4jQueries.getRequestResponses(c.req.param("id"));
  return c.json({ success: true, data: responses });
});

// Accept a specific response
requestRoutes.post("/:id/accept/:responseId", requireAuth, async (c) => {
  await neo4jQueries.acceptResponse(c.req.param("responseId"));
  return c.json({ success: true });
});

// Complete a request (only initiator)
requestRoutes.post("/:id/complete", requireAuth, async (c) => {
  const ok = await neo4jQueries.completeRequest(c.req.param("id"), c.get("userId"));
  if (!ok) return c.json({ success: false, error: "只有发起人才能完成" }, 403);
  return c.json({ success: true });
});

requestRoutes.get("/paths/:fromId/:toId", requireAuth, async (c) => {
  const paths = await neo4jQueries.findRelayPaths(
    c.req.param("fromId"),
    c.req.param("toId")
  );
  return c.json({ success: true, data: paths });
});

requestRoutes.get("/network-graph", requireAuth, async (c) => {
  const graph = await neo4jQueries.getNetworkGraph(c.get("userId"));
  return c.json({ success: true, data: graph });
});
