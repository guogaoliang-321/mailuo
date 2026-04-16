import { getSession } from "../client.js";

/**
 * 根据项目标签匹配可能有用的关系资源
 * 匹配逻辑：项目 region 或 name 关键词 与 关系的 domainTags/levelTags 交集
 */
export async function getMatchingRelationships(
  userId: string,
  projectId: string,
) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (p:Project {id: $projectId})
       MATCH (u:User {id: $userId})-[:MEMBER_OF]->(c:Circle)
       MATCH (c)-[:CONTAINS]->(r:Relationship)
       WHERE r.visibility IN ['circle', 'fuzzy']
         AND NOT (u)-[:OWNS_RELATIONSHIP]->(r)
       WITH p, r,
            [tag IN r.domainTags WHERE tag CONTAINS p.region OR p.name CONTAINS tag] AS matchedDomain,
            [tag IN r.levelTags] AS levels
       WHERE size(matchedDomain) > 0 OR size(levels) > 0
       MATCH (owner:User)-[:OWNS_RELATIONSHIP]->(r)
       RETURN r { .id, .alias, .domainTags, .levelTags, .closeness, .visibility,
                  ownerName: owner.displayName,
                  matchScore: size(matchedDomain) * 2 + size(levels) } AS recommendation
       ORDER BY recommendation.matchScore DESC
       LIMIT 5`,
      { userId, projectId },
    );
    return result.records.map((r) => r.get("recommendation"));
  } finally {
    await session.close();
  }
}

/**
 * 获取用户可能感兴趣的跨圈项目（基于用户关系的 domainTags 匹配）
 */
export async function getRecommendedProjects(userId: string) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId})-[:OWNS_RELATIONSHIP]->(r:Relationship)
       WITH u, collect(r.domainTags) AS allTags
       WITH u, reduce(acc = [], tags IN allTags | acc + tags) AS flatTags
       WITH u, flatTags
       MATCH (u)-[:MEMBER_OF]->(c:Circle)-[:CONTAINS]->(p:Project)
       WHERE NOT (u)-[:CONTRIBUTED]->(p)
         AND p.stage IN ['prospecting', 'approved', 'bidding']
         AND any(tag IN flatTags WHERE p.region CONTAINS tag OR p.name CONTAINS tag)
       MATCH (contributor:User)-[:CONTRIBUTED]->(p)
       RETURN p { .id, .name, .region, .scale, .stage,
                  contributorName: contributor.displayName } AS project
       ORDER BY p.createdAt DESC
       LIMIT 5`,
      { userId },
    );
    return result.records.map((r) => r.get("project"));
  } finally {
    await session.close();
  }
}

/**
 * 获取仪表盘统计摘要
 */
export async function getDashboardStats(userId: string) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId})
       OPTIONAL MATCH (u)-[:CONTRIBUTED]->(p:Project)
       OPTIONAL MATCH (u)-[:OWNS_RELATIONSHIP]->(r:Relationship)
       OPTIONAL MATCH (u)-[:MEMBER_OF]->(c:Circle)
       OPTIONAL MATCH (u)-[:INITIATED]->(req:RelayRequest)
       OPTIONAL MATCH (req2:RelayRequest)-[:RELAY_STEP]->(:RelayStep {userId: $userId, status: 'pending'})
       RETURN count(DISTINCT p) AS projectCount,
              count(DISTINCT r) AS relationshipCount,
              count(DISTINCT c) AS circleCount,
              count(DISTINCT req) AS myRequestCount,
              count(DISTINCT req2) AS pendingForMe`,
      { userId },
    );
    const record = result.records[0];
    if (!record) {
      return {
        projectCount: 0,
        relationshipCount: 0,
        circleCount: 0,
        myRequestCount: 0,
        pendingForMe: 0,
      };
    }
    return {
      projectCount: record.get("projectCount").toNumber(),
      relationshipCount: record.get("relationshipCount").toNumber(),
      circleCount: record.get("circleCount").toNumber(),
      myRequestCount: record.get("myRequestCount").toNumber(),
      pendingForMe: record.get("pendingForMe").toNumber(),
    };
  } finally {
    await session.close();
  }
}
