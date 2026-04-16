import { getSession } from "../client.js";

export async function createRequestNode(req: {
  id: string;
  title: string;
  description: string;
  initiatorId: string;
  targetProjectId: string | null;
  relayPath: string[];
}) {
  const session = getSession();
  try {
    await session.run(
      `CREATE (r:Request {
        id: $id, title: $title, description: $description,
        status: 'pending', createdAt: datetime(), updatedAt: datetime()
      })`,
      req
    );
    await session.run(
      `MATCH (u:User {id: $initiatorId}), (r:Request {id: $reqId})
       CREATE (u)-[:INITIATED]->(r)`,
      { initiatorId: req.initiatorId, reqId: req.id }
    );
    if (req.targetProjectId) {
      await session.run(
        `MATCH (r:Request {id: $reqId}), (p:Project {id: $projectId})
         CREATE (r)-[:TARGETS]->(p)`,
        { reqId: req.id, projectId: req.targetProjectId }
      );
    }
    for (let i = 0; i < req.relayPath.length; i++) {
      await session.run(
        `MATCH (r:Request {id: $reqId}), (u:User {id: $userId})
         CREATE (r)-[:RELAY_STEP {order: $order, status: 'pending', consentedAt: null}]->(u)`,
        { reqId: req.id, userId: req.relayPath[i], order: i + 1 }
      );
    }
    await session.run(
      `MATCH (r:Request {id: $reqId}) SET r.status = 'relaying'`,
      { reqId: req.id }
    );
  } finally {
    await session.close();
  }
}

export async function getRequestsForUser(userId: string) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId})
       OPTIONAL MATCH (u)-[:INITIATED]->(initiated:Request)
       OPTIONAL MATCH (received:Request)-[:RELAY_STEP]->(u)
       WITH collect(DISTINCT initiated) + collect(DISTINCT received) AS reqs
       UNWIND reqs AS r
       WITH DISTINCT r
       MATCH (initiator:User)-[:INITIATED]->(r)
       OPTIONAL MATCH (r)-[:TARGETS]->(p:Project)
       RETURN r { .*, initiatorId: initiator.id, initiatorName: initiator.displayName, projectName: p.name, projectId: p.id } AS request
       ORDER BY r.createdAt DESC`,
      { userId }
    );
    return result.records.map((r) => r.get("request"));
  } finally {
    await session.close();
  }
}

export async function getAllVisibleRequests(userId: string) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (me:User {id: $userId})-[:MEMBER_OF]->(c:Circle)<-[:MEMBER_OF]-(peer:User)
       WITH collect(DISTINCT peer.id) + [$userId] AS visibleUserIds
       MATCH (initiator:User)-[:INITIATED]->(r:Request)
       WHERE initiator.id IN visibleUserIds
       OPTIONAL MATCH (r)-[:TARGETS]->(p:Project)
       RETURN r { .*, initiatorId: initiator.id, initiatorName: initiator.displayName, projectName: p.name, projectId: p.id } AS request
       ORDER BY r.createdAt DESC`,
      { userId }
    );
    return result.records.map((r) => r.get("request"));
  } finally {
    await session.close();
  }
}

export async function getRelaySteps(requestId: string) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (r:Request {id: $requestId})-[s:RELAY_STEP]->(u:User)
       RETURN s { .order, .status, consentedAt: toString(s.consentedAt), userId: u.id, displayName: u.displayName } AS step
       ORDER BY s.order ASC`,
      { requestId }
    );
    return result.records.map((r) => r.get("step"));
  } finally {
    await session.close();
  }
}

export async function consentRelayStep(
  requestId: string,
  userId: string
): Promise<boolean> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (r:Request {id: $requestId})-[s:RELAY_STEP {status: 'pending'}]->(u:User {id: $userId})
       WHERE NOT EXISTS {
         MATCH (r)-[prev:RELAY_STEP]->(other:User)
         WHERE prev.order < s.order AND prev.status <> 'consented'
       }
       SET s.status = 'consented', s.consentedAt = datetime()
       RETURN s.order AS order`,
      { requestId, userId }
    );
    if (result.records.length === 0) return false;

    const pendingCheck = await session.run(
      `MATCH (r:Request {id: $requestId})-[s:RELAY_STEP {status: 'pending'}]->(u:User)
       RETURN count(s) AS pending`,
      { requestId }
    );
    const pending = pendingCheck.records[0]?.get("pending")?.toNumber() ?? 0;
    if (pending === 0) {
      await session.run(
        `MATCH (r:Request {id: $requestId}) SET r.status = 'fulfilled', r.updatedAt = datetime()`,
        { requestId }
      );
    }
    return true;
  } finally {
    await session.close();
  }
}

export async function rejectRelayStep(
  requestId: string,
  userId: string
): Promise<boolean> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (r:Request {id: $requestId})-[s:RELAY_STEP {status: 'pending'}]->(u:User {id: $userId})
       SET s.status = 'rejected'
       WITH r
       SET r.status = 'rejected', r.updatedAt = datetime()
       RETURN r.id AS id`,
      { requestId, userId }
    );
    return result.records.length > 0;
  } finally {
    await session.close();
  }
}
