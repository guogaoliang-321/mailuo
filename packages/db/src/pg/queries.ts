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

// ═══ Circle Invite Codes ═══

export async function createCircleInviteCode(circleId: string, createdBy: string, code: string, maxUses = 50, expiresInDays = 30) {
  const db = getDb();
  const [row] = await db.insert(s.circleInviteCodes).values({
    circleId, code, createdBy, maxUses,
    expiresAt: new Date(Date.now() + expiresInDays * 86400000),
  }).returning();
  return row;
}

export async function getCircleInviteCodes(circleId: string) {
  const db = getDb();
  return db.select().from(s.circleInviteCodes).where(eq(s.circleInviteCodes.circleId, circleId)).orderBy(desc(s.circleInviteCodes.createdAt));
}

export async function joinCircleByCode(code: string, userId: string): Promise<{ success: boolean; error?: string; circleName?: string }> {
  const db = getDb();
  const [invite] = await db.select().from(s.circleInviteCodes).where(eq(s.circleInviteCodes.code, code)).limit(1);
  if (!invite) return { success: false, error: "邀请码无效" };
  if (invite.useCount >= invite.maxUses) return { success: false, error: "邀请码已用完" };
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return { success: false, error: "邀请码已过期" };

  // Check if already member
  const existing = await db.execute(sql`SELECT 1 FROM circle_members WHERE circle_id = ${invite.circleId} AND user_id = ${userId} LIMIT 1`);
  if (existing.length > 0) return { success: false, error: "你已经是该圈子成员" };

  // Add member
  await db.insert(s.circleMembers).values({ circleId: invite.circleId, userId, role: "member" });
  // Update use count
  await db.execute(sql`UPDATE circle_invite_codes SET use_count = use_count + 1 WHERE id = ${invite.id}`);

  const [circle] = await db.select({ name: s.circles.name }).from(s.circles).where(eq(s.circles.id, invite.circleId)).limit(1);
  return { success: true, circleName: circle?.name };
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
  // Own projects + projects whose circle_id matches + projects from users in same circles
  const rows = await db.execute(sql`
    SELECT DISTINCT p.*, u.display_name AS "contributorName"
    FROM projects p
    JOIN users u ON u.id = p.contributor_id
    WHERE p.contributor_id = ${userId}
       OR p.circle_id IN (SELECT circle_id FROM circle_members WHERE user_id = ${userId})
       OR p.contributor_id IN (
         SELECT DISTINCT cm2.user_id FROM circle_members cm1
         JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
         WHERE cm1.user_id = ${userId}
       )
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
       OR (r.visibility IN ('circle','fuzzy') AND (
            r.circle_id IN (SELECT circle_id FROM circle_members WHERE user_id = ${userId})
            OR r.owner_id IN (
              SELECT DISTINCT cm2.user_id FROM circle_members cm1
              JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
              WHERE cm1.user_id = ${userId}
            )
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

// 对接流列表：自己发的 + 圈内未解决的 + 自己参与响应且已完成的
export async function getRequestsForUser(userId: string) {
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT DISTINCT r.*,
           u.display_name AS "initiatorName",
           r.initiator_id AS "initiatorId",
           p.name AS "projectName",
           r.target_project_id AS "projectId",
           r.time_ago AS "timeAgo",
           (SELECT count(*)::int FROM request_responses WHERE request_id = r.id) AS "responseCount"
    FROM requests r
    JOIN users u ON u.id = r.initiator_id
    LEFT JOIN projects p ON p.id = r.target_project_id
    WHERE
      -- 自己发起的（所有状态都能看）
      r.initiator_id = ${userId}
      -- 圈内成员发的且未完成的
      OR (r.status IN ('pending', 'relaying') AND r.initiator_id IN (
        SELECT DISTINCT cm2.user_id FROM circle_members cm1
        JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
        WHERE cm1.user_id = ${userId}
      ))
      -- 自己参与响应且已完成的（仅参与者可见）
      OR (r.status = 'fulfilled' AND r.id IN (
        SELECT request_id FROM request_responses WHERE user_id = ${userId}
      ))
    ORDER BY r.created_at DESC
  `);
  return rows;
}

