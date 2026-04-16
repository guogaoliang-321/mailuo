import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import neo4j from "neo4j-driver";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://meridian:meridian_dev_password@localhost:5432/meridian";

const sql = postgres(DATABASE_URL);
const driver = neo4j.driver(
  process.env.NEO4J_URI ?? "bolt://localhost:7687",
  neo4j.auth.basic(
    process.env.NEO4J_USER ?? "neo4j",
    process.env.NEO4J_PASSWORD ?? "meridian_dev_password"
  )
);

// ── 测试用户 ──
const users = [
  { name: "王建国", email: "wangjianguo@test.com", tags: ["地产开发", "城市规划"] },
  { name: "李思远", email: "lisiyuan@test.com", tags: ["医疗卫生", "公共建筑"] },
  { name: "张明辉", email: "zhangminghui@test.com", tags: ["金融投资", "产业园区"] },
  { name: "陈文博", email: "chenwenbo@test.com", tags: ["政府关系", "教育"] },
  { name: "刘雅琴", email: "liuyaqin@test.com", tags: ["文化旅游", "博物馆"] },
  { name: "赵鹏飞", email: "zhaopengfei@test.com", tags: ["施工总包", "装配式建筑"] },
  { name: "孙晓峰", email: "sunxiaofeng@test.com", tags: ["医院管理", "康养地产"] },
  { name: "周海燕", email: "zhouhaiyan@test.com", tags: ["规划设计", "商业综合体"] },
];

// ── 圈子 ──
const circles = [
  { name: "西安医疗圈", desc: "西安及周边医疗建筑领域的核心资源圈", members: [0, 1, 6] },
  { name: "地产老友会", desc: "地产开发、投资相关的老朋友们", members: [0, 2, 5, 7] },
  { name: "建筑同学会", desc: "建筑学院研究生同学", members: [1, 3, 4, 7] },
  { name: "政商联络组", desc: "政府资源与商业对接的小范围圈子", members: [2, 3] },
];

// ── 项目池 ──
const projects = [
  {
    name: "西安国际医学中心二期",
    region: "西安市高新区",
    scale: "12亿",
    stage: "approved",
    clue: "项目由高新区管委会主导，甲方为XX医疗集团",
    notes: "二期规划含500床位综合医院+康复中心，已通过规委会审批",
    contributorIdx: 1,
    circleIdx: 0,
  },
  {
    name: "咸阳市中心医院迁建",
    region: "咸阳市秦都区",
    scale: "8.5亿",
    stage: "bidding",
    clue: "咸阳市卫健委牵头，已完成可研",
    notes: "1200床位三甲医院，预计下月公示招标信息",
    contributorIdx: 6,
    circleIdx: 0,
  },
  {
    name: "丝路文化博物馆群",
    region: "西安市曲江新区",
    scale: "5亿",
    stage: "prospecting",
    clue: "曲江管委会文旅局在推动",
    notes: "包含3座主题博物馆，方案阶段，关系可以提前介入",
    contributorIdx: 4,
    circleIdx: 2,
  },
  {
    name: "西咸新区科创产业园",
    region: "西咸新区沣东新城",
    scale: "15亿",
    stage: "approved",
    clue: "沣东集团下属平台公司操盘",
    notes: "一期含研发办公+孵化器+人才公寓，EPC模式",
    contributorIdx: 2,
    circleIdx: 1,
  },
  {
    name: "延安革命纪念馆改扩建",
    region: "延安市宝塔区",
    scale: "3.2亿",
    stage: "announced",
    clue: "省文旅厅和延安市政府联合推动",
    notes: "已公示设计招标，截止日期下月15号",
    contributorIdx: 4,
    circleIdx: 2,
  },
  {
    name: "榆林市人民医院新院区",
    region: "榆林市榆阳区",
    scale: "10亿",
    stage: "prospecting",
    clue: "榆林市卫健委有意向，正在做前期论证",
    notes: "规划2000床位，如果能拿到前期策划咨询先入场",
    contributorIdx: 1,
    circleIdx: 0,
  },
  {
    name: "灞桥区全民健身中心",
    region: "西安市灞桥区",
    scale: "1.8亿",
    stage: "bidding",
    clue: "灞桥区住建局主管",
    notes: "含游泳馆、篮球馆、全民健身馆，即将挂网招标",
    contributorIdx: 5,
    circleIdx: 1,
  },
  {
    name: "铜川市中医院整体迁建",
    region: "铜川市新区",
    scale: "6亿",
    stage: "approved",
    clue: "铜川市政府已批复立项",
    notes: "800床位中医院+中医药传承创新基地",
    contributorIdx: 6,
    circleIdx: 0,
  },
];

