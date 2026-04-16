import { getSession } from "../client.js";

export async function createProjectNode(project: {
  id: string;
  name: string;
  region: string;
  scale: string;
  stage: string;
  decisionMakerClue: string;
  notes: string;
  contributorId: string;
  circleId: string | null;
}) {
  const session = getSession();
  try {
    await session.run(
      `CREATE (p:Project {
        id: $id, name: $name, region: $region, scale: $scale,
        stage: $stage, decisionMakerClue: $decisionMakerClue,
        notes: $notes, createdAt: datetime(), updatedAt: datetime()
      })`,
      project
    );
    await session.run(
      `MATCH (u:User {id: $userId}), (p:Project {id: $projectId})
       CREATE (u)-[:CONTRIBUTED {at: datetime()}]->(p)`,
      { userId: project.contributorId, projectId: project.id }
    );
    if (project.circleId) {
      await session.run(
        `MATCH (c:Circle {id: $circleId}), (p:Project {id: $projectId})
         CREATE (c)-[:CONTAINS]->(p)`,
        { circleId: project.circleId, projectId: project.id }
      );
    }
  } finally {
    await session.close();
  }
}

export async function getVisibleProjects(userId: string) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId})
       OPTIONAL MATCH (u)-[:CONTRIBUTED]->(own:Project)
       OPTIONAL MATCH (u)-[:MEMBER_OF]->(c:Circle)-[:CONTAINS]->(circleP:Project)
       WITH collect(DISTINCT own) + collect(DISTINCT circleP) AS projects
       UNWIND projects AS p
       WITH DISTINCT p
       MATCH (contributor:User)-[:CONTRIBUTED]->(p)
       RETURN p { .*, contributorId: contributor.id, contributorName: contributor.displayName } AS project
       ORDER BY p.createdAt DESC`,
      { userId }
    );
    return result.records.map((r) => r.get("project"));
  } finally {
    await session.close();
  }
}

export async function getProjectById(projectId: string) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (p:Project {id: $projectId})
       MATCH (contributor:User)-[:CONTRIBUTED]->(p)
       OPTIONAL MATCH (c:Circle)-[:CONTAINS]->(p)
       RETURN p { .*, contributorId: contributor.id, contributorName: contributor.displayName, circleId: c.id } AS project`,
      { projectId }
    );
    return result.records[0]?.get("project") ?? null;
  } finally {
    await session.close();
  }
}

export async function updateProjectNode(
  projectId: string,
  updates: Record<string, unknown>
) {
  const session = getSession();
  try {
    const setClause = Object.keys(updates)
      .map((key) => `p.${key} = $${key}`)
      .join(", ");
    await session.run(
      `MATCH (p:Project {id: $projectId}) SET ${setClause}, p.updatedAt = datetime()`,
      { projectId, ...updates }
    );
  } finally {
    await session.close();
  }
}
