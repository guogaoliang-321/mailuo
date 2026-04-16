import { Hono } from "hono";
import { neo4jQueries, getDb, pgSchema } from "@meridian/db";
import { proposeBenefitSchema } from "@meridian/shared";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

export const meritRoutes = new Hono<AppEnv>();

meritRoutes.use("*", requireAuth);

meritRoutes.get("/project/:id", async (c) => {
  const projectId = c.req.param("id");
  const chain = await neo4jQueries.getMeritChain(projectId);
  const verified = await neo4jQueries.verifyMeritChain(projectId);
  return c.json({ success: true, data: { chain, verified } });
});

meritRoutes.post("/project/:id/propose", async (c) => {
  const body = await c.req.json();
  const parsed = proposeBenefitSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0].message }, 400);
  }

  const db = getDb();
  const [agreement] = await db
    .insert(pgSchema.benefitAgreements)
    .values({
      projectId: c.req.param("id"),
      proposedBy: c.get("userId"),
      status: "proposed",
      distribution: parsed.data.distribution.map((d) => ({
        ...d,
        confirmed: d.userId === c.get("userId"),
      })),
    })
    .returning();

  return c.json({ success: true, data: agreement }, 201);
});

meritRoutes.post("/project/:id/confirm", async (c) => {
  const db = getDb();
  const projectId = c.req.param("id");
  const userId = c.get("userId");

  const [agreement] = await db
    .select()
    .from(pgSchema.benefitAgreements)
    .where(
      and(
        eq(pgSchema.benefitAgreements.projectId, projectId),
        eq(pgSchema.benefitAgreements.status, "proposed")
      )
    )
    .limit(1);

  if (!agreement) {
    return c.json({ success: false, error: "没有待确认的分配方案" }, 404);
  }

  const distribution = agreement.distribution as Array<{
    userId: string;
    role: string;
    percentage: number;
    confirmed: boolean;
  }>;

  const updated = distribution.map((d) =>
    d.userId === userId ? { ...d, confirmed: true } : d
  );

  const allConfirmed = updated.every((d) => d.confirmed);

  await db
    .update(pgSchema.benefitAgreements)
    .set({
      distribution: updated,
      status: allConfirmed ? "confirmed" : "proposed",
      updatedAt: new Date(),
    })
    .where(eq(pgSchema.benefitAgreements.id, agreement.id));

  return c.json({ success: true, data: { allConfirmed } });
});

meritRoutes.post("/project/:id/lock", async (c) => {
  const db = getDb();
  const projectId = c.req.param("id");

  const [agreement] = await db
    .select()
    .from(pgSchema.benefitAgreements)
    .where(
      and(
        eq(pgSchema.benefitAgreements.projectId, projectId),
        eq(pgSchema.benefitAgreements.status, "confirmed")
      )
    )
    .limit(1);

  if (!agreement) {
    return c.json({ success: false, error: "分配方案尚未全部确认" }, 400);
  }

  await db
    .update(pgSchema.benefitAgreements)
    .set({ status: "locked", lockedAt: new Date(), updatedAt: new Date() })
    .where(eq(pgSchema.benefitAgreements.id, agreement.id));

  return c.json({ success: true });
});