// 首页关系需求：仅显示圈内未解决的
export async function getAllVisibleRequests(userId: string) {
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT r.*,
           u.display_name AS "initiatorName",
           r.initiator_id AS "initiatorId",
           p.name AS "projectName",
           r.target_project_id AS "projectId",
           r.time_ago AS "timeAgo",
           (SELECT count(*)::int FROM request_responses WHERE request_id = r.id) AS "responseCount"
    FROM requests r
    JOIN users u ON u.id = r.initiator_id
    LEFT JOIN projects p ON p.id = r.target_project_id
    WHERE r.status IN ('pending', 'relaying')
      AND (r.initiator_id IN (
        SELECT DISTINCT cm2.user_id FROM circle_members cm1
        JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
        WHERE cm1.user_id = ${userId}
      ) OR r.initiator_id = ${userId})
    ORDER BY r.created_at DESC
  `);
  return rows;
}

// ═══ Request Responses ═══

export async function addRequestResponse(requestId: string, userId: string, type: string, message: string) {
  const db = getDb();
  const [row] = await db.insert(s.requestResponses).values({ requestId, userId, type, message }).returning();
  // Update request status to relaying
  await db.execute(sql`UPDATE requests SET status = 'relaying', updated_at = NOW() WHERE id = ${requestId} AND status = 'pending'`);
  return row;
}

export async function getRequestResponses(requestId: string) {
  const db = getDb();
  return db.execute(sql`
    SELECT rr.*, u.display_name AS "userName", rr.user_id AS "userId",
           rr.request_id AS "requestId"
    FROM request_responses rr
    JOIN users u ON u.id = rr.user_id
    WHERE rr.request_id = ${requestId}
    ORDER BY rr.created_at ASC
  `);
}

export async function acceptResponse(responseId: string) {
  const db = getDb();
  await db.execute(sql`UPDATE request_responses SET accepted = true WHERE id = ${responseId}`);
}

export async function completeRequest(requestId: string, userId: string): Promise<boolean> {
  const db = getDb();
  // Only initiator can complete
  const [req] = await db.execute(sql`SELECT initiator_id FROM requests WHERE id = ${requestId}`);
  if (!req || req.initiator_id !== userId) return false;
  await db.execute(sql`UPDATE requests SET status = 'fulfilled', updated_at = NOW() WHERE id = ${requestId}`);
  return true;
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
  if (chain.length === 0) return true;
  // Verify chain linkage (each event references previous hash)
  for (let i = 1; i < chain.length; i++) {
    const prev = chain[i - 1] as { hash: string };
    const curr = chain[i] as { prevHash: string | null };
    if (curr.prevHash !== prev.hash) return false;
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

// ═══ Comments ═══

export async function addComment(entityType: string, entityId: string, userId: string, content: string) {
  const db = getDb();
  const [row] = await db.insert(s.comments).values({ entityType, entityId, userId, content }).returning();
  return row;
}

export async function getComments(entityType: string, entityId: string) {
  const db = getDb();
  return db.execute(sql`
    SELECT c.*, u.display_name AS "userName", c.user_id AS "userId",
           c.entity_type AS "entityType", c.entity_id AS "entityId"
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.entity_type = ${entityType} AND c.entity_id = ${entityId}
    ORDER BY c.created_at ASC
  `);
}

// ═══ Circle Messages ═══

export async function addCircleMessage(circleId: string, userId: string, content: string) {
  const db = getDb();
  const [row] = await db.insert(s.circleMessages).values({ circleId, userId, content }).returning();
  return row;
}

export async function getCircleMessages(circleId: string, limit = 50) {
  const db = getDb();
  return db.execute(sql`
    SELECT m.*, u.display_name AS "userName", m.user_id AS "userId",
           m.circle_id AS "circleId"
    FROM circle_messages m JOIN users u ON u.id = m.user_id
    WHERE m.circle_id = ${circleId}
    ORDER BY m.created_at DESC
    LIMIT ${limit}
  `);
}

// ═══ Plaza Messages ═══

export async function addPlazaMessage(userId: string, content: string, type = "general") {
  const db = getDb();
  const [row] = await db.insert(s.plazaMessages).values({ userId, content, type }).returning();
  return row;
}

export async function getPlazaMessages(category = "all", limit = 40) {
  const db = getDb();
  if (category === "all") {
    return db.execute(sql`
      SELECT pm.*, u.display_name AS "userName", pm.user_id AS "userId"
      FROM plaza_messages pm
      JOIN users u ON u.id = pm.user_id
      ORDER BY pm.created_at DESC
      LIMIT ${limit}
    `);
  }
  return db.execute(sql`
    SELECT pm.*, u.display_name AS "userName", pm.user_id AS "userId"
    FROM plaza_messages pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.type = ${category}
    ORDER BY pm.created_at DESC
    LIMIT ${limit}
  `);
}

export async function addPlazaReply(messageId: string, userId: string, content: string) {
  const db = getDb();
  const [row] = await db.insert(s.plazaReplies).values({ messageId, userId, content }).returning();
  return row;
}

export async function getPlazaReplies(messageId: string) {
  const db = getDb();
  return db.execute(sql`
    SELECT r.*, u.display_name AS "userName", r.user_id AS "userId"
    FROM plaza_replies r
    JOIN users u ON u.id = r.user_id
    WHERE r.message_id = ${messageId}
    ORDER BY r.created_at DESC
    LIMIT 3
  `);
}

// Get reply counts for multiple messages at once
export async function getPlazaReplyCounts(messageIds: string[]) {
  if (messageIds.length === 0) return {};
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT message_id AS "messageId", count(*)::int AS count
    FROM plaza_replies
    WHERE message_id = ANY(${messageIds}::uuid[])
    GROUP BY message_id
  `);
  const map: Record<string, number> = {};
  for (const r of rows) map[r.messageId as string] = r.count as number;
  return map;
}

