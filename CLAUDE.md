# 脉络 MERIDIAN

私密圈层资源网络平台 — 邀请制、~50人小圈子资源对接工具。

## 技术栈

- **Monorepo**: pnpm workspace + Turborepo
- **前端**: Next.js 15 + Tailwind CSS 4 + React Query
- **后端**: Hono (Node.js, 端口 4000)
- **数据库**: PostgreSQL（纯 PG，已去掉 Neo4j）
- **ORM**: Drizzle ORM
- **认证**: Session-based (argon2id + crypto.randomUUID)
- **UI 风格**: Apple Glass 深色毛玻璃 + 金色主色调

## 包结构

```
packages/
  shared/   — 共享类型、Zod 验证、常量
  db/       — PostgreSQL 客户端、Schema、查询（packages/db/src/pg/）
  api/      — Hono API 服务（端口 4000，环境变量 API_PORT）
  web/      — Next.js 前端
```

## 核心功能模块

| 模块 | 路径 | 功能 |
|------|------|------|
| 首页仪表盘 | `/` | 星链关系图（Canvas 力导向）+ 统计栏 + 最新项目 + 关系需求 |
| 项目池 | `/projects` | CRUD + 搜索筛选 + 详情页 + 推荐匹配 |
| 关系池 | `/relationships` | 登记关系资源 + 三层可见性（指定/圈内/模糊） |
| 圈子 | `/circles` | 创建圈子 + 成员管理 + 圈内资源浏览 |
| 对接请求 | `/requests` | 发起请求 + 关联项目 + 传递链 + 同意/拒绝 |
| 功劳链 | `/projects/[id]/merit` | SHA-256 哈希链 + SVG 环形图 + 利益分配 |
| 管理后台 | `/admin` | 邀请码 + 用户管理 + 审计日志 |

## 部署架构（Zeabur）

**线上地址**: https://mailuo.zeabur.app

**架构**: 单个 Docker 容器，内含两个进程：
- Next.js standalone（主进程，端口 8080，对外）
- Hono API（后台进程，端口 4000，内部）
- Next.js route handler (`/app/api/[...path]/route.ts`) 代理 `/api/*` 到 Hono

**Zeabur 服务**:
- `postgresql` — 数据库
- `mailuo` — 应用（GitHub 仓库 `guogaoliang-321/mailuo`）

**环境变量**（mailuo 服务）:
- `DATABASE_URL` — `${POSTGRES_URI}`（引用 PG 服务）
- `API_URL` — `http://localhost:4000`（Next.js 代理目标）
- `SESSION_SECRET` — 会话密钥
- `ENCRYPTION_MASTER_KEY` — 字段加密密钥

**Dockerfile**: 根目录 `Dockerfile`，start.sh 启动两个进程

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动数据库（需要本地 PostgreSQL）
# brew services start postgresql@14

# 开发模式（API 端口 4000，Web 端口 3100）
# 终端1: DOTENV_CONFIG_PATH=.env npx tsx packages/api/src/index.ts
# 终端2: cd packages/web && PORT=3100 npx next dev --port 3100 --turbopack

# 构建
pnpm build

# 单独构建
pnpm --filter @meridian/api build
```

## 数据库

**Schema 定义**: `packages/db/src/pg/schema.ts`
**查询层**: `packages/db/src/pg/queries.ts`（替代了原 Neo4j 查询）

表：users, sessions, invite_codes, circles, circle_members, projects, relationships, requests, relay_steps, merit_events, audit_logs, encryption_keys, benefit_agreements

**迁移**: `pnpm --filter @meridian/db generate && pnpm --filter @meridian/db migrate`

## GitHub

- **仓库**: `guogaoliang-321/mailuo`
- **SSH Key**: `~/.ssh/id_ed25519_guogaoliang321`
- **推送命令**: `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_guogaoliang321 -o IdentitiesOnly=yes" git push origin main`

## 管理员账号

- 邮箱: `354610696@qq.com`
- 密码: `admin123456`
- 邀请码: `MERIDIAN2026`（50次，1年有效）

## 已知问题与修复记录

- **Neo4j → PostgreSQL 迁移**: 服务器内存不足（1GB），去掉 Neo4j，全部用 PG 的 JOIN/CTE 实现图查询
- **nanoid → crypto.randomUUID**: PG 表用 UUID 类型，nanoid 生成的 ID 格式不兼容
- **API 端口冲突**: API 改用 `API_PORT` 环境变量（默认 4000），避免与 Next.js 的 `PORT` 冲突
- **Next.js standalone 路径**: Dockerfile 中 standalone 输出拷贝到 `/app/`，server.js 在 `/app/packages/web/server.js`
- **Tailwind v4 @apply**: `@layer components` 中不能用 `@apply` 引用同层类，改为内联 CSS
