import postgres from "postgres";
import neo4j from "neo4j-driver";

const sql = postgres(process.env.DATABASE_URL ?? "postgresql://meridian:meridian_dev_password@localhost:5432/meridian");
const driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "meridian_dev_password"));

async function seed() {
  console.log("[demands] 生成关系需求数据...\n");

  // Get users
  const users = await sql`SELECT id, display_name FROM users ORDER BY created_at`;
  const userMap = new Map(users.map(u => [u.display_name, u.id]));
  const adminId = userMap.get("郭高亮")!;

  // Get projects
  const s = driver.session();
  const pr = await s.run("MATCH (p:Project) RETURN p.id AS id, p.name AS name LIMIT 8");
  const projects = pr.records.map(r => ({ id: r.get("id") as string, name: r.get("name") as string }));

  const demands = [
    {
      title: "急需：西安卫健系统决策层关系",
      description: "项目已进入招标准备阶段，需要卫健委层面的推进力量",
      urgent: true,
      initiator: "郭高亮",
      projectName: "西安国际医学中心二期",
      timeAgo: "2小时前",
    },
    {
      title: "寻：成都高新区管委会对接人",
      description: "项目已立项，需了解管委会对设计方的倾向",
      urgent: false,
      initiator: "李思远",
      projectName: "西咸新区科创产业园",
      timeAgo: "1天前",
    },
    {
      title: "急需：延安市文旅系统内部人脉",
      description: "革命纪念馆改扩建项目招标在即，需要提前了解评标专家名单和甲方偏好",
      urgent: true,
      initiator: "刘雅琴",
      projectName: "延安革命纪念馆改扩建",
      timeAgo: "3小时前",
    },
    {
      title: "寻：三甲医院基建处主管资源",
      description: "榆林新院区项目前期论证中，需要有医院基建经验的内部人牵线",
      urgent: false,
      initiator: "孙晓峰",
      projectName: "榆林市人民医院新院区",
      timeAgo: "2天前",
    },
    {
      title: "急需：灞桥区住建局关键人物",
      description: "全民健身中心即将挂网招标，急需了解招标条件和评分细则",
      urgent: true,
      initiator: "赵鹏飞",
      projectName: "灞桥区全民健身中心",
      timeAgo: "5小时前",
    },
    {
      title: "寻：铜川市政府项目审批通道",
      description: "中医院迁建已获批复，需要加速规划许可和环评流程",
      urgent: false,
      initiator: "孙晓峰",
      projectName: "铜川市中医院整体迁建",
      timeAgo: "3天前",
    },
    {
      title: "寻：省建筑设计院合作机会",
      description: "博物馆群项目可能需要联合体投标，寻找省院内部有意向的合作方",
      urgent: false,
      initiator: "刘雅琴",
      projectName: "丝路文化博物馆群",
      timeAgo: "4天前",
    },
    {
      title: "急需：咸阳卫健委招标内部信息",
      description: "中心医院迁建下月公示，需要提前掌握招标范围和资质要求",
      urgent: true,
      initiator: "郭高亮",
      projectName: "咸阳市中心医院迁建",
      timeAgo: "1小时前",
    },
  ];

  for (const d of demands) {
    const initiatorId = userMap.get(d.initiator);
    if (!initiatorId) { console.log(`  跳过: 找不到用户 ${d.initiator}`); continue; }

    const project = projects.find(p => p.name === d.projectName);
    const reqId = crypto.randomUUID();

    await s.run(
      `CREATE (r:Request {
        id: $id, title: $title, description: $description,
        urgent: $urgent, timeAgo: $timeAgo,
        status: 'pending', createdAt: datetime(), updatedAt: datetime()
      })`,
      { id: reqId, title: d.title, description: d.description, urgent: d.urgent, timeAgo: d.timeAgo }
    );
    await s.run(
      `MATCH (u:User {id: $userId}), (r:Request {id: $reqId})
       CREATE (u)-[:INITIATED]->(r)`,
      { userId: initiatorId, reqId }
    );
    if (project) {
      await s.run(
        `MATCH (r:Request {id: $reqId}), (p:Project {id: $projectId})
         CREATE (r)-[:TARGETS]->(p)`,
        { reqId, projectId: project.id }
      );
    }
    console.log(`  + ${d.urgent ? "🔴" : "🟠"} ${d.title}`);
  }

  await s.close();
  await driver.close();
  await sql.end();
  console.log(`\n[demands] 完成！共 ${demands.length} 条关系需求`);
}

seed().catch(console.error);
