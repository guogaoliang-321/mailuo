import { Hono } from "hono";
import { neo4jQueries } from "@meridian/db";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

export const myRoutes = new Hono<AppEnv>();

myRoutes.use("*", requireAuth);

// ── My Projects ──

myRoutes.get("/projects", async (c) => {
  const projects = await neo4jQueries.getMyProjects(c.get("userId"));
  return c.json({ success: true, data: projects });
});

myRoutes.post("/projects", async (c) => {
  const body = await c.req.json();
  const project = await neo4jQueries.createMyProject({ userId: c.get("userId"), ...body });
  return c.json({ success: true, data: project }, 201);
});

myRoutes.patch("/projects/:id", async (c) => {
  await neo4jQueries.updateMyProject(c.req.param("id"), c.get("userId"), await c.req.json());
  return c.json({ success: true });
});

myRoutes.delete("/projects/:id", async (c) => {
  await neo4jQueries.deleteMyProject(c.req.param("id"), c.get("userId"));
  return c.json({ success: true });
});

// Share private project to circle pool
myRoutes.post("/projects/:id/share", async (c) => {
  const body = await c.req.json() as { circleId?: string };
  const userId = c.get("userId");
  const { getDb } = await import("@meridian/db");
  const { sql } = await import("drizzle-orm");
  const db = getDb();

  // Get private project
  const [mp] = await db.execute(sql`SELECT * FROM my_projects WHERE id = ${c.req.param("id")} AND user_id = ${userId}`);
  if (!mp) return c.json({ success: false, error: "项目不存在" }, 404);

  // Create in shared pool
  const sharedId = crypto.randomUUID();
  await neo4jQueries.createProjectNode({
    id: sharedId,
    name: mp.name as string,
    region: (mp.region as string) ?? "",
    scale: (mp.budget as string) ?? "",
    stage: (mp.stage as string) ?? "prospecting",
    decisionMakerClue: "",
    notes: (mp.notes as string) ?? "",
    contributorId: userId,
    circleId: body.circleId ?? null,
  });

  // Mark as shared
  await db.execute(sql`UPDATE my_projects SET is_shared = true, updated_at = NOW() WHERE id = ${c.req.param("id")}`);

  return c.json({ success: true, data: { sharedId } });
});

// ── My Contacts ──

myRoutes.get("/contacts", async (c) => {
  const contacts = await neo4jQueries.getMyContacts(c.get("userId"));
  return c.json({ success: true, data: contacts });
});

myRoutes.get("/contacts/:id", async (c) => {
  const contact = await neo4jQueries.getMyContactById(c.req.param("id"), c.get("userId"));
  if (!contact) return c.json({ success: false, error: "联系人不存在" }, 404);
  return c.json({ success: true, data: contact });
});

myRoutes.post("/contacts", async (c) => {
  const body = await c.req.json();
  const contact = await neo4jQueries.createMyContact({ userId: c.get("userId"), ...body });
  return c.json({ success: true, data: contact }, 201);
});

myRoutes.patch("/contacts/:id", async (c) => {
  await neo4jQueries.updateMyContact(c.req.param("id"), c.get("userId"), await c.req.json());
  return c.json({ success: true });
});

myRoutes.delete("/contacts/:id", async (c) => {
  await neo4jQueries.deleteMyContact(c.req.param("id"), c.get("userId"));
  return c.json({ success: true });
});

// Share private contact to circle pool (as relationship, with alias)
myRoutes.post("/contacts/:id/share", async (c) => {
  const body = await c.req.json() as { circleId?: string; alias?: string; visibility?: string };
  const userId = c.get("userId");
  const { getDb } = await import("@meridian/db");
  const { sql } = await import("drizzle-orm");
  const db = getDb();

  const [mc] = await db.execute(sql`SELECT * FROM my_contacts WHERE id = ${c.req.param("id")} AND user_id = ${userId}`);
  if (!mc) return c.json({ success: false, error: "联系人不存在" }, 404);

  const sharedId = crypto.randomUUID();
  await neo4jQueries.createRelationshipNode({
    id: sharedId,
    ownerId: userId,
    alias: body.alias ?? (mc.name as string),
    domainTags: (mc.tags as string[]) ?? [],
    levelTags: [],
    closeness: (mc.closeness as number) ?? 3,
    visibility: body.visibility ?? "circle",
    designatedViewerIds: [],
    circleId: body.circleId ?? null,
    notes: "",
  });

  await db.execute(sql`UPDATE my_contacts SET is_shared = true, shared_alias = ${body.alias ?? mc.name}, updated_at = NOW() WHERE id = ${c.req.param("id")}`);

  return c.json({ success: true, data: { sharedId } });
});

// ── Contact Logs ──

myRoutes.get("/contacts/:id/logs", async (c) => {
  const logs = await neo4jQueries.getContactLogs(c.req.param("id"));
  return c.json({ success: true, data: logs });
});

myRoutes.post("/contacts/:id/logs", async (c) => {
  const body = await c.req.json() as { type: string; content: string; planDate?: string };
  if (!body.content?.trim()) return c.json({ success: false, error: "内容不能为空" }, 400);
  const log = await neo4jQueries.addContactLog({
    contactId: c.req.param("id"),
    userId: c.get("userId"),
    type: body.type ?? "note",
    content: body.content.trim(),
    planDate: body.planDate,
  });
  return c.json({ success: true, data: log }, 201);
});

myRoutes.post("/contacts/:id/logs/:logId/done", async (c) => {
  await neo4jQueries.markPlanDone(c.req.param("logId"), c.get("userId"));
  return c.json({ success: true });
});

// ── Reminders ──

myRoutes.get("/reminders", async (c) => {
  const reminders = await neo4jQueries.getUpcomingReminders(c.get("userId"));
  return c.json({ success: true, data: reminders });
});
