import { getSession } from "./client.js";

export async function seedNeo4jConstraints(): Promise<void> {
  const session = getSession();
  try {
    const constraints = [
      "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
      "CREATE CONSTRAINT circle_id IF NOT EXISTS FOR (c:Circle) REQUIRE c.id IS UNIQUE",
      "CREATE CONSTRAINT project_id IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE",
      "CREATE CONSTRAINT relationship_id IF NOT EXISTS FOR (r:Relationship) REQUIRE r.id IS UNIQUE",
      "CREATE CONSTRAINT request_id IF NOT EXISTS FOR (req:Request) REQUIRE req.id IS UNIQUE",
      "CREATE CONSTRAINT merit_event_id IF NOT EXISTS FOR (m:MeritEvent) REQUIRE m.id IS UNIQUE",
    ];
    for (const constraint of constraints) {
      await session.run(constraint);
    }

    const indexes = [
      "CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email)",
      "CREATE INDEX project_stage IF NOT EXISTS FOR (p:Project) ON (p.stage)",
      "CREATE INDEX project_region IF NOT EXISTS FOR (p:Project) ON (p.region)",
      "CREATE INDEX request_status IF NOT EXISTS FOR (r:Request) ON (r.status)",
    ];
    for (const index of indexes) {
      await session.run(index);
    }
  } finally {
    await session.close();
  }
}
