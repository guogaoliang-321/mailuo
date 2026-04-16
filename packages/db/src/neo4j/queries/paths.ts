import { getSession } from "../client.js";

export async function findRelayPaths(
  fromUserId: string,
  toUserId: string,
  maxDepth = 6
) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (start:User {id: $fromUserId}), (end:User {id: $toUserId})
       MATCH path = shortestPath((start)-[:MEMBER_OF*..${maxDepth * 2}]-(end))
       WITH path,
            [n IN nodes(path) WHERE n:User] AS userNodes,
            [n IN nodes(path) WHERE n:Circle] AS circleNodes
       RETURN
         [u IN userNodes | u { .id, .displayName }] AS users,
         [c IN circleNodes | c { .id, .name }] AS circles,
         length(path) AS pathLength
       ORDER BY pathLength ASC
       LIMIT 3`,
      { fromUserId, toUserId }
    );
    return result.records.map((r) => ({
      users: r.get("users"),
      circles: r.get("circles"),
      pathLength: r.get("pathLength"),
    }));
  } finally {
    await session.close();
  }
}

export async function getNetworkGraph(userId: string) {
  const session = getSession();
  try {
    // Structure: me (ring 0) → circles (ring 1) → circle members (ring 2)
    const result = await session.run(
      `MATCH (me:User {id: $userId})-[:MEMBER_OF]->(c:Circle)
       OPTIONAL MATCH (c)<-[:MEMBER_OF]-(member:User)
       WHERE member.id <> $userId
       WITH me, c, collect(DISTINCT member { .id, .displayName }) AS members
       RETURN me { .id, .displayName } AS self,
              collect({ circle: c { .id, .name }, members: members }) AS circleData`,
      { userId }
    );

    const record = result.records[0];
    if (!record) return { nodes: [], links: [] };

    const self = record.get("self");
    const circleData = record.get("circleData") as Array<{
      circle: { id: string; name: string };
      members: Array<{ id: string; displayName: string }>;
    }>;

    type GNode = { id: string; label: string; ring: number; type: "user" | "circle" };
    const nodes: GNode[] = [];
    const links: Array<{ source: string; target: string }> = [];
    const seen = new Set<string>();

    // Ring 0: self
    nodes.push({ id: self.id, label: self.displayName, ring: 0, type: "user" });
    seen.add(self.id);

    for (const cd of circleData) {
      const c = cd.circle;
      // Ring 1: circle node
      if (!seen.has(c.id)) {
        nodes.push({ id: c.id, label: c.name, ring: 1, type: "circle" });
        seen.add(c.id);
      }
      // Link: me → circle
      links.push({ source: self.id, target: c.id });

      // Ring 2: member nodes
      for (const m of cd.members) {
        if (!seen.has(m.id)) {
          nodes.push({ id: m.id, label: m.displayName, ring: 2, type: "user" });
          seen.add(m.id);
        }
        // Link: circle → member
        links.push({ source: c.id, target: m.id });
      }
    }

    return { nodes, links };
  } finally {
    await session.close();
  }
}
