import { eq, and, desc, sql, inArray, or, ne } from "drizzle-orm";
import { createHash } from "node:crypto";
import { getDb } from "./client.js";
import * as s from "./schema.js";

// ═══ Circles ═══

export async function createCircleNode(circle: { id: string; name: string; description: string; createdBy: string }) {
  const db = getDb();
  await db.insert(s.circles).values(circle);
  await db.insert(s.circleMembers).values({ circleId: circle.id, userId: circle.createdBy, role: "admin" });
}

export async function addCircleMember(circleId: string, userId: string) {
  const db = getDb();
  await db.insert(s.circleMembers).values({ circleId, userId, role: "member" }).onConflictDoNothing();
}

export async function removeCircleMember(circleId: string, userId: string) {
  const db = getDb();
  await db.delete(s.circleMembers).where(and(eq(s.circleMembers.circleId, circleId), eq(s.circleMembers.userId, userId)));
}

export async function getUserCircles(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: s.circles.id,
      name: s.circles.name,
      description: s.circles.description,
      createdBy: s.circles.createdBy,
      createdAt: s.circles.createdAt,
      myRole: s.circleMembers.role,
    })
    .from(s.circleMembers)
    .innerJoin(s.circles, eq(s.circles.id, s.circleMembers.circleId))
    .where(eq(s.circleMembers.userId, userId))
    .orderBy(desc(s.circles.createdAt));
  return rows;
}

export async function getCircleMembers(circleId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: s.users.id,
      displayName: s.users.displayName,
      role: s.circleMembers.role,
      joinedAt: s.circleMembers.joinedAt,
    })
    .from(s.circleMembers)
    .innerJoin(s.users, eq(s.users.id, s.circleMembers.userId))
    .where(eq(s.circleMembers.circleId, circleId))
    .orderBy(s.circleMembers.joinedAt);
  return rows;
}

export async function checkSameCircle(userIdA: string, userIdB: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT 1 FROM circle_members a
    JOIN circle_members b ON a.circle_id = b.circle_id
    WHERE a.user_id = ${userIdA} AND b.user_id = ${userIdB}
    LIMIT 1
  `);
  return rows.length > 0;
}

// ═══ Projects ═══

export async function createProjectNode(project: {
  id: string; name: string; region: string; scale: string; stage: string;
  decisionMakerClue: string; notes: string; contributorId: string; circleId: string | null;
}) {
  const db = getDb();
  await db.insert(s.projects).values(project);
}

export async function getVisibleProjects(userId: string) {
  const db = getDb();
  // Own projects + projects in circles user belongs to
  const rows = await db.execute(sql`
    SELECT DISTINCT p.*, u.display_name AS "contributorName"
    FROM projects p
    JOIN users u ON u.id = p.contributor_id
    WHERE p.contributor_id = ${userId}
       OR p.circle_id IN (SELECT circle_id FROM circle_members WHERE user_id = ${userId})
    ORDER BY p.created_at DESC
  `);
  return rows;
}

export async function getProjectById(projectId: string) {
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT p.*, u.display_name AS "contributorName",
           p.contributor_id AS "contributorId",
           p.decision_maker_clue AS "decisionMakerClue",
           p.circle_id AS "circleId"
    FROM projects p
    JOIN users u ON u.id = p.contributor_id
    WHERE p.id = ${projectId}
  `);
  return rows[0] ?? null;
}

export async function updateProjectNode(projectId: string, updates: Record<string, unknown>) {
  const db = getDb();
  const allowed = ["name", "region", "scale", "stage", "decisionMakerClue", "notes"];
  const vals: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of allowed) {
    if (updates[k] !== undefined) {
      const col = k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
      vals[col] = updates[k];
    }
  }
  await db.update(s.projects).set(vals).where(eq(s.projects.id, projectId));
}

// ═══ Relationships ═══

export async function createRelationshipNode(rel: {
  id: string; ownerId: string; alias: string; domainTags: string[]; levelTags: string[];
  closeness: number; visibility: string; designatedViewerIds: string[];
  circleId: string | null; notes: string;
}) {
  const db = getDb();
  await db.insert(s.relationships).values(rel);
}

export async function getVisibleRelationships(userId: string) {
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT r.*,
           u.display_name AS "ownerName",
           r.owner_id AS "ownerId",
           r.domain_tags AS "domainTags",
           r.level_tags AS "levelTags",
           r.designated_viewer_ids AS "designatedViewerIds",
           CASE WHEN EXISTS (
             SELECT 1 FROM circle_members a JOIN circle_members b ON a.circle_id = b.circle_id
             WHERE a.user_id = ${userId} AND b.user_id = r.owner_id
           ) THEN true ELSE false END AS "sameCircle"
    FROM relationships r
    JOIN users u ON u.id = r.owner_id
    WHERE r.owner_id = ${userId}
       OR (r.visibility = 'designated' AND r.designated_viewer_ids::jsonb @> ${JSON.stringify([userId])}::jsonb)
       OR (r.visibility IN ('circle','fuzzy') AND r.circle_id IN (
            SELECT circle_id FROM circle_members WHERE user_id = ${userId}
          ))
    ORDER BY r.created_at DESC
  `);
  return rows;
}

export async function getRelationshipById(relId: string) {
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT r.*, u.display_name AS "ownerName", r.owner_id AS "ownerId",
           r.domain_tags AS "domainTags", r.level_tags AS "levelTags"
    FROM relationships r JOIN users u ON u.id = r.owner_id
    WHERE r.id = ${relId}
  `);
  return rows[0] ?? null;
}

