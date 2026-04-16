import { createHash } from "node:crypto";
import { getSession } from "../client.js";

function computeHash(prevHash: string | null, action: string, timestamp: string): string {
  const data = `${prevHash ?? "GENESIS"}:${action}:${timestamp}`;
  return createHash("sha256").update(data).digest("hex");
}

export async function createMeritEvent(event: {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  action: string;
}) {
  const session = getSession();
  try {
    const prevResult = await session.run(
      `MATCH (m:MeritEvent)-[:PART_OF_CHAIN]->(p:Project {id: $projectId})
       RETURN m.hash AS hash, m.id AS id
       ORDER BY m.timestamp DESC
       LIMIT 1`,
      { projectId: event.projectId }
    );
    const prevHash = prevResult.records[0]?.get("hash") ?? null;
    const prevId = prevResult.records[0]?.get("id") ?? null;
    const timestamp = new Date().toISOString();
    const hash = computeHash(prevHash, event.action, timestamp);

    await session.run(
      `CREATE (m:MeritEvent {
        id: $id, action: $action, role: $role,
        timestamp: datetime($timestamp), hash: $hash, prevHash: $prevHash
      })`,
      { ...event, timestamp, hash, prevHash }
    );
    await session.run(
      `MATCH (m:MeritEvent {id: $eventId}), (p:Project {id: $projectId})
       CREATE (m)-[:PART_OF_CHAIN]->(p)`,
      { eventId: event.id, projectId: event.projectId }
    );
    await session.run(
      `MATCH (u:User {id: $userId}), (m:MeritEvent {id: $eventId})
       CREATE (u)-[:PERFORMED {role: $role}]->(m)`,
      { userId: event.userId, eventId: event.id, role: event.role }
    );
    if (prevId) {
      await session.run(
        `MATCH (curr:MeritEvent {id: $currId}), (prev:MeritEvent {id: $prevId})
         CREATE (curr)-[:FOLLOWS]->(prev)`,
        { currId: event.id, prevId }
      );
    }
  } finally {
    await session.close();
  }
}

export async function getMeritChain(projectId: string) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (m:MeritEvent)-[:PART_OF_CHAIN]->(p:Project {id: $projectId})
       MATCH (u:User)-[:PERFORMED]->(m)
       RETURN m { .*, userId: u.id, userName: u.displayName, timestamp: toString(m.timestamp) } AS event
       ORDER BY m.timestamp ASC`,
      { projectId }
    );
    return result.records.map((r) => r.get("event"));
  } finally {
    await session.close();
  }
}

export async function verifyMeritChain(projectId: string): Promise<boolean> {
  const chain = await getMeritChain(projectId);
  for (let i = 0; i < chain.length; i++) {
    const event = chain[i];
    const expectedHash = computeHash(
      event.prevHash,
      event.action,
      event.timestamp
    );
    if (event.hash !== expectedHash) return false;
  }
  return true;
}