// ═══ Personal CRM: My Projects ═══

export async function getMyProjects(userId: string) {
  const db = getDb();
  return db.execute(sql`
    SELECT * FROM my_projects WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `);
}

export async function createMyProject(data: {
  userId: string; name: string; stage?: string; client?: string;
  budget?: string; region?: string; tags?: string[]; notes?: string;
  nextAction?: string; nextActionDate?: string; isShared?: boolean;
  deadline?: string; deadlineNote?: string; sharedCircleNames?: string[];
}) {
  const db = getDb();
  const [row] = await db.insert(s.myProjects).values({
    ...data,
    nextActionDate: data.nextActionDate ? new Date(data.nextActionDate) : undefined,
    deadline: data.deadline ? new Date(data.deadline) : undefined,
  }).returning();
  return row;
}

export async function updateMyProject(id: string, userId: string, data: Record<string, unknown>) {
  const db = getDb();
  const sets: string[] = [`updated_at = NOW()`];
  const strFields: Record<string, string> = {
    name: "name", stage: "stage", client: "client", budget: "budget",
    region: "region", notes: "notes", nextAction: "next_action", deadlineNote: "deadline_note",
  };
  for (const [jsKey, col] of Object.entries(strFields)) {
    if (data[jsKey] !== undefined) sets.push(`${col} = '${String(data[jsKey]).replace(/'/g, "''")}'`);
  }
  if (data.tags !== undefined) sets.push(`tags = '${JSON.stringify(data.tags)}'::jsonb`);
  if (data.sharedCircleNames !== undefined) sets.push(`shared_circle_names = '${JSON.stringify(data.sharedCircleNames)}'::jsonb`);
  if (data.nextActionDate !== undefined) {
    sets.push(data.nextActionDate ? `next_action_date = '${new Date(data.nextActionDate as string).toISOString()}'` : `next_action_date = NULL`);
  }
  if (data.deadline !== undefined) {
    sets.push(data.deadline ? `deadline = '${new Date(data.deadline as string).toISOString()}'` : `deadline = NULL`);
  }
  if (data.isShared !== undefined) sets.push(`is_shared = ${!!data.isShared}`);

  await db.execute(sql.raw(`UPDATE my_projects SET ${sets.join(", ")} WHERE id = '${id}' AND user_id = '${userId}'`));
}

