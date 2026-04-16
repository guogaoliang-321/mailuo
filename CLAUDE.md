# 脉络 MERIDIAN

私密圈层资源网络平台 — 邀请制、~50人小圈子资源对接工具。

## 技术栈

- **Monorepo**: pnpm workspace + Turborepo
- **前端**: Next.js 15 + Tailwind CSS 4 + React Query
- **后端**: Hono (Node.js, 端口 4000)
- **图数据库**: Neo4j 5 Community (关系网络、路径查询)
- **关系型数据库**: PostgreSQL 16 (用户认证、审计日志)
- **ORM**: Drizzle ORM (PostgreSQL)
- **认证**: Session-based (argon2id + nanoid)

## 包结构

```
packages/
  shared/   — 共享类型、Zod 验证、常量
  db/       — Neo4j + PostgreSQL 客户端和查询
  api/      — Hono API 服务
  web/      — Next.js 前端
```

## 开发命令

```bash
# 安装依赖
pnpm install

# 启动数据库（需要 Docker）
docker compose up -d

# 开发模式
pnpm dev

# 构建
pnpm build

# 单独构建某个包
pnpm --filter @meridian/api build
```

## 环境变量

复制 `.env.example` 为 `.env`，关键变量：
- `DATABASE_URL` — PostgreSQL 连接串
- `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD` — Neo4j 连接
- `SESSION_SECRET` — 会话加密密钥
- `ENCRYPTION_MASTER_KEY` — 字段加密主密钥

## 部署策略

本地 Mac 开发测试 → 云服务器正式部署（Docker Compose）
