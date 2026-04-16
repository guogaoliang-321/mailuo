import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import { nanoid } from "nanoid";
import neo4j from "neo4j-driver";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://meridian:meridian_dev_password@localhost:5432/meridian";

async function seed() {
  const sql = postgres(DATABASE_URL);

  // Check if admin already exists
  const existing = await sql`SELECT id FROM users WHERE email = '354610696@qq.com'`;
  if (existing.length > 0) {
    console.log("[seed] Admin already exists, skipping");
    await sql.end();
    return;
  }

  const passwordHash = await hash("admin123456");
  const userId = crypto.randomUUID();

  // Create admin user
  await sql`
    INSERT INTO users (id, email, display_name, password_hash, role)
    VALUES (${userId}, '354610696@qq.com', '郭高亮', ${passwordHash}, 'admin')
  `;
  console.log("[seed] Admin user created: 354610696@qq.com / admin123456");

  // Create initial invite code
  const inviteCode = nanoid(12);
  await sql`
    INSERT INTO invite_codes (code, created_by, max_uses, expires_at)
    VALUES (${inviteCode}, ${userId}, 10, NOW() + INTERVAL '30 days')
  `;
  console.log(`[seed] Invite code created: ${inviteCode} (10 uses, 30 days)`);

  // Create user node in Neo4j
  const driver = neo4j.driver(
    process.env.NEO4J_URI ?? "bolt://localhost:7687",
    neo4j.auth.basic(
      process.env.NEO4J_USER ?? "neo4j",
      process.env.NEO4J_PASSWORD ?? "meridian_dev_password"
    )
  );
  const session = driver.session();
  try {
    await session.run(
      `CREATE (u:User {id: $id, displayName: $name, email: $email, domainTags: $tags})`,
      {
        id: userId,
        name: "郭高亮",
        email: "354610696@qq.com",
        tags: ["医疗建筑", "建筑设计"],
      }
    );
    console.log("[seed] Neo4j user node created");
  } finally {
    await session.close();
    await driver.close();
  }

  await sql.end();
  console.log("[seed] Done!");
}

seed().catch(console.error);
