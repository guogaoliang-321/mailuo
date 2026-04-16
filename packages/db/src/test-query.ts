import neo4j from "neo4j-driver";

async function main() {
  const d = neo4j.driver(
    process.env.NEO4J_URI ?? "bolt://localhost:7687",
    neo4j.auth.basic(
      process.env.NEO4J_USER ?? "neo4j",
      process.env.NEO4J_PASSWORD ?? "meridian_dev_password"
    )
  );
  const s = d.session();

  const userId = "fb1c89d5-9e51-4667-84ed-68b930a92a09";

  // Simple test
  const r1 = await s.run("MATCH (u:User {id: $userId}) RETURN u.displayName AS name", { userId });
  console.log("User found:", r1.records[0]?.get("name"));

  // Test membership
  const r2 = await s.run("MATCH (u:User {id: $userId})-[:MEMBER_OF]->(c:Circle) RETURN c.name AS circle", { userId });
  console.log("Circles:", r2.records.map(r => r.get("circle")));

  // Test full query
  const r3 = await s.run(`
    MATCH (u:User {id: $userId})
    OPTIONAL MATCH (u)-[:CONTRIBUTED]->(own:Project)
    OPTIONAL MATCH (u)-[:MEMBER_OF]->(c:Circle)-[:CONTAINS]->(circleP:Project)
    WITH collect(DISTINCT own) + collect(DISTINCT circleP) AS projects
    UNWIND projects AS p
    WITH DISTINCT p
    MATCH (contributor:User)-[:CONTRIBUTED]->(p)
    RETURN p.name AS name, contributor.displayName AS contributor
  `, { userId });
  console.log("Projects:", r3.records.length);
  r3.records.forEach(r => console.log(" -", r.get("name"), "by", r.get("contributor")));

  await s.close();
  await d.close();
}

main().catch(console.error);
