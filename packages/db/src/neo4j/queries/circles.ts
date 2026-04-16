import { getSession } from "../client.js";

export async function createCircleNode(circle: {
  id: string;
  name: string;
  description: string;
  createdBy: string;
}) {
  const session = getSession();
  try {
    await session.run(
      `CREATE (c:Circle {id: $id, name: $name, description: $description, createdBy: $createdBy, createdAt: datetime()})`,
      circle
    );
    await session.run(
      `MATCH (u:User {id: $userId}), (c:Circle {id: $circleId})
       CREATE (u)-[:MEMBER_OF {role: 'admin', joinedAt: datetime()}]->(c)`,
      { userId: circle.createdBy, circleId: circle.id }
    );
  } finally {
    await session.close();
  }
}

export async function addCircleMember(circleId: string, userId: string) {
  const session = getSession();
  try {
    await session.run(
      `MATCH (u:User {id: $userId}), (c:Circle {id: $circleId})
       MERGE (u)-[r:MEMBER_OF]->(c)
       ON CREATE SET r.role = 'member', r.joinedAt = datetime()`,
      { userId, circleId }
    );
  } finally {
    await session.close();
  }
}

export async function removeCircleMember(circleId: string, userId: string) {
  const session = getSession();
  try {
    await session.run(
      `MATCH (u:User {id: $userId})-[r:MEMBER_OF]->(c:Circle {id: $circleId})
       DELETE r`,
      { userId, circleId }
    );
  } finally {
    await session.close();
  }
}

export async function getUserCircles(userId: string) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId})-[r:MEMBER_OF]->(c:Circle)
       RETURN c { .*, myRole: r.role } AS circle
       ORDER BY c.createdAt DESC`,
      { userId }
    );
    return result.records.map((r) => r.get("circle"));
  } finally {
    await session.close();
  }
}

export async function getCircleMembers(circleId: string) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (u:User)-[r:MEMBER_OF]->(c:Circle {id: $circleId})
       RETURN u { .id, .displayName, role: r.role, joinedAt: toString(r.joinedAt) } AS member
       ORDER BY r.joinedAt ASC`,
      { circleId }
    );
    return result.records.map((r) => r.get("member"));
  } finally {
    await session.close();
  }
}

export async function checkSameCircle(
  userIdA: string,
  userIdB: string
): Promise<boolean> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (a:User {id: $userIdA})-[:MEMBER_OF]->(c:Circle)<-[:MEMBER_OF]-(b:User {id: $userIdB})
       RETURN count(c) > 0 AS sameCircle`,
      { userIdA, userIdB }
    );
    return result.records[0]?.get("sameCircle") ?? false;
  } finally {
    await session.close();
  }
}
