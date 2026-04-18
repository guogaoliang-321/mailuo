# 脉络 MERIDIAN

私密圈层资源网络平台 — 邀请制、~50人小圈子资源对接工具。

## 技术栈

- **Monorepo**: pnpm workspace + Turborepo
- **前端**: Next.js 15 + Tailwind CSS 4 + React Query
- **后端**: Hono (Node.js, 端口 4000, 环境变量 API_PORT)
- **数据库**: PostgreSQL（纯 PG，已去掉 Neo4j）
- **ORM**: Drizzle ORM
- **认证**: Session-based (argon2id + crypto.randomUUID)
- **UI 风格**: Apple Glass 深色毛玻璃 + 金色主色调(#D4A853)

## 包结构

```
packages/
  shared/   — 共享类型、Zod 验证、常量
  db/       — PostgreSQL Schema + 查询层（packages/db/src/pg/）
  api/      — Hono API 服务（routes: auth, projects, relationships, circles, requests, merit, admin, recommendations, plaza, my）
  web/      — Next.js 前端
```

## 核心功能模块

| 模块 | 路径 | 功能 |
|------|------|------|
| 首页仪表盘 | `/` | 星链关系图（Canvas 力导向 我→圈子→成员）+ 统计栏 + 快捷操作 + 圈子广场 + 最新项目 + 最新资源 + 关系需求 |
| 个人CRM | `/my` | 我的关系库 + 我的项目库 + 联络时间线 + 提醒 |
| 联系人详情 | `/my/contacts/[id]` | 联系人信息 + 联络记录(6种类型) + 计划跟踪 + 定期提醒 |
| 项目池 | `/projects` | CRUD + 搜索筛选 + 详情页 + 评论 + 推荐匹配 |
| 关系池 | `/relationships` | 登记关系资源 + 三层可见性（指定/圈内/模糊）+ 评论 |
| 对接追踪 | `/requests` | 链路可视化卡片 + 展开详情时间线 + 多人响应(我有线索/帮忙转介) |
| 对接详情 | `/requests/[id]` | 响应列表 + 发起人采纳 + 标记完成 → 功劳链 |
| 圈子 | `/circles` | 创建/加入圈子(邀请码) + 成员管理 + 圈内讨论(聊天) |
| 功劳链 | `/projects/[id]/merit` | SHA-256 哈希链 + SVG 环形图 + 利益分配 |
| 管理后台 | `/admin` | 邀请码 + 用户管理 + 审计日志 |

## 对接流逻辑

```
发起需求(待响应) → 圈内可见 → 多人可响应(我有线索/帮忙转介)
  → 发起人看到响应列表 → 采纳有用的 → 标记完成 → 记入功劳链
已完成的需求：仅发起人和响应者可见
未完成的需求：圈内所有人可见
```

## 个人CRM

```
联系人管理：姓名/单位/职务/电话/标签/亲疏度
联络记录(6种)：备注/见面/电话/微信/饭局/计划
计划跟踪：设置下一步行动 + 截止日期 → 到期提醒
定期提醒：每N天提醒联络 → 首页显示提醒卡片
项目管理：7阶段(前期意向→已完成) + 甲方/预算/区域
```

## 数据库表（共 20 张）

核心：users, sessions, invite_codes, circles, circle_members, circle_invite_codes
业务：projects, relationships, requests, request_responses, relay_steps, merit_events
个人CRM：my_projects, my_contacts, contact_logs
社交：comments, circle_messages, plaza_messages
系统：audit_logs, encryption_keys, benefit_agreements

**Schema**: `packages/db/src/pg/schema.ts`
**查询层**: `packages/db/src/pg/queries.ts`

## 常用 Skills

根据项目的 Monorepo + Full Stack 特点，推荐以下 skills：

| Skill | 命令 | 适用场景 |
|-------|------|---------|
| **自动执行** | `/autopilot "task"` | 单一清晰的功能（UI 组件、单个路由、简单业务逻辑） |
| **多代理并行** | `/team 2:executor "task"` | 跨包开发（同时修改 packages/api 和 packages/web） |
| **代码审查** | `/code-review` | 任何代码修改完成后立即使用 |
| **测试驱动开发** | `/tdd-guide` | API 端点、业务逻辑、复杂查询开发 |
| **数据库优化** | `/database-reviewer` | PostgreSQL 查询优化、schema 设计、Drizzle ORM 调整 |

**快速开始示例**：
- 简单 UI 修改：`/autopilot "add login button to navbar"`
- API + UI 同时开发：`/team 2:executor "implement project detail page with API"`
- 业务逻辑：`/tdd-guide` 或 `/database-reviewer`（数据库相关）

完整 skills 列表参见：
- `~/.claude/rules/skills/ecc-skills.md` — ECC 代理和命令
- `~/.claude/rules/skills/omc-skills.md` — OMC 编排命令
- `~/.claude/rules/skills/mcp-servers.md` — MCP 服务（GitHub、PostgreSQL）

## 部署架构（Zeabur）

**线上地址**: https://mailuo.zeabur.app

**架构**: 单 Docker 容器双进程
- Next.js standalone（主进程，端口 8080，对外）
- Hono API（后台进程，端口 4000，内部）
- Next.js route handler 代理 `/api/*` → localhost:4000

**Zeabur 服务**: postgresql + mailuo
**GitHub**: `guogaoliang-321/mailuo`
**Dockerfile**: 根目录，start.sh 启动双进程

**环境变量（mailuo）**:
- `DATABASE_URL` = `${POSTGRES_URI}`
- `API_URL` = `http://localhost:4000`
- `SESSION_SECRET`, `ENCRYPTION_MASTER_KEY`

**建表**: 新增表需在 Zeabur 命令终端手动执行 CREATE TABLE SQL

## 本地开发

```bash
pnpm install
# 终端1: DOTENV_CONFIG_PATH=.env npx tsx packages/api/src/index.ts
# 终端2: cd packages/web && PORT=3100 npx next dev --port 3100 --turbopack
```

## GitHub 推送

```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_guogaoliang321 -o IdentitiesOnly=yes" git push origin main
```

## 管理员

- 邮箱: `354610696@qq.com` / 密码: `admin123456`
- 邀请码: `MERIDIAN2026`（50次，1年有效）

## 已知问题与修复记录

- Neo4j → PostgreSQL 迁移（服务器仅1GB内存）
- nanoid → crypto.randomUUID（PG UUID 类型兼容）
- API 用 API_PORT 避免与 Next.js PORT 冲突
- 可见性查询：同圈成员即使未绑定 circle_id 也能互看
- 对接流：relayPath 改为可选，支持先发需求后响应
- 注册页/管理页/设置页/图谱页统一深色主题
- recommendations 参数顺序修复