// ── 关系池 ──
const relationships = [
  {
    alias: "高新区卫健局张局",
    domain: ["医疗卫生", "政府"],
    level: ["局长级"],
    closeness: 4,
    visibility: "circle",
    ownerIdx: 1,
    circleIdx: 0,
    notes: "老同学，可直接约饭",
  },
  {
    alias: "省卫健委规划处李处",
    domain: ["医疗卫生", "政府"],
    level: ["处长级"],
    closeness: 3,
    visibility: "circle",
    ownerIdx: 6,
    circleIdx: 0,
    notes: "通过朋友介绍认识，见过两次面",
  },
  {
    alias: "曲江管委会文旅局王副局",
    domain: ["文化旅游", "政府"],
    level: ["副局长级"],
    closeness: 5,
    visibility: "designated",
    ownerIdx: 4,
    circleIdx: null,
    notes: "发小，核心关系",
  },
  {
    alias: "沣东集团总经理办公室秘书",
    domain: ["地产开发", "国企"],
    level: ["中层管理"],
    closeness: 3,
    visibility: "circle",
    ownerIdx: 2,
    circleIdx: 1,
    notes: "可以递材料，帮约会",
  },
  {
    alias: "省建筑设计院院长",
    domain: ["建筑设计"],
    level: ["院长级"],
    closeness: 2,
    visibility: "fuzzy",
    ownerIdx: 7,
    circleIdx: 2,
    notes: "行业会议上认识，能递话但不熟",
  },
  {
    alias: "某大型施工央企区域副总",
    domain: ["施工总包", "央企"],
    level: ["副总级"],
    closeness: 4,
    visibility: "circle",
    ownerIdx: 5,
    circleIdx: 1,
    notes: "合作多年，可以联合投标",
  },
  {
    alias: "西安交大附属医院基建处主任",
    domain: ["医疗卫生", "高校"],
    level: ["处级"],
    closeness: 4,
    visibility: "circle",
    ownerIdx: 1,
    circleIdx: 0,
    notes: "帮他们做过项目，关系很好",
  },
  {
    alias: "咸阳市规划局总工",
    domain: ["城市规划", "政府"],
    level: ["总工级"],
    closeness: 3,
    visibility: "circle",
    ownerIdx: 0,
    circleIdx: 1,
    notes: "项目评审时认识",
  },
  {
    alias: "延安市文旅局项目科科长",
    domain: ["文化旅游", "政府"],
    level: ["科长级"],
    closeness: 3,
    visibility: "circle",
    ownerIdx: 3,
    circleIdx: 2,
    notes: "之前做过延安的项目认识的",
  },
  {
    alias: "某医疗设备经销商总经理",
    domain: ["医疗器械", "民企"],
    level: ["总经理级"],
    closeness: 4,
    visibility: "fuzzy",
    ownerIdx: 6,
    circleIdx: 0,
    notes: "手上有大量医院甲方资源，可以互换信息",
  },
];

