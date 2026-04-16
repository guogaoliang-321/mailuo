import postgres from "postgres";
import neo4j from "neo4j-driver";

async function fix() {
  const sql = postgres(process.env.DATABASE_URL ?? "postgresql://meridian:meridian_dev_password@localhost:5432/meridian");
  const driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "meridian_dev_password"));

  const users = await sql`SELECT id, email, display_name FROM users`;
  console.log(`Found ${users.length} users in PG, syncing to Neo4j...`);

  const domainMap: Record<string, string[]> = {
    "354610696@qq.com": ["医疗建筑", "建筑设计"],
    "wangjianguo@test.com": ["地产开发", "城市规划"],
    "lisiyuan@test.com": ["医疗卫生", "公共建筑"],
    "zhangminghui@test.com": ["金融投资", "产业园区"],
    "chenwenbo@test.com": ["政府关系", "教育"],
    "liuyaqin@test.com": ["文化旅游", "博物馆"],
    "zhaopengfei@test.com": ["施工总包", "装配式建筑"],
    "sunxiaofeng@test.com": ["医院管理", "康养地产"],
    "zhouhaiyan@test.com": ["规划设计", "商业综合体"],
  };

  const session = driver.session();
  for (const u of users) {
    const tags = domainMap[u.email] ?? [];
    await session.run(
      `MERGE (u:User {id: $id})
       ON CREATE SET u.displayName = $name, u.email = $email, u.domainTags = $tags
       ON MATCH SET u.displayName = $name, u.email = $email, u.domainTags = $tags`,
      { id: u.id, name: u.display_name, email: u.email, tags }
    );
    console.log(`  ✓ ${u.display_name} (${u.email})`);
  }
  await session.close();

  // Verify
  const s2 = driver.session();
  const r = await s2.run("MATCH (u:User) RETURN count(u) AS cnt");
  console.log(`\nNeo4j now has ${r.records[0].get("cnt").toNumber()} User nodes`);
  await s2.close();
  await driver.close();
  await sql.end();
}

fix().catch(console.error);