// ═══ Requests ═══

export async function createRequestNode(req: {
  id: string; title: string; description: string; initiatorId: string;
  targetProjectId: string | null; relayPath: string[];
}) {
  const db = getDb();
  await db.insert(s.requests).values({
    id: req.id, title: req.title, description: req.description,
    initiatorId: req.initiatorId, targetProjectId: req.targetProjectId,
    status: req.relayPath.length > 0 ? "relaying" : "pending",
  });
  for (let i = 0; i < req.relayPath.length; i++) {
    await db.insert(s.relaySteps).values({
      requestId: req.id, userId: req.relayPath[i], stepOrder: i + 1, status: "pending",
    });
  }
}

export async function getRequestsForUser(userId: string) {
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT DISTINCT r.*,
           u.display_name AS "initiatorName",
           r.initiator_id AS "initiatorId",
           p.name AS "projectName",
           r.target_project_id AS "projectId",
           r.time_ago AS "timeAgo"
    FROM requests r
    JOIN users u ON u.id = r.initiator_id
    LEFT JOIN projects p ON p.id = r.target_project_id
    WHERE r.initiator_id = ${userId}
       OR r.id IN (SELECT request_id FROM relay_steps WHERE user_id = ${userId})
    ORDER BY r.created_at DESC
  `);
  return rows;
}

export async function getAllVisibleRequests(userId: string) {
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT r.*,
           u.display_name AS "initiatorName",
           r.initiator_id AS "initiatorId",
           p.name AS "projectName",
           r.target_project_id AS "projectId",
           r.time_ago AS "timeAgo"
    FROM requests r
    JOIN users u ON u.id = r.initiator_id
    LEFT JOIN projects p ON p.id = r.target_project_id
    WHERE r.initiator_id IN (
      SELECT DISTINCT cm2.user_id FROM circle_members cm1
      JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
      WHERE cm1.user_id = ${userId}
    ) OR r.initiator_id = ${userId}
    ORDER BY r.created_at DESC
  `);
  return rows;
}

