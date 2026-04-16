import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import neo4j from "neo4j-driver";

const sql = postgres(process.env.DATABASE_URL ?? "postgresql://meridian:meridian_dev_password@localhost:5432/meridian");
const driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "meridian_dev_password"));

const extraUsers = [
  // 西安医疗圈 +4
  { name: "马晓东", email: "maxiaodong@test.com", tags: ["医疗规划", "公共卫生"], circle: "西安医疗圈" },
  { name: "韩雪梅", email: "hanxuemei@test.com", tags: ["护理管理", "医院运营"], circle: "西安医疗圈" },
  { name: "贾卫民", email: "jiaweimin@test.com", tags: ["医疗器械", "康复工程"], circle: "西安医疗圈" },
  { name: "吴晓红", email: "wuxiaohong@test.com", tags: ["妇幼保健", "医院设计"], circle: "西安医疗圈" },
  // 地产老友会 +4
  { name: "黄志强", email: "huangzhiqiang@test.com", tags: ["商业地产", "城市更新"], circle: "地产老友会" },
  { name: "林嘉伟", email: "linjiawei@test.com", tags: ["住宅开发", "景观设计"], circle: "地产老友会" },
  { name: "徐国栋", email: "xuguodong@test.com", tags: ["工程造价", "招投标"], circle: "地产老友会" },
  { name: "方丽娟", email: "fanglijuan@test.com", tags: ["室内设计", "精装修"], circle: "地产老友会" },
  // 建筑同学会 +4
  { name: "钱学斌", email: "qianxuebin@test.com", tags: ["结构设计", "抗震"], circle: "建筑同学会" },
  { name: "宋雅芝", email: "songyazhi@test.com", tags: ["绿色建筑", "节能"], circle: "建筑同学会" },
  { name: "唐振华", email: "tangzhenhua@test.com", tags: ["城市设计", "TOD"], circle: "建筑同学会" },
  { name: "曹文静", email: "caowenjing@test.com", tags: ["建筑历史", "遗产保护"], circle: "建筑同学会" },
  // 政商联络组 +4
  { name: "郑凯文", email: "zhengkaiwen@test.com", tags: ["招商引资", "产业政策"], circle: "政商联络组" },
  { name: "潘秀兰", email: "panxiulan@test.com", tags: ["财税咨询", "审计"], circle: "政商联络组" },
  { name: "蒋德龙", email: "jiangdelong@test.com", tags: ["法律顾问", "PPP项目"], circle: "政商联络组" },
  { name: "董明远", email: "dongmingyuan@test.com", tags: ["国企改革", "混改"], circle: "政商联络组" },
];

async function seed() {
  console.log("[extra] 每个圈子新增 4 个成员...\n");

  const [admin] = await sql`SELECT id FROM users WHERE email = '354610696@qq.com'`;
  const passwordHash = await hash("test123456");

  // 获取圈子 ID 映射
  const session = driver.session();
  const circleResult = await session.run("MATCH (c:Circle) RETURN c.id AS id, c.name AS name");
  const circleMap = new Map<string, string>();
  for (const r of circleResult.records) {
    circleMap.set(r.get("name") as string, r.get("id") as string);
  }
  await session.close();

  for (const u of extraUsers) {
    // PG: 创建用户
    const [existing] = await sql`SELECT id FROM users WHERE email = ${u.email}`;
    let userId: string;
    if (existing) {
      userId = existing.id;
      console.log(`  跳过已存在: ${u.name}`);
    } else {
      userId = crypto.randomUUID();
      await sql`
        INSERT INTO users (id, email, display_name, password_hash, role, invited_by)
        VALUES (${userId}, ${u.email}, ${u.name}, ${passwordHash}, 'member', ${admin.id})
      `;
    }

    // Neo4j: 创建用户节点 + 加入圈子
    const s = driver.session();
    try {
      await s.run(
        `MERGE (u:User {id: $id})
         ON CREATE SET u.displayName = $name, u.email = $email, u.domainTags = $tags`,
        { id: userId, name: u.name, email: u.email, tags: u.tags }
      );

      const circleId = circleMap.get(u.circle);
      if (circleId) {
        await s.run(
          `MATCH (u:User {id: $userId}), (c:Circle {id: $circleId})
           MERGE (u)-[r:MEMBER_OF]->(c)
           ON CREATE SET r.role = 'member', r.joinedAt = datetime()`,
          { userId, circleId }
        );
      }
      console.log(`  + ${u.name} → ${u.circle}`);
    } finally {
      await s.close();
    }
  }

  // 验证
  const vs = driver.session();
  const vr = await vs.run(`
    MATCH (c:Circle)<-[:MEMBER_OF]-(u:User)
    RETURN c.name AS circle, count(u) AS members
    ORDER BY c.name
  `);
  console.log("\n圈子成员统计：");
  for (const r of vr.records) {
    console.log(`  ${r.get("circle")}: ${r.get("members").toNumber()} 人`);
  }
  await vs.close();

  await driver.close();
  await sql.end();
  console.log("\n[extra] 完成！");
}

seed().catch(console.error);
