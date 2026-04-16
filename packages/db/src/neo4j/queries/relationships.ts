import { getSession } from "../client.js";

export async function createRelationshipNode(rel: {
  id: string;
  ownerId: string;
  alias: string;
  domainTags: string[];
  levelTags: string[];
  closeness: number;
  visibility: string;
  designatedViewerIds: string[];
  circleId: string | null;
  notes: string;
}) {
  const session = getSession();
  try {
    await session.run(
      `CREATE (r:Relationship {
        id: $id, alias: $alias, domainTags: $domainTags, levelTags: $levelTags,
        closeness: $closeness, visibility: $visibility,
        notes: $notes, createdAt: datetime(), updatedAt: datetime()
      })`,
      rel
    );
    await session.run(
      `MATCH (u:User {id: $ownerId}), (r:Relationship {id: $relId})
       CREATE (u)-[:OWNS_RELATIONSHIP]->(r)`,
      { ownerId: rel.ownerId, relId: rel.id }
    );
    if (rel.circleId) {
      await session.run(
        `MATCH (c:Circle {id: $circleId}), (r:Relationship {id: $relId})
         CREATE (c)-[:CONTAINS]->(r)`,
        { circleId: rel.circleId, relId: rel.id }
      );
    }
    for (const viewerId of rel.designatedViewerIds) {
      await session.run(
        `MATCH (u:User {id: $viewerId}), (r:Relationship {id: $relId})
         CREATE (u)-[:CAN_VIEW]->(r)`,
        { viewerId, relId: rel.id }
      );
    }
  } finally {
    await session.close();
  }
}

export async function getVisibleRelationships(userId: string) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId})
       // 自己拥有的
       OPTIONAL MATCH (u)-[:OWNS_RELATIONSHIP]->(own:Relationship)
       // 指定可见
       OPTIONAL MATCH (u)-[:CAN_VIEW]->(designated:Relationship)
       // 圈内可见
       OPTIONAL MATCH (u)-[:MEMBER_OF]->(c:Circle)-[:CONTAINS]->(circleR:Relationship)
       WHERE circleR.visibility IN ['circle', 'fuzzy']
       WITH u, collect(DISTINCT own) + collect(DISTINCT designated) + collect(DISTINCT circleR) AS rels
       UNWIND rels AS r
       WITH DISTINCT r, u
       MATCH (owner:User)-[:OWNS_RELATIONSHIP]->(r)
       // 判断是否同圈
       OPTIONAL MATCH (u)-[:MEMBER_OF]->(sc:Circle)<-[:MEMBER_OF]-(owner)
       RETURN r { .*, ownerId: owner.id, ownerName: owner.displayName, sameCircle: count(sc) > 0 } AS relationship
       ORDER BY r.createdAt DESC`,
      { userId }
    );
    return result.records.map((r) => r.get("relationship"));
  } finally {
    await session.close();
  }
}

export async function getRelationshipById(relId: string) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (owner:User)-[:OWNS_RELATIONSHIP]->(r:Relationship {id: $relId})
       RETURN r { .*, ownerId: owner.id, ownerName: owner.displayName } AS relationship`,
      { relId }
    );
    return result.records[0]?.get("relationship") ?? null;
  } finally {
    await session.close();
  }
}
