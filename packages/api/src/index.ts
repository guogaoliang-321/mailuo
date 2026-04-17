import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";
import { relationshipRoutes } from "./routes/relationships.js";
import { circleRoutes } from "./routes/circles.js";
import { requestRoutes } from "./routes/requests.js";
import { meritRoutes } from "./routes/merit.js";
import { adminRoutes } from "./routes/admin.js";
import { recommendationRoutes } from "./routes/recommendations.js";
import { auditMiddleware } from "./middleware/audit.js";
import type { AppEnv } from "./types.js";

const app = new Hono<AppEnv>();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
  })
);

app.get("/api/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/*", auditMiddleware);

app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/projects", projectRoutes);
app.route("/api/v1/relationships", relationshipRoutes);
app.route("/api/v1/circles", circleRoutes);
app.route("/api/v1/requests", requestRoutes);
app.route("/api/v1/merit", meritRoutes);
app.route("/api/v1/admin", adminRoutes);
app.route("/api/v1/recommendations", recommendationRoutes);

// Proxy non-API requests to Next.js standalone server
app.all("*", async (c) => {
  const nextPort = 3000;
  const url = new URL(c.req.url);
  const target = `http://127.0.0.1:${nextPort}${url.pathname}${url.search}`;
  try {
    const headers = new Headers();
    const cookie = c.req.header("cookie");
    if (cookie) headers.set("cookie", cookie);
    headers.set("host", url.host);
    const body = c.req.method !== "GET" && c.req.method !== "HEAD" ? await c.req.text() : undefined;
    const resp = await fetch(target, { method: c.req.method, headers, body });
    const respHeaders = new Headers();
    resp.headers.forEach((v, k) => respHeaders.set(k, v));
    return new Response(resp.body, { status: resp.status, headers: respHeaders });
  } catch {
    return c.text("Frontend loading...", 502);
  }
});

const port = Number(process.env.PORT ?? 8080);

// Start Next.js standalone server in background
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const nextServerPath = "/app/web-standalone/packages/web/server.js";
if (existsSync(nextServerPath)) {
  const next = spawn("node", [nextServerPath], {
    env: { ...process.env, PORT: "3000", HOSTNAME: "0.0.0.0" },
    stdio: "inherit",
  });
  next.on("error", (e) => console.error("[next] failed to start:", e));
  console.log("[meridian] Next.js standalone server starting on port 3000");
}

serve({ fetch: app.fetch, port }, () => {
  console.log(`[meridian] API server running on http://localhost:${port}`);
});