export async function deleteMyProject(id: string, userId: string) {
  const db = getDb();
  await db.execute(sql`DELETE FROM my_projects WHERE id = ${id} AND user_id = ${userId}`);
}

// ═══ Personal CRM: My Contacts ═══

export async function getMyContacts(userId: string) {
  const db = getDb();
  return db.execute(sql`
    SELECT c.*,
      CASE WHEN c.reminder_days IS NOT NULL AND c.last_contacted_at IS NOT NULL
        THEN c.last_contacted_at + (c.reminder_days || ' days')::interval < NOW()
        ELSE false END AS "needsReminder",
      CASE WHEN c.next_action_date IS NOT NULL
        THEN c.next_action_date <= NOW() + INTERVAL '3 days'
        ELSE false END AS "actionSoon"
    FROM my_contacts c
    WHERE c.user_id = ${userId}
    ORDER BY
      CASE WHEN c.next_action_date IS NOT NULL AND c.next_action_date <= NOW() + INTERVAL '3 days' THEN 0 ELSE 1 END,
      c.updated_at DESC
  `);
}

export async function createMyContact(data: {
  userId: string; name: string; company?: string; title?: string;
  phone?: string; tags?: string[]; closeness?: number; notes?: string;
  nextAction?: string; nextActionDate?: string; reminderDays?: number; isShared?: boolean;
}) {
  const db = getDb();
  const [row] = await db.insert(s.myContacts).values({
    ...data,
    nextActionDate: data.nextActionDate ? new Date(data.nextActionDate) : undefined,
  }).returning();
  return row;
}

export async function updateMyContact(id: string, userId: string, data: Record<string, unknown>) {
  const db = getDb();
  // Build SET pairs safely
  const sets: string[] = [`updated_at = NOW()`];
  const allowed: Record<string, string> = {
    name: "name", company: "company", title: "title", phone: "phone",
    notes: "notes", nextAction: "next_action", sharedAlias: "shared_alias",
  };
  for (const [jsKey, col] of Object.entries(allowed)) {
    if (data[jsKey] !== undefined) sets.push(`${col} = ${sql.raw(`'${String(data[jsKey]).replace(/'/g, "''")}'`)}`);
  }
  if (data.tags !== undefined) sets.push(`tags = '${JSON.stringify(data.tags)}'::jsonb`);
  if (data.closeness !== undefined) sets.push(`closeness = ${Number(data.closeness) || 3}`);
  if (data.reminderDays !== undefined) {
    const rd = Number(data.reminderDays);
    sets.push(rd > 0 ? `reminder_days = ${rd}` : `reminder_days = NULL`);
  }
  if (data.nextActionDate !== undefined) {
    sets.push(data.nextActionDate ? `next_action_date = '${new Date(data.nextActionDate as string).toISOString()}'` : `next_action_date = NULL`);
  }
  if (data.lastContactedAt !== undefined) {
    sets.push(data.lastContactedAt ? `last_contacted_at = '${new Date(data.lastContactedAt as string).toISOString()}'` : `last_contacted_at = NULL`);
  }
  if (data.isShared !== undefined) sets.push(`is_shared = ${!!data.isShared}`);

  await db.execute(sql.raw(`UPDATE my_contacts SET ${sets.join(", ")} WHERE id = '${id}' AND user_id = '${userId}'`));
}