export async function getRelaySteps(requestId: string) {
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT rs.step_order AS "order", rs.status, rs.consented_at AS "consentedAt",
           rs.user_id AS "userId", u.display_name AS "displayName"
    FROM relay_steps rs
    JOIN users u ON u.id = rs.user_id
    WHERE rs.request_id = ${requestId}
    ORDER BY rs.step_order
  `);
  return rows;
}

export async function consentRelayStep(requestId: string, userId: string): Promise<boolean> {
  const db = getDb();
  // Check: this user has a pending step and all previous steps are consented
  const rows = await db.execute(sql`
    UPDATE relay_steps SET status = 'consented', consented_at = NOW()
    WHERE request_id = ${requestId} AND user_id = ${userId} AND status = 'pending'
      AND NOT EXISTS (
        SELECT 1 FROM relay_steps prev
        WHERE prev.request_id = ${requestId} AND prev.step_order < relay_steps.step_order AND prev.status <> 'consented'
      )
    RETURNING step_order
  `);
  if (rows.length === 0) return false;
  // Check if all steps are done
  const pending = await db.execute(sql`
    SELECT 1 FROM relay_steps WHERE request_id = ${requestId} AND status = 'pending' LIMIT 1
  `);
  if (pending.length === 0) {
    await db.execute(sql`UPDATE requests SET status = 'fulfilled', updated_at = NOW() WHERE id = ${requestId}`);
  }
  return true;
}

export async function rejectRelayStep(requestId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.execute(sql`
    UPDATE relay_steps SET status = 'rejected' WHERE request_id = ${requestId} AND user_id = ${userId} AND status = 'pending' RETURNING 1
  `);
  if (rows.length === 0) return false;
  await db.execute(sql`UPDATE requests SET status = 'rejected', updated_at = NOW() WHERE id = ${requestId}`);
  return true;
}

// ═══ Paths / Network Graph ═══

export async function findRelayPaths(fromUserId: string, toUserId: string) {
  const db = getDb();
  // Find users who share circles as intermediaries
  const rows = await db.execute(sql`
    WITH shared AS (
      SELECT DISTINCT cm2.user_id, u.display_name
      FROM circle_members cm1
      JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
      JOIN users u ON u.id = cm2.user_id
      WHERE cm1.user_id = ${fromUserId} AND cm2.user_id <> ${fromUserId}
    )
    SELECT user_id AS "userId", display_name AS "displayName" FROM shared
    LIMIT 10
  `);
  return [{ users: rows, pathLength: rows.length }];
}

export async function getNetworkGraph(userId: string) {
  const db = getDb();
  // Structure: me (ring 0) → circles (ring 1) → members (ring 2)
  const me = await db.execute(sql`SELECT id, display_name AS "displayName" FROM users WHERE id = ${userId}`);
  if (me.length === 0) return { nodes: [], links: [] };

  const circlesRows = await db.execute(sql`
    SELECT c.id, c.name FROM circles c
    JOIN circle_members cm ON cm.circle_id = c.id
    WHERE cm.user_id = ${userId}
  `);

  type GNode = { id: string; label: string; ring: number; type: "user" | "circle" };
  const nodes: GNode[] = [];
  const links: Array<{ source: string; target: string }> = [];
  const seen = new Set<string>();

  nodes.push({ id: me[0].id as string, label: me[0].displayName as string, ring: 0, type: "user" });
  seen.add(me[0].id as string);

  for (const c of circlesRows) {
    const cid = c.id as string;
    if (!seen.has(cid)) {
      nodes.push({ id: cid, label: c.name as string, ring: 1, type: "circle" });
      seen.add(cid);
    }
    links.push({ source: me[0].id as string, target: cid });

    const members = await db.execute(sql`
      SELECT u.id, u.display_name AS "displayName"
      FROM circle_members cm JOIN users u ON u.id = cm.user_id
      WHERE cm.circle_id = ${cid} AND cm.user_id <> ${userId}
    `);
    for (const m of members) {
      const mid = m.id as string;
      if (!seen.has(mid)) {
        nodes.push({ id: mid, label: m.displayName as string, ring: 2, type: "user" });
        seen.add(mid);
      }
      links.push({ source: cid, target: mid });
    }
  }
  return { nodes, links };
}

// ═══ Merit ═══

function computeHash(prevHash: string | null, action: string, timestamp: string): string {
  return createHash("sha256").update(`${prevHash ?? "GENESIS"}:${action}:${timestamp}`).digest("hex");
}

export async function createMeritEvent(event: {
  id: string; projectId: string; userId: string; role: string; action: string;
}) {
  const db = getDb();
  const prev = await db.execute(sql`
    SELECT hash FROM merit_events WHERE project_id = ${event.projectId} ORDER BY created_at DESC LIMIT 1
  `);
  const prevHash = (prev[0]?.hash as string) ?? null;
  const ts = new Date().toISOString();
  const hash = computeHash(prevHash, event.action, ts);
  await db.insert(s.meritEvents).values({ ...event, hash, prevHash });
}

export async function getMeritChain(projectId: string) {
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT me.*, u.display_name AS "userName", me.user_id AS "userId",
           me.prev_hash AS "prevHash", me.project_id AS "projectId",
           me.created_at AS "timestamp"
    FROM merit_events me
    JOIN users u ON u.id = me.user_id
    WHERE me.project_id = ${projectId}
    ORDER BY me.created_at ASC
  `);
  return rows;
}

export async function verifyMeritChain(projectId: string): Promise<boolean> {
  const chain = await getMeritChain(projectId);
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i] as { prevHash: string | null; action: string; timestamp: string; hash: string };
    const expected = computeHash(e.prevHash, e.action, new Date(e.timestamp).toISOString());
    if (e.hash !== expected) return false;
  }
  return true;
}

// ═══ Recommendations ═══

export async function getMatchingRelationships(projectId: string, userId: string) {
  // Simple matching based on shared circle
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT r.*, u.display_name AS "ownerName", r.owner_id AS "ownerId",
           r.domain_tags AS "domainTags", r.level_tags AS "levelTags", 1 AS "matchScore"
    FROM relationships r
    JOIN users u ON u.id = r.owner_id
    WHERE r.circle_id IN (SELECT circle_id FROM circle_members WHERE user_id = ${userId})
      AND r.owner_id <> ${userId}
    LIMIT 10
  `);
  return rows;
}

export async function getRecommendedProjects(userId: string) {
  return getVisibleProjects(userId);
}

export async function getDashboardStats(userId: string) {
  const db = getDb();
  const [pCount] = await db.execute(sql`SELECT count(*)::int AS c FROM projects WHERE contributor_id = ${userId} OR circle_id IN (SELECT circle_id FROM circle_members WHERE user_id = ${userId})`);
  const [cCount] = await db.execute(sql`SELECT count(*)::int AS c FROM circle_members WHERE user_id = ${userId}`);
  const [rCount] = await db.execute(sql`SELECT count(*)::int AS c FROM requests WHERE initiator_id = ${userId}`);
  return { projects: pCount?.c ?? 0, circles: cCount?.c ?? 0, requests: rCount?.c ?? 0 };
}