async function seed() {
  console.log("[demo] 开始生成测试数据...\n");

  // 获取管理员 ID（郭高亮）
  const [admin] = await sql`SELECT id FROM users WHERE email = '354610696@qq.com'`;
  if (!admin) {
    console.error("请先运行 seed-admin.ts 创建管理员");
    process.exit(1);
  }
  const adminId = admin.id;

  // ── 1. 创建用户 ──
  console.log("[demo] 创建 8 个测试用户...");
  const passwordHash = await hash("test123456");
  const userIds: string[] = [];

  for (const u of users) {
    const [existing] = await sql`SELECT id FROM users WHERE email = ${u.email}`;
    if (existing) {
      userIds.push(existing.id);
      console.log(`  跳过已存在: ${u.name}`);
      continue;
    }

    const userId = crypto.randomUUID();
    userIds.push(userId);

    await sql`
      INSERT INTO users (id, email, display_name, password_hash, role, invited_by)
      VALUES (${userId}, ${u.email}, ${u.name}, ${passwordHash}, 'member', ${adminId})
    `;

    const session = driver.session();
    try {
      await session.run(
        `MERGE (u:User {id: $id})
         ON CREATE SET u.displayName = $name, u.email = $email, u.domainTags = $tags`,
        { id: userId, name: u.name, email: u.email, tags: u.tags }
      );
    } finally {
      await session.close();
    }
    console.log(`  + ${u.name} (${u.email})`);
  }

  // 管理员也加入 userIds 前面
  const allUserIds = [adminId, ...userIds];

  // ── 2. 创建圈子 ──
  console.log("\n[demo] 创建 4 个圈子...");
  const circleIds: string[] = [];

  for (const c of circles) {
    const circleId = crypto.randomUUID();
    circleIds.push(circleId);

    const session = driver.session();
    try {
      // 创建圈子节点
      await session.run(
        `CREATE (c:Circle {id: $id, name: $name, description: $desc, createdBy: $createdBy, createdAt: datetime()})`,
        { id: circleId, name: c.name, desc: c.desc, createdBy: adminId }
      );

      // 管理员加入所有圈子
      await session.run(
        `MATCH (u:User {id: $userId}), (c:Circle {id: $circleId})
         CREATE (u)-[:MEMBER_OF {role: 'admin', joinedAt: datetime()}]->(c)`,
        { userId: adminId, circleId }
      );

      // 其他成员加入
      for (const memberIdx of c.members) {
        await session.run(
          `MATCH (u:User {id: $userId}), (c:Circle {id: $circleId})
           MERGE (u)-[r:MEMBER_OF]->(c)
           ON CREATE SET r.role = 'member', r.joinedAt = datetime()`,
          { userId: userIds[memberIdx], circleId }
        );
      }

      console.log(`  + ${c.name} (${c.members.length + 1} 人)`);
    } finally {
      await session.close();
    }
  }

  // ── 3. 创建项目 ──
  console.log("\n[demo] 创建 8 个项目...");
  const projectIds: string[] = [];

  for (const p of projects) {
    const projectId = crypto.randomUUID();
    projectIds.push(projectId);
    const contributorId = userIds[p.contributorIdx];

    const session = driver.session();
    try {
      await session.run(
        `CREATE (p:Project {
          id: $id, name: $name, region: $region, scale: $scale,
          stage: $stage, decisionMakerClue: $clue, notes: $notes,
          createdAt: datetime(), updatedAt: datetime()
        })`,
        { id: projectId, name: p.name, region: p.region, scale: p.scale, stage: p.stage, clue: p.clue, notes: p.notes }
      );
      await session.run(
        `MATCH (u:User {id: $userId}), (p:Project {id: $projectId})
         CREATE (u)-[:CONTRIBUTED {at: datetime()}]->(p)`,
        { userId: contributorId, projectId }
      );
      if (p.circleIdx !== null) {
        await session.run(
          `MATCH (c:Circle {id: $circleId}), (p:Project {id: $projectId})
           CREATE (c)-[:CONTAINS]->(p)`,
          { circleId: circleIds[p.circleIdx], projectId }
        );
      }
      console.log(`  + ${p.name} (${p.region}, ${p.scale})`);
    } finally {
      await session.close();
    }
  }

  // ── 4. 创建关系 ──
  console.log("\n[demo] 创建 10 条关系...");

  for (const r of relationships) {
    const relId = crypto.randomUUID();
    const ownerId = userIds[r.ownerIdx];

    const session = driver.session();
    try {
      await session.run(
        `CREATE (rel:Relationship {
          id: $id, alias: $alias, domainTags: $domain, levelTags: $level,
          closeness: $closeness, visibility: $visibility, notes: $notes,
          createdAt: datetime(), updatedAt: datetime()
        })`,
        { id: relId, alias: r.alias, domain: r.domain, level: r.level, closeness: r.closeness, visibility: r.visibility, notes: r.notes }
      );
      await session.run(
        `MATCH (u:User {id: $ownerId}), (rel:Relationship {id: $relId})
         CREATE (u)-[:OWNS_RELATIONSHIP]->(rel)`,
        { ownerId, relId }
      );
      if (r.circleIdx !== null) {
        await session.run(
          `MATCH (c:Circle {id: $circleId}), (rel:Relationship {id: $relId})
           CREATE (c)-[:CONTAINS]->(rel)`,
          { circleId: circleIds[r.circleIdx], relId }
        );
      }
      // 指定可见：让管理员也能看到
      if (r.visibility === "designated") {
        await session.run(
          `MATCH (u:User {id: $viewerId}), (rel:Relationship {id: $relId})
           CREATE (u)-[:CAN_VIEW]->(rel)`,
          { viewerId: adminId, relId }
        );
      }
      console.log(`  + ${r.alias} (${r.domain.join("/")} | ${r.level.join(",")})`);
    } finally {
      await session.close();
    }
  }

  // ── 5. 创建一条对接请求 ──
  console.log("\n[demo] 创建 2 条对接请求...");

  const session = driver.session();
  try {
    // 请求1：管理员发起，经李思远转介到孙晓峰
    const req1Id = crypto.randomUUID();
    await session.run(
      `CREATE (r:Request {id: $id, title: '对接咸阳市卫健委资源', description: '咸阳中心医院迁建项目需要对接卫健委决策层，了解项目进展和招标意向', status: 'relaying', createdAt: datetime(), updatedAt: datetime()})`,
      { id: req1Id }
    );
    await session.run(
      `MATCH (u:User {id: $userId}), (r:Request {id: $reqId}) CREATE (u)-[:INITIATED]->(r)`,
      { userId: adminId, reqId: req1Id }
    );
    await session.run(
      `MATCH (r:Request {id: $reqId}), (p:Project {id: $projectId}) CREATE (r)-[:TARGETS]->(p)`,
      { reqId: req1Id, projectId: projectIds[1] }
    );
    // 步骤：李思远(已同意) → 孙晓峰(待处理)
    await session.run(
      `MATCH (r:Request {id: $reqId}), (u:User {id: $userId})
       CREATE (r)-[:RELAY_STEP {order: 1, status: 'consented', consentedAt: datetime()}]->(u)`,
      { reqId: req1Id, userId: userIds[1] }
    );
    await session.run(
      `MATCH (r:Request {id: $reqId}), (u:User {id: $userId})
       CREATE (r)-[:RELAY_STEP {order: 2, status: 'pending', consentedAt: null}]->(u)`,
      { reqId: req1Id, userId: userIds[6] }
    );
    console.log("  + 对接咸阳市卫健委资源 (传递中: 李思远已同意 → 孙晓峰待处理)");

    // 请求2：张明辉发起，经管理员转介到刘雅琴，已完成
    const req2Id = crypto.randomUUID();
    await session.run(
      `CREATE (r:Request {id: $id, title: '对接曲江文旅局博物馆项目', description: '丝路文化博物馆群项目前期介入，需要了解甲方意图和设计要求', status: 'fulfilled', createdAt: datetime() - duration("P3D"), updatedAt: datetime()})`,
      { id: req2Id }
    );
    await session.run(
      `MATCH (u:User {id: $userId}), (r:Request {id: $reqId}) CREATE (u)-[:INITIATED]->(r)`,
      { userId: userIds[2], reqId: req2Id }
    );
    await session.run(
      `MATCH (r:Request {id: $reqId}), (p:Project {id: $projectId}) CREATE (r)-[:TARGETS]->(p)`,
      { reqId: req2Id, projectId: projectIds[2] }
    );
    await session.run(
      `MATCH (r:Request {id: $reqId}), (u:User {id: $userId})
       CREATE (r)-[:RELAY_STEP {order: 1, status: 'consented', consentedAt: datetime() - duration("P2D")}]->(u)`,
      { reqId: req2Id, userId: adminId }
    );
    await session.run(
      `MATCH (r:Request {id: $reqId}), (u:User {id: $userId})
       CREATE (r)-[:RELAY_STEP {order: 2, status: 'consented', consentedAt: datetime() - duration("P1D")}]->(u)`,
      { reqId: req2Id, userId: userIds[4] }
    );
    console.log("  + 对接曲江文旅局博物馆项目 (已完成)");
  } finally {
    await session.close();
  }

  // ── 6. 创建功劳链事件 ──
  console.log("\n[demo] 创建功劳链事件...");
  {
    const s = driver.session();
    try {
      const projectId = projectIds[2]; // 丝路文化博物馆群
      const events = [
        { role: "info_contributor", action: "contributed_info", userId: userIds[4], desc: "刘雅琴贡献项目信息" },
        { role: "request_initiator", action: "initiated_request", userId: userIds[2], desc: "张明辉发起对接请求" },
        { role: "relay_intermediary", action: "relayed", userId: adminId, desc: "郭高亮协助转介" },
        { role: "resource_provider", action: "provided_resource", userId: userIds[4], desc: "刘雅琴提供关键资源" },
      ];
      let prevHash: string | null = null;
      for (const e of events) {
        const eventId = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const { createHash } = await import("node:crypto");
        const hash: string = createHash("sha256")
          .update(`${prevHash ?? "GENESIS"}:${e.action}:${timestamp}`)
          .digest("hex");

        await s.run(
          `CREATE (m:MeritEvent {id: $id, action: $action, role: $role, timestamp: datetime($ts), hash: $hash, prevHash: $prevHash})`,
          { id: eventId, action: e.action, role: e.role, ts: timestamp, hash, prevHash: prevHash }
        );
        await s.run(
          `MATCH (m:MeritEvent {id: $eventId}), (p:Project {id: $projectId}) CREATE (m)-[:PART_OF_CHAIN]->(p)`,
          { eventId, projectId }
        );
        await s.run(
          `MATCH (u:User {id: $userId}), (m:MeritEvent {id: $eventId}) CREATE (u)-[:PERFORMED {role: $role}]->(m)`,
          { userId: e.userId, eventId, role: e.role }
        );
        prevHash = hash;
        console.log(`  + ${e.desc}`);
      }
    } finally {
      await s.close();
    }
  }

  await driver.close();
  await sql.end();

  console.log("\n[demo] ✅ 测试数据生成完毕！");
  console.log("\n汇总：");
  console.log("  👤 8 个测试用户（密码统一 test123456）");
  console.log("  ⭕ 4 个圈子");
  console.log("  📋 8 个项目");
  console.log("  🤝 10 条关系");
  console.log("  🔗 2 条对接请求");
  console.log("  📊 4 个功劳链事件");
  console.log("\n管理员账号: 354610696@qq.com / admin123456");
  console.log("测试用户密码统一: test123456");
}

seed().catch(console.error);