export async function deleteMyContact(id: string, userId: string) {
  const db = getDb();
  await db.execute(sql`DELETE FROM my_contacts WHERE id = ${id} AND user_id = ${userId}`);
}

export async function getMyContactById(id: string, userId: string) {
  const db = getDb();
  const rows = await db.execute(sql`SELECT * FROM my_contacts WHERE id = ${id} AND user_id = ${userId}`);
  return rows[0] ?? null;
}

// ═══ Contact Logs ═══

export async function addContactLog(data: {
  contactId: string; userId: string; type: string; content: string; planDate?: string;
}) {
  const db = getDb();
  const [row] = await db.insert(s.contactLogs).values({
    ...data,
    planDate: data.planDate ? new Date(data.planDate) : undefined,
  }).returning();
  // Update last contacted time
  if (data.type !== "plan") {
    await db.execute(sql`UPDATE my_contacts SET last_contacted_at = NOW(), updated_at = NOW() WHERE id = ${data.contactId}`);
  }
  return row;
}

export async function getContactLogs(contactId: string) {
  const db = getDb();
  return db.execute(sql`
    SELECT * FROM contact_logs WHERE contact_id = ${contactId} ORDER BY created_at DESC
  `);
}

export async function markPlanDone(logId: string, userId: string) {
  const db = getDb();
  await db.execute(sql`UPDATE contact_logs SET plan_done = true WHERE id = ${logId} AND user_id = ${userId}`);
}

// ═══ Reminders (for homepage) ═══

export async function getUpcomingReminders(userId: string) {
  const db = getDb();
  // Contacts needing attention: overdue plans + reminder cycles
  return db.execute(sql`
    SELECT c.id, c.name, c.company, c.title, c.next_action, c.next_action_date,
           c.reminder_days, c.last_contacted_at, c.tags,
           CASE WHEN c.next_action_date IS NOT NULL AND c.next_action_date <= NOW()
             THEN 'overdue'
             WHEN c.next_action_date IS NOT NULL AND c.next_action_date <= NOW() + INTERVAL '3 days'
             THEN 'upcoming'
             WHEN c.reminder_days IS NOT NULL AND c.last_contacted_at IS NOT NULL
               AND c.last_contacted_at + (c.reminder_days || ' days')::interval < NOW()
             THEN 'cycle_due'
             ELSE 'ok' END AS "urgency"
    FROM my_contacts c
    WHERE c.user_id = ${userId}
      AND (
        (c.next_action_date IS NOT NULL AND c.next_action_date <= NOW() + INTERVAL '3 days')
        OR (c.reminder_days IS NOT NULL AND c.last_contacted_at IS NOT NULL
            AND c.last_contacted_at + (c.reminder_days || ' days')::interval < NOW())
      )
    ORDER BY
      CASE WHEN c.next_action_date <= NOW() THEN 0 ELSE 1 END,
      c.next_action_date ASC NULLS LAST
  `);
}

// ═══ User Tag History (WeChat-style) ═══

export async function getUserTags(userId: string): Promise<string[]> {
  const db = getDb();
  // Collect all tags from user's contacts + relationships
  const rows = await db.execute(sql`
    SELECT DISTINCT tag FROM (
      SELECT jsonb_array_elements_text(tags) AS tag FROM my_contacts WHERE user_id = ${userId}
      UNION ALL
      SELECT jsonb_array_elements_text(tags) AS tag FROM my_projects WHERE user_id = ${userId}
      UNION ALL
      SELECT jsonb_array_elements_text(domain_tags) AS tag FROM relationships WHERE owner_id = ${userId}
    ) t
    WHERE tag IS NOT NULL AND tag <> ''
    ORDER BY tag
  `);
  return rows.map((r) => r.tag as string);
}
