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
import { plazaRoutes } from "./routes/plaza.js";
import { myRoutes } from "./routes/my.js";
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
app.route("/api/v1/plaza", plazaRoutes);
app.route("/api/v1/my", myRoutes);

const port = Number(process.env.API_PORT ?? 4000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`[meridian] API server running on http://localhost:${port}`);
});
